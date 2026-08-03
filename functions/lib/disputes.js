// ── Disputes (lightweight, WhatsApp-supported resolution) ───────
// Raise: customer/driver flags an in_transit/delivered order; status flips
// to 'disputed' and the pre-dispute status is stashed on `dispute.previousStatus`.
// Resolve: the party who raised it withdraws the dispute; status is restored
// from `dispute.previousStatus` (fallback: deliveredAt ? 'delivered' : 'in_transit').
// Both handlers use the shared v1 callable runtime; their invoker IAM must
// remain public ('allUsers') so browsers can complete the CORS preflight — the
// SDK supplies per-call auth via the Firebase ID token, not the invoker role.
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
        // Remember the status before the dispute so resolveDispute can restore it.
        previousStatus: orderData.status,
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

// ── RESOLVE / CANCEL DISPUTE ────────────────────────────────────
// Lets the party who raised a dispute withdraw it and resume tracking.
// Restores the order to its pre-dispute status (or infers it for
// legacy disputes that were raised before previousStatus was stored).
const resolveDisputeHandler = async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'You must be signed in.');
    }

    const { orderId } = data;
    if (!orderId) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing orderId.');
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
    if (orderData.status !== 'disputed') {
        throw new functions.https.HttpsError('failed-precondition', 'This order is not disputed.');
    }

    // Restore the previous status. Prefer the stored value; infer for legacy
    // disputes: delivered orders stay 'delivered', otherwise resume as
    // 'in_transit' (the only other state that allows disputes).
    let restoreStatus = orderData.dispute?.previousStatus;
    if (!['in_transit', 'delivered'].includes(restoreStatus)) {
        restoreStatus = orderData.deliveredAt ? 'delivered' : 'in_transit';
    }

    await orderRef.update({
        status: restoreStatus,
        'dispute.status': 'cancelled',
        'dispute.resolvedAt': new Date().toISOString(),
        'dispute.resolution': 'Withdrawn by requesting party',
        updatedAt: new Date().toISOString(),
    });

    return { success: true, status: restoreStatus };
};

module.exports = { raiseDisputeHandler, resolveDisputeHandler };
