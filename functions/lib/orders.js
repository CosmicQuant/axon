// ── Order lifecycle: verification, status machine, cancellation ──
const functions = require('firebase-functions/v1');
const admin = require('./admin');
const { sendPushNotification, getNotificationTitle, getNotificationBody } = require('./notifications');

// ── SERVER-SIDE DELIVERY VERIFICATION ───────────────────────────
// Verifies the 4-digit passcode server-side so the driver never has
// access to the code in the order document.
const verifyDeliveryCodeHandler = async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to verify a delivery.');
    }

    const { orderId, code, stopId } = data;
    if (!orderId || !code) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing orderId or code.');
    }

    const orderRef = admin.firestore().doc(`orders/${orderId}`);
    const orderDoc = await orderRef.get();
    if (!orderDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Order not found.');
    }

    const orderData = orderDoc.data();

    // Ensure the caller is the assigned driver
    if (!orderData.driver || orderData.driver.id !== context.auth.uid) {
        throw new functions.https.HttpsError('permission-denied', 'You are not assigned to this order.');
    }

    // Codes live in the private subcollection (orders/{id}/private/codes) so the
    // driver can never read them from the order doc. Fall back to legacy fields
    // on the order doc for orders created before the subcollection existed.
    let targetCode;
    const codesDoc = await orderRef.collection('private').doc('codes').get();
    if (codesDoc.exists) {
        const codes = codesDoc.data();
        targetCode = stopId ? (codes.stopCodes || {})[stopId] : undefined;
        if (!targetCode) targetCode = codes.orderCode;
    }
    if (!targetCode) {
        targetCode = orderData.verificationCode;
        if (stopId && Array.isArray(orderData.stops)) {
            const stop = orderData.stops.find(s => s.id === stopId);
            if (stop) {
                targetCode = stop.verificationCode || orderData.verificationCode;
            }
        }
    }

    if (!targetCode) {
        throw new functions.https.HttpsError('internal', 'No verification code found for this order.');
    }

    const isValid = String(code) === String(targetCode);

    return { valid: isValid };
};

// ── SERVER-SIDE ORDER STATUS TRANSITION ─────────────────────────
// Forward-only driver transitions. Cancel goes through cancelOrder,
// disputes through raiseDispute, reviews through submitReview, expiry
// through the scheduled expirePendingOrders job.
const updateOrderStatusHandler = async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'You must be signed in.');
    }

    const { orderId, newStatus, extraData } = data;
    if (!orderId || !newStatus) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing orderId or newStatus.');
    }

    const allowedTransitions = {
        'driver_assigned':  ['arriving_pickup', 'in_transit'],
        'arriving_pickup':  ['in_transit'],
        'in_transit':       ['delivered'],
    };

    const orderRef = admin.firestore().doc(`orders/${orderId}`);

    try {
        await admin.firestore().runTransaction(async (transaction) => {
            const orderDoc = await transaction.get(orderRef);
            if (!orderDoc.exists) {
                throw new functions.https.HttpsError('not-found', 'Order not found.');
            }

            const orderData = orderDoc.data();
            const currentStatus = orderData.status;

            const isDriver = orderData.driver && orderData.driver.id === context.auth.uid;
            if (!isDriver) {
                throw new functions.https.HttpsError('permission-denied', 'Only the assigned driver can update this order.');
            }

            const allowed = allowedTransitions[currentStatus] || [];
            if (!allowed.includes(newStatus)) {
                throw new functions.https.HttpsError('failed-precondition',
                    `Cannot transition from ${currentStatus} to ${newStatus}.`);
            }

            const updates = {
                status: newStatus,
                updatedAt: new Date().toISOString(),
            };

            if (newStatus === 'arriving_pickup') {
                updates.headingToPickupAt = updates.updatedAt;
            } else if (newStatus === 'in_transit') {
                updates.startedAt = new Date().toISOString();
                updates.startTime = updates.startedAt;
            } else if (newStatus === 'delivered') {
                updates.deliveredAt = new Date().toISOString();
                updates.endTime = updates.deliveredAt;
                if (extraData?.deliveryConfirmationImage) {
                    updates.deliveryConfirmationImage = extraData.deliveryConfirmationImage;
                }
            }

            transaction.update(orderRef, updates);
        });

        // Send push notification for status changes
        const orderDoc = await orderRef.get();
        const orderData = orderDoc.data();
        if (orderData.userId) {
            await sendPushNotification(orderData.userId, {
                title: getNotificationTitle(newStatus),
                body: getNotificationBody(newStatus, orderData),
            });
        }

        return { success: true };
    } catch (error) {
        console.error('updateOrderStatus error:', error);
        throw error;
    }
};

