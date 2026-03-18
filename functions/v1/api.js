const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
// admin.initializeApp(); // Already initialized in index.js usually, but for safe decoupling:
if (!admin.apps.length) {
    admin.initializeApp();
}

const cors = require("cors")({ origin: true });
const express = require("express");

// Initialize Express App
const app = express();
app.use(cors);
app.use(express.json());

// --- 1. MIDDLEWARE: AUTHENTICATION ---
// Validates the Bearer Token (sk_live_... or sk_test_...)
const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            error: {
                code: 'authentication_error',
                message: 'Missing or invalid Authorization header. Expected "Bearer sk_..."'
            }
        });
    }

    const token = authHeader.split('Bearer ')[1];

    try {
        // Look up the key in the 'api_keys' collection
        const snapshot = await admin.firestore().collection('api_keys')
            .where('key', '==', token)
            .where('active', '==', true)
            .limit(1)
            .get();

        if (snapshot.empty) {
            // MOCK FALLBACK FOR DEMO if DB is empty (Remove in Prod)
            if (token.startsWith('sk_live_DEMO') || token.startsWith('sk_test_DEMO')) {
                req.business = { id: 'mock_biz_123', mode: token.includes('live') ? 'LIVE' : 'TEST', name: 'Demo Corp' };
                return next();
            }
            throw new Error('Invalid Key');
        }

        const keyDoc = snapshot.docs[0].data();

        // Fetch full business details if needed, or just attach key info
        req.business = {
            id: keyDoc.businessId,
            mode: keyDoc.mode
        };

        next();
    } catch (error) {
        return res.status(401).json({
            error: {
                code: 'authentication_error',
                message: 'Invalid API Key provided.'
            }
        });
    }
};

// --- 2. ENDPOINT: CREATE ORDER ---
app.post('/orders', authenticate, async (req, res) => {
    try {
        // Direct mapping to Firestore Schema
        const {
            pickup,
            dropoff,
            vehicle, // Matches VehicleType
            serviceType, // Matches ServiceType
            items, // Matches OrderItem { description, weightKg, fragile, ... }
            recipient, // Matches ContactInfo { name, phone, idNumber }
            stops, // Matches RouteStop[]
            pickupTime, // ISO String or 'ASAP'
            scheduled // Boolean
        } = req.body;

        // Basic Validation
        if (!pickup || !dropoff || !recipient?.phone || !vehicle || !serviceType || !items?.description) {
            return res.status(400).json({
                error: {
                    code: 'validation_error',
                    message: 'Missing required fields: pickup, dropoff, recipient.phone, vehicle, serviceType, items.description'
                }
            });
        }

        // Construct Order Object - 1:1 with Firestore Schema
        const orderData = {
            userId: req.business.id,
            status: 'pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            pickup,
            dropoff,
            stops: (stops || []).map((s, index) => ({
                id: `stop_${Date.now()}_${index}`, // Generate ID
                address: s.address,
                type: s.type || 'pickup', // pickup/dropoff/stop
                status: 'pending', // Default status
                contact: {
                    name: s.name || '',
                    phone: s.phone || ''
                },
                instructions: s.notes || ''
                // lat/lng would typically be geocoded here or provided
            })),
            // Items Object (Primary)
            items: {
                description: items.description, // Guaranteed by validation
                weightKg: items?.weightKg || 1,
                fragile: !!items?.fragile,
                value: items?.value || 0,
                handlingNotes: items?.handlingNotes || ''
            },
            // Legacy fallbacks for older dashboards
            itemDescription: items?.description || 'Standard Package',

            recipient: {
                name: recipient.name || 'Valued Customer',
                phone: recipient.phone,
                idNumber: recipient.idNumber || ''
            },
            vehicle: vehicle || 'Boda Boda',
            serviceType: serviceType || 'Standard (Same Day)',

            // Scheduling
            pickupTime: pickupTime || 'ASAP',
            scheduled: !!scheduled,

            // Metadata
            isApiOrder: true,
            environment: req.business.mode,
            paymentMethod: 'CORPORATE_BILLING',
            price: 250 // Pricing would be calculated via calculatePrice logic normally
        };

        // Save to Firestore 'orders'
        const docRef = await admin.firestore().collection('orders').add(orderData);

        return res.status(201).json({
            id: docRef.id,
            object: 'order',
            status: 'pending',
            created: Date.now(),
            tracking_url: `https://axon.co.ke/track/${docRef.id}`,
            environment: req.business.mode
        });

    } catch (error) {
        console.error("API Error:", error);
        return res.status(500).json({
            error: {
                code: 'api_error',
                message: 'Internal server error while processing request.'
            }
        });
    }
});

// --- 3. ENDPOINT: GET QUOTE ---
app.post('/quotes', authenticate, async (req, res) => {
    // Simplified logic for brevity - would normally call map service
    const { pickup, dropoff, vehicle, serviceType } = req.body;

    if (!pickup || !dropoff || !vehicle || !serviceType) {
        return res.status(400).json({
            error: {
                code: 'validation_error',
                message: 'Missing required fields: pickup, dropoff, vehicle, serviceType'
            }
        });
    }

    // Simulate calculation
    const estimatedPrice = 250;
    const estimatedTime = "45 mins";

    return res.status(200).json({
        object: 'quote',
        amount: estimatedPrice,
        currency: 'KES',
        estimated_delivery_time: estimatedTime,
        vehicle: vehicle,
        serviceType: serviceType,
        expires_at: new Date(Date.now() + 5 * 60000).toISOString() // 5 mins
    });
});

