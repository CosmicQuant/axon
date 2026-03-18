const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");

admin.initializeApp();

const cors = require("cors")({ origin: true });

// In a real app, these constants would be shared or defined here
const VEHICLE_RATES = {
    'Boda Boda': 50,
    'Tuk-Tuk': 100,
    'Pickup Truck': 500,
    'Cargo Van': 800,
    '3T Lorry': 1500
};


// --- API & WEBHOOKS MODULE ---

// Import the v1 API Express App
const apiV1 = require('./v1/api');
// Expose it as a Cloud Function
exports.v1 = functions.https.onRequest(apiV1);

/**
 * Validates API Key and returns associated Business ID
 * @param {string} apiKey - 'sk_live_...' or 'sk_test_...'
 */
async function validateApiKey(apiKey) {
    if (!apiKey) throw new Error('No API key provided');

    // In production, this would query the 'api_keys' collection
    // const snapshot = await admin.firestore().collection('api_keys').where('key', '==', apiKey).get();
    // if (snapshot.empty) throw new Error('Invalid API Key');
    // return snapshot.docs[0].data();

    return {
        businessId: 'mock_business_id',
        mode: apiKey.startsWith('sk_live_') ? 'LIVE' : 'TEST'
    };
}

/**
 * Dispatches Webhook Events to subscribed endpoints
 * This should run onBackground (async) to avoiding blocking response
 */
exports.dispatchWebhook = functions.firestore
    .document('orders/{orderId}')
    .onUpdate(async (change, context) => {
        const newData = change.after.data();
        const oldData = change.before.data();
        const orderId = context.params.orderId;

        // Determine Event Type based on Status Transitions
        let eventType = null;

        // 1. Order Lifecycle
        // if (!oldData && newData) eventType = 'order.created'; // Handled by onCreate trigger usually
        if (newData.status === 'cancelled' && oldData.status !== 'cancelled') eventType = 'order.cancelled';

        // 2. Fulfillment Lifecycle
        // Pending -> Driver Assigned
        if (newData.status === 'driver_assigned' && oldData.status === 'pending') eventType = 'fulfillment.allocated';

        // Driver Assigned -> Driver Switch (Reallocation)
        if (newData.status === 'driver_assigned' && oldData.status === 'driver_assigned' && newData.driverId !== oldData.driverId) eventType = 'fulfillment.reallocated';

        // Arrived at Pickup
        if (newData.status === 'arrived_pickup' && oldData.status !== 'arrived_pickup') eventType = 'fulfillment.arrived_pickup';

        // Picked Up (In Transit)
        if (newData.status === 'in_transit' && oldData.status !== 'in_transit') eventType = 'fulfillment.picked_up';

        // Arrived at Dropoff
        if (newData.status === 'arrived_dropoff' && oldData.status !== 'arrived_dropoff') eventType = 'fulfillment.arrived_dropoff';

        // 2b. Granular Stop Events (Waypoints)
        const newStops = newData.stops || [];
        const oldStops = oldData.stops || [];

        // Check for specific stop arrivals
        newStops.forEach((stop, index) => {
            const oldStop = oldStops[index];
            if (!oldStop) return;

            if (stop.status === 'arrived' && oldStop.status !== 'arrived') {
                eventType = 'fulfillment.arrived_stop';
                // Attach specific stop context to be used in payload construction below
                context.stopEvent = {
                    index: index,
                    details: stop
                };
            }
            if (stop.status === 'completed' && oldStop.status !== 'completed') {
                eventType = 'fulfillment.completed_stop';
                context.stopEvent = {
                    index: index,
                    details: stop
                };
            }
        });

        // Completed
        if (newData.status === 'delivered' && oldData.status !== 'delivered') eventType = 'fulfillment.completed';

        // Failed Attempt
        if (newData.status === 'delivery_failed' && oldData.status !== 'delivery_failed') eventType = 'fulfillment.failed';

        // Order Modified (Price/Route Change)
        if (newData.updatedAt !== oldData.updatedAt && (newData.price !== oldData.price || JSON.stringify(newData.stops) !== JSON.stringify(oldData.stops))) {
            eventType = 'order.updated';
            // We can attach a reason to the metadata in the actual payload construction if needed
        }

        // 3. Financials
        // Check specifically for Payment changes
        if (newData.paymentStatus === 'PAID' && oldData.paymentStatus !== 'PAID') {
            eventType = 'payment.succeeded';
        }
        if (newData.paymentStatus === 'FAILED' && oldData.paymentStatus !== 'FAILED') {
            eventType = 'payment.failed';
        }

        if (!eventType) return null;

        // Fetch Business Webhook Config
        const businessId = newData.userId;
        const businessDoc = await admin.firestore().collection('businesses').doc(businessId).get();
        const webhookConfig = businessDoc.data().webhookConfig; // { url: '...', events: ['order.completed'] }

        if (!webhookConfig || !webhookConfig.url) return null;
        if (!webhookConfig.events.includes(eventType)) return null;

        // Payload Construction
        let payloadData = {
            object: {
                id: orderId,
                status: newData.status,
                amount: newData.price, // maintain backward compatibility
                price: newData.price,
                currency: 'KES',
                metadata: newData.metadata || {}
            }
        };

        // Enrich Payload for Stop Events
        if (context.stopEvent) {
            payloadData.stop_index = context.stopEvent.index;
            payloadData.stop_details = {
                address: context.stopEvent.details.address,
                type: context.stopEvent.details.type,
                name: context.stopEvent.details.contact?.name || '',
                phone: context.stopEvent.details.contact?.phone || ''
            };
        }

        // Always include driver info if assigned
        if (newData.driverId) {
            // In a real app, you might fetch the driver profile here if not fully present on the order
            payloadData.driver = {
                id: newData.driverId,
                name: newData.driverName || 'Axon Driver',
                phone: newData.driverPhone || '',
                plate: newData.vehiclePlate || ''
            };
        }

        const payload = {
            id: `evt_${Date.now()}`,
            object: 'event',
            type: eventType,
            created: Date.now(),
            data: payloadData
        };

        // Dispatch (with retry logic in real world)
        try {
            // await axios.post(webhookConfig.url, payload);
            console.log(`Webhook ${eventType} sent to ${webhookConfig.url}`);
        } catch (error) {
            console.error(`Webhook Delivery Failed: ${error.message}`);
        }
    });