// ── CANCEL ORDER (single cancel authority) ──────────────────────
// Only the customer or the assigned driver can cancel, and only before
// in_transit. In-transit issues must go through raiseDispute.
const cancelOrderHandler = async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'You must be signed in.');
    }

    const { orderId, reason } = data;
    if (!orderId) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing orderId.');
    }

    const orderRef = admin.firestore().doc(`orders/${orderId}`);
    let orderData;
    let isCustomer;
    let isDriver;

    await admin.firestore().runTransaction(async (transaction) => {
        const orderDoc = await transaction.get(orderRef);
        if (!orderDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Order not found.');
        }

        orderData = orderDoc.data();

        // Either the customer or the assigned driver can cancel
        isCustomer = orderData.userId === context.auth.uid;
        isDriver = orderData.driver && orderData.driver.id === context.auth.uid;

        if (!isCustomer && !isDriver) {
            throw new functions.https.HttpsError('permission-denied', 'You are not authorized to cancel this order.');
        }

        // Can only cancel before in_transit
        if (!['pending', 'driver_assigned', 'arriving_pickup'].includes(orderData.status)) {
            throw new functions.https.HttpsError('failed-precondition', 'Cannot cancel at this stage. Please raise a dispute instead.');
        }

        const updates = {
            status: 'cancelled',
            cancellationReason: reason || (isDriver ? 'Driver cancelled' : 'Customer cancelled'),
            cancelledBy: isDriver ? 'driver' : 'customer',
            updatedAt: new Date().toISOString(),
        };

        // Cancel penalty: if customer cancels after driver assigned, driver gets 100 KES
        if (isCustomer && ['driver_assigned', 'arriving_pickup'].includes(orderData.status)) {
            if (orderData.paymentMethod === 'M-Pesa') {
                updates.refundAmount = Math.max(0, (orderData.price || 0) - 100);
                updates.cancelPenaltyPaid = true;
            }
        }

        transaction.update(orderRef, updates);
    });

    // Notify the other party
    const penaltyApplied = isCustomer && ['driver_assigned', 'arriving_pickup'].includes(orderData.status) && orderData.paymentMethod === 'M-Pesa';
    if (isCustomer && orderData.driver && orderData.driver.id) {
        await sendPushNotification(orderData.driver.id, {
            title: 'Order Cancelled',
            body: `The customer cancelled order #${orderId.substring(0, 8)}. ${penaltyApplied ? 'You will receive KES 100 compensation.' : ''}`,
        });
    } else if (isDriver && orderData.userId) {
        await sendPushNotification(orderData.userId, {
            title: 'Order Cancelled',
            body: `Your driver cancelled order #${orderId.substring(0, 8)}. We're finding you a new driver.`,
        });
    }

    return { success: true };
};

// ── ATTACH DELIVERY PHOTO ───────────────────────────────────────
// Called after delivery completes to attach the proof photo URL.
// The delivery itself is never blocked on the photo upload.
const attachDeliveryPhotoHandler = async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'You must be signed in.');
    }

    const { orderId, imageUrl } = data;
    if (!orderId || !imageUrl) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing orderId or imageUrl.');
    }

    const orderRef = admin.firestore().doc(`orders/${orderId}`);
    const orderDoc = await orderRef.get();
    if (!orderDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Order not found.');
    }

    const orderData = orderDoc.data();

    // Only the assigned driver can attach the photo
    if (!orderData.driver || orderData.driver.id !== context.auth.uid) {
        throw new functions.https.HttpsError('permission-denied', 'You are not assigned to this order.');
    }

    // Only after delivery (photo attaches post-completion by design)
    if (!['delivered', 'reviewed'].includes(orderData.status)) {
        throw new functions.https.HttpsError('failed-precondition', 'Can only attach a photo after delivery.');
    }

    await orderRef.update({
        deliveryConfirmationImage: imageUrl,
        updatedAt: new Date().toISOString(),
    });

    return { success: true };
};

module.exports = { verifyDeliveryCodeHandler, updateOrderStatusHandler, cancelOrderHandler, attachDeliveryPhotoHandler };
