// ── Double-blind reviews with driver rating aggregation ─────────
const functions = require('firebase-functions/v1');
const admin = require('./admin');

// ── SUBMIT REVIEW (double-blind) ────────────────────────────────
// Each party reviews the other; both reviews land on the order doc.
// When the second review arrives the order transitions to 'reviewed'.
const submitReviewHandler = async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'You must be signed in.');
    }

    const { orderId, rating, comment, tags, reviewedRole } = data;
    if (!orderId || rating === undefined || rating === null || !reviewedRole) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required fields.');
    }

    // Validate rating: 1–5
    const numericRating = Number(rating);
    if (!Number.isFinite(numericRating) || numericRating < 1 || numericRating > 5) {
        throw new functions.https.HttpsError('invalid-argument', 'Rating must be between 1 and 5.');
    }

    const orderRef = admin.firestore().doc(`orders/${orderId}`);
    let willHaveBoth = false;

    await admin.firestore().runTransaction(async (transaction) => {
        const orderDoc = await transaction.get(orderRef);
        if (!orderDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Order not found.');
        }

        const orderData = orderDoc.data();

        // Can only review delivered orders
        if (!['delivered', 'reviewed'].includes(orderData.status)) {
            throw new functions.https.HttpsError('failed-precondition', 'Can only review after delivery.');
        }

        const isCustomer = orderData.userId === context.auth.uid;
        const isDriver = orderData.driver && orderData.driver.id === context.auth.uid;

        if (!isCustomer && !isDriver) {
            throw new functions.https.HttpsError('permission-denied', 'Not authorized.');
        }

        const review = {
            rating: numericRating,
            comment: comment || '',
            tags: Array.isArray(tags) ? tags : [],
            date: new Date().toISOString(),
            submittedBy: isCustomer ? 'customer' : 'driver',
        };

        const updates = { updatedAt: new Date().toISOString() };

        if (isCustomer) {
            // Customer reviews the driver
            if (orderData.reviewForDriver) {
                throw new functions.https.HttpsError('failed-precondition', 'You have already reviewed this order.');
            }
            updates.reviewForDriver = review;
        } else {
            // Driver reviews the customer
            if (orderData.reviewForCustomer) {
                throw new functions.https.HttpsError('failed-precondition', 'You have already reviewed this order.');
            }
            updates.reviewForCustomer = review;
        }

        // If both reviews are now submitted, transition to 'reviewed'
        willHaveBoth = (isCustomer && !!orderData.reviewForCustomer) || (isDriver && !!orderData.reviewForDriver);
        if (willHaveBoth) {
            updates.status = 'reviewed';
        }

        // ALL READS MUST COME BEFORE ANY WRITES in Firestore transactions.
        // Pre-fetch driver doc (if we'll need it) before the order write below.
        let driverRef = null;
        let driverData = null;
        if (isCustomer && orderData.driver && orderData.driver.id) {
            driverRef = admin.firestore().doc(`drivers/${orderData.driver.id}`);
            const driverDoc = await transaction.get(driverRef);
            driverData = driverDoc.exists ? driverDoc.data() : null;
        }

        // Now perform all writes.
        transaction.update(orderRef, updates);

        // Update driver's average rating atomically (same transaction)
        if (driverRef && driverData) {
            const currentRating = driverData.rating || 0;
            const currentTrips = driverData.totalTrips || 0;
            const newTrips = currentTrips + 1;
            const newRating = ((currentRating * currentTrips) + numericRating) / newTrips;
            transaction.update(driverRef, { rating: Math.round(newRating * 10) / 10, totalTrips: newTrips });
        }
    });

    return { success: true, bothSubmitted: willHaveBoth };
};

module.exports = { submitReviewHandler };