// --- 4. ENDPOINT: GET ORDER STATUS ---
app.get('/orders/:id', authenticate, async (req, res) => {
    try {
        const doc = await admin.firestore().collection('orders').doc(req.params.id).get();
        if (!doc.exists) {
            return res.status(404).json({
                error: {
                    code: 'resource_missing',
                    message: `Order ${req.params.id} not found.`
                }
            });
        }

        const data = doc.data();
        // Security check: Ensure order belongs to this business
        if (data.userId !== req.business.id) {
            return res.status(403).json({
                error: {
                    code: 'permission_denied',
                    message: 'You do not have permission to access this resource.'
                }
            });
        }

        return res.status(200).json({
            id: doc.id,
            object: 'order',
            status: data.status,
            driver: data.driver || null,
            tracking_url: `https://axon.co.ke/track/${doc.id}`
        });

    } catch (error) {
        return res.status(500).json({ error: { code: 'server_error' } });
    }
});

// --- 5. ENDPOINT: CANCEL ORDER ---
app.post('/orders/:id/cancel', authenticate, async (req, res) => {
    try {
        const orderRef = admin.firestore().collection('orders').doc(req.params.id);
        const doc = await orderRef.get();

        if (!doc.exists) {
            return res.status(404).json({ error: { code: 'resource_missing', message: 'Order not found' } });
        }

        const data = doc.data();
        if (data.userId !== req.business.id) {
            return res.status(403).json({ error: { code: 'permission_denied' } });
        }

        // Only allow cancellation of pending orders
        if (['picked_up', 'in_transit', 'delivered'].includes(data.status)) {
            return res.status(400).json({
                error: {
                    code: 'action_forbidden',
                    message: 'Cannot cancel an order that is already in progress.'
                }
            });
        }

        await orderRef.update({
            status: 'cancelled',
            cancelledAt: new Date().toISOString(),
            cancelledBy: 'api_request'
        });

        return res.status(200).json({
            id: doc.id,
            object: 'order',
            status: 'cancelled',
            cancelled: true
        });

    } catch (error) {
        return res.status(500).json({ error: { code: 'server_error' } });
    }
});

// --- 6. ENDPOINT: UPDATE ORDER (PATCH) ---
app.patch('/orders/:id', authenticate, async (req, res) => {
    try {
        const orderRef = admin.firestore().collection('orders').doc(req.params.id);
        const doc = await orderRef.get();

        if (!doc.exists) {
            return res.status(404).json({ error: { code: 'resource_missing', message: 'Order not found' } });
        }

        const data = doc.data();
        if (data.userId !== req.business.id) {
            return res.status(403).json({ error: { code: 'permission_denied' } });
        }

        // Accept payload matching Firestore Schema
        const { pickup, dropoff, recipient, stops, items, vehicle, serviceType, pickupTime } = req.body;
        const updates = {};
        const status = data.status;

        // --- GUARD RAILS ---

        // 1. Pickup Modification Guard
        if (pickup) {
            if (['driver_assigned', 'arrived_pickup', 'in_transit', 'arrived_dropoff', 'delivered', 'cancelled'].includes(status)) {
                return res.status(400).json({ error: { code: 'modification_forbidden', message: 'Cannot change Pickup after driver assignment.' } });
            }
            updates.pickup = pickup;
        }

        // 2. Schedule/Vehicle Modification Guard
        if (pickupTime || vehicle || serviceType) {
            if (['driver_assigned', 'arrived_pickup', 'in_transit', 'arrived_dropoff', 'delivered', 'cancelled'].includes(status)) {
                return res.status(400).json({ error: { code: 'modification_forbidden', message: 'Cannot change vehicle or schedule after driver assignment.' } });
            }
            if (pickupTime) updates.pickupTime = pickupTime;
            if (vehicle) updates.vehicle = vehicle;
            if (serviceType) updates.serviceType = serviceType;
        }

        // 3. Dropoff/Stops/Items Modification Guard
        if (dropoff || stops || items) {
            if (['delivered', 'cancelled'].includes(status)) {
                return res.status(400).json({ error: { code: 'modification_forbidden', message: 'Cannot modify completed/cancelled order.' } });
            }

            if (dropoff) updates.dropoff = dropoff;
            if (stops) updates.stops = stops;

            // Merge Items Object
            if (items) {
                updates.items = { ...data.items, ...items };
                // Sync legacy field if description changes
                if (items.description) updates.itemDescription = items.description;
            }

            // Trigger Price Recalculation (Simulation)
            updates.price = Math.round(data.price * 1.15);
            updates.priceUpdated = true;
        }

        // 4. Recipient Modification Guard
        if (recipient) {
            if (['delivered', 'cancelled'].includes(status)) {
                return res.status(400).json({ error: { code: 'modification_forbidden', message: 'Cannot modify recipient on completed order.' } });
            }
            updates.recipient = { ...data.recipient, ...recipient };
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: { code: 'no_changes', message: 'No valid fields provided.' } });
        }

        // Apply Updates
        updates.updatedAt = new Date().toISOString();
        await orderRef.update(updates);

        return res.status(200).json({
            id: doc.id,
            object: 'order',
            status: status,
            updated: true,
            changes: Object.keys(updates),
            new_price: updates.price || data.price
        });

    } catch (error) {
        console.error("Patch Error:", error);
        return res.status(500).json({ error: { code: 'server_error' } });
    }
});

// Export the Express App as a single Cloud Function
module.exports = app;