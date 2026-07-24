// ── Scheduled jobs ──────────────────────────────────────────────
const admin = require('./admin');
const { sendPushNotification } = require('./notifications');

// ── EXPIRE PENDING ORDERS (scheduled cron) ──────────────────────
// Runs every minute; flips pending orders past their expiresAt to 'expired'
// and notifies the customer. Paginated to handle large backlogs.
//
// IMPORTANT: `expiresAt` is stored as an ISO STRING (not a Firestore Timestamp)
// by the booking wizard. Comparing a Timestamp against a string with `<` returns
// no results (Firestore requires matching types). So we use ISO strings here.
// We also backfill/migrate any value that was stored as a Timestamp.
const expirePendingOrdersHandler = async (event) => {
    const nowMs = Date.now();
    let totalExpired = 0;

    // Two-phase approach for resilience:
    // 1. Try the indexed query (status == 'pending' AND expiresAt < now). This
    //    requires the composite index (status, expiresAt). Fast for large collections.
    // 2. If the index is unavailable (FAILED_PRECONDITION), fall back to querying
    //    all pending orders (uses the single-field status index) and filter
    //    expiresAt in memory. Slower but always works.
    const fetchExpired = async () => {
        try {
            return await admin.firestore()
                .collection('orders')
                .where('status', '==', 'pending')
                .where('expiresAt', '<', new Date().toISOString())
                .limit(400)
                .get();
        } catch (err) {
            if (err?.code === 9 && /index/i.test(err.message || '')) {
                // Index building — fall back to in-memory filter
                console.warn('expirePendingOrders: index unavailable, using fallback scan');
                const snap = await admin.firestore()
                    .collection('orders')
                    .where('status', '==', 'pending')
                    .limit(400)
                    .get();
                // Filter in memory: expiresAt can be ISO string OR Firestore Timestamp
                const filtered = snap.docs.filter(d => {
                    const exp = d.data().expiresAt;
                    if (!exp) return false;
                    const expMs = typeof exp.toMillis === 'function'
                        ? exp.toMillis()
                        : new Date(exp).getTime();
                    return expMs < nowMs;
                });
                return { empty: filtered.length === 0, docs: filtered, size: filtered.length };
            }
            throw err;
        }
    };

    // Paginate: process up to 400 per batch, loop until no more expired orders
    while (true) {
        const snapshot = await fetchExpired();
        if (!snapshot.docs || snapshot.docs.length === 0) break;

        const batch = admin.firestore().batch();
        const expiredUserIds = [];

        snapshot.forEach(doc => {
            const data = doc.data();
            // Defensive: normalize expiresAt to an ISO string if it was somehow
            // stored as a Firestore Timestamp on legacy orders (helps future
            // queries that compare against ISO strings).
            const exp = data.expiresAt;
            if (exp && typeof exp.toISOString === 'function') {
                // It's a Firestore Timestamp Ã¢ convert & persist the migration
                batch.update(doc.ref, {
                    status: 'expired',
                    expiresAt: exp.toDate().toISOString(),
                    updatedAt: nowIso,
                });
            } else {
                batch.update(doc.ref, {
                    status: 'expired',
                    updatedAt: nowIso,
                });
            }
            if (data.userId) expiredUserIds.push(data.userId);
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
