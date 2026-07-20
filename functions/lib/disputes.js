// ── Disputes (lightweight, WhatsApp-supported resolution) ───────
const functions = require('firebase-functions/v1');
const admin = require('./admin');

// ── RAISE DISPUTE ───────────────────────────────────────────────
const raiseDisputeHandler = async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'You must be signed in.');
    }

    const { orderId, reason, description } = data;
    if (!orderId || !reason) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing orderId or reason.');
    }

    const orderRef = admin.firestore().doc(`orders/${orderId}`);
    const orderDoc = await orderRef.get();
    if (!orderDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Order not found.');
    }

    const orderData = orderDoc.data();

    const isCustomer = orderData.userId === context.auth.uid;
    const isDriver = orderData.driver && orderData.driver.id === context.auth.uid;

    if (!isCustomer && !isDriver) {
        throw new functions.https.HttpsError('permission-denied', 'Not authorized.');
    }

    // Can only dispute delivered or in_transit orders
    if (!['in_transit', 'delivered'].includes(orderData.status)) {
        throw new functions.https.HttpsError('failed-precondition', 'Can only dispute active or delivered orders.');
    }

    const dispute = {
        raisedBy: isCustomer ? 'customer' : 'driver',
        reason,
        description: description || '',
        status: 'open',
        createdAt: new Date().toISOString(),
    };

    // Save dispute to a separate collection for admin review.
    // userId/driverId fields match the Firestore rules so both parties can read it.
    await admin.firestore().collection('disputes').add({
        orderId,
        userId: orderData.userId || null,
        driverId: orderData.driver?.id || null,
        orderData: {
            pickup: orderData.pickup,
            dropoff: orderData.dropoff,
            price: orderData.price,
            customerName: orderData.sender?.name,
            driverName: orderData.driver?.name,
        },
        ...dispute,
    });

    await orderRef.update({
        status: 'disputed',
        dispute,
        updatedAt: new Date().toISOString(),
    });

    return { success: true };
};

module.exports = { raiseDisputeHandler };
