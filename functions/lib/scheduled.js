// ── Scheduled jobs ──────────────────────────────────────────────
const admin = require('./admin');
const { sendPushNotification } = require('./notifications');

// ── EXPIRE PENDING ORDERS (scheduled cron) ──────────────────────
// Runs every minute; flips pending orders past their expiresAt to 'expired'
// and notifies the customer. Paginated to handle large backlogs.
const expirePendingOrdersHandler = async (event) => {
    const now = admin.firestore.Timestamp.now();
    let totalExpired = 0;

    // Paginate: process up to 400 per batch, loop until no more expired orders
    while (true) {
        const snapshot = await admin.firestore()
            .collection('orders')
            .where('status', '==', 'pending')
            .where('expiresAt', '<', now)
            .limit(400)
            .get();

        if (snapshot.empty) break;

        const batch = admin.firestore().batch();
        const expiredUserIds = [];

        snapshot.forEach(doc => {
            batch.update(doc.ref, {
                status: 'expired',
                updatedAt: new Date().toISOString(),
            });
            const userId = doc.data().userId;
            if (userId) expiredUserIds.push(userId);
        });

        await batch.commit();
        totalExpired += snapshot.size;

        // Notify affected customers (best-effort, outside the batch)
        await Promise.all(expiredUserIds.map(userId =>
            sendPushNotification(userId, {
                title: 'No driver found',
                body: 'We couldn\'t find a driver in time and your order expired. You can place a new order anytime.',
            })
        ));
    }

    console.log(`Expired ${totalExpired} pending orders.`);
    return null;
};

module.exports = { expirePendingOrdersHandler };