exports.calculateOrderPrice = functions.https.onRequest((req, res) => {
    cors(req, res, () => {
        if (req.method !== 'POST') {
            return res.status(405).send('Method Not Allowed');
        }

        const { vehicleType, recommendedVehicle, estimatedBasePrice, isFragile } = req.body;

        try {
            let finalPrice = 0;

            // If we have an AI estimate, use it as the base and adjust for the selected vehicle
            if (estimatedBasePrice && recommendedVehicle) {
                const baseRate = VEHICLE_RATES[recommendedVehicle] || 50;
                const selectedRate = VEHICLE_RATES[vehicleType] || 50;

                const ratio = selectedRate / baseRate;
                finalPrice = Math.round(estimatedBasePrice * ratio);
            } else {
                // Fallback calculation
                const rate = VEHICLE_RATES[vehicleType] || 50;
                finalPrice = rate * 5; // Base distance multiplier (simplified)
            }

            // Add Fragile handling fee
            if (isFragile) {
                finalPrice += 100;
            }

            // Add Service Fee
            finalPrice += 50;

            res.status(200).json({
                price: finalPrice,
                breakdown: {
                    base: finalPrice - (isFragile ? 150 : 50),
                    fragileFee: isFragile ? 100 : 0,
                    serviceFee: 50
                }
            });
        } catch (error) {
            console.error("Pricing error", error);
            res.status(500).send("Internal Server Error");
        }
    });
});

exports.initiateMpesaPayment = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

        const { phoneNumber, amount, orderId } = req.body;
        console.log(`Initiating M-Pesa push for ${phoneNumber}, KES ${amount}, Order ${orderId}`);

        try {
            // 1. Get Access Token (Mocking the fetch to Safaricom Daraja API)
            // In a real app, you would fetch: https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials

            // 2. Perform STK Push
            // Real endpoint: https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest

            // For now, we simulate the success response from Safaricom
            const checkoutRequestId = `ws_CO_${Date.now()}`;

            res.status(200).json({
                success: true,
                checkoutRequestId: checkoutRequestId,
                message: "Success. Request accepted for processing. Please check your phone for the PIN prompt."
            });
        } catch (error) {
            console.error("M-PESA Error:", error);
            res.status(500).json({ success: false, message: "Internal Server Error during payment initiation" });
        }
    });
});

exports.queryPaymentStatus = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

        const { checkoutRequestId } = req.body;

        try {
            // Mocking the query to Safaricom API
            // After 5 seconds, let's say it's completed
            const status = Math.random() > 0.3 ? 'COMPLETED' : 'PENDING';

            res.status(200).json({
                status: status,
                receiptNumber: status === 'COMPLETED' ? `R${Math.random().toString(36).substring(7).toUpperCase()}` : null,
                message: status === 'COMPLETED' ? "Payment received successfully" : "Waiting for customer to enter PIN"
            });
        } catch (error) {
            console.error("M-PESA Status Error:", error);
            res.status(500).json({ status: 'FAILED', message: "Internal Error checking status" });
        }
    });
});
