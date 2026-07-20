// ── Push notification helpers (FCM) ─────────────────────────────
const admin = require('./admin');

// Send a push notification to all of a user's registered FCM tokens.
// Falls back to the driver doc's single token. Prunes stale tokens.
async function sendPushNotification(userId, notification) {
    try {
        const userDoc = await admin.firestore().doc(`users/${userId}`).get();
        if (!userDoc.exists) return;

        const userData = userDoc.data();
        const tokens = [...(userData.fcmTokens || [])];
        if (tokens.length === 0) {
            // Also check driver document
            const driverDoc = await admin.firestore().doc(`drivers/${userId}`).get();
            if (driverDoc.exists) {
                const driverToken = driverDoc.data().fcmToken;
                if (driverToken) tokens.push(driverToken);
            }
        }

        if (tokens.length === 0) return;

        const messages = tokens.map(token => ({
            notification: {
                title: notification.title,
                body: notification.body,
            },
            data: { ...notification.data },
            token,
        }));

        const response = await admin.messaging().sendEach(messages);

        // Prune stale tokens (unregistered/invalid) so they stop failing
        const staleTokens = [];
        response.responses.forEach((res, idx) => {
            if (!res.success) {
                const code = res.error?.code || '';
                if (code.includes('registration-token-not-registered') || code.includes('invalid-registration-token')) {
                    staleTokens.push(tokens[idx]);
                }
            }
        });
        if (staleTokens.length > 0) {
            await admin.firestore().doc(`users/${userId}`).update({
                fcmTokens: admin.firestore.FieldValue.arrayRemove(...staleTokens),
            }).catch(() => { /* best-effort cleanup */ });
        }
    } catch (error) {
        console.error('Push notification error:', error);
    }
}

function getNotificationTitle(status) {
    const titles = {
        'arriving_pickup': 'Driver on the way!',
        'in_transit': 'Package picked up!',
        'delivered': 'Delivery complete!',
        'cancelled': 'Order cancelled',
        'driver_assigned': 'Driver found!',
    };
    return titles[status] || 'Order update';
}

function getNotificationBody(status, orderData) {
    const bodies = {
        'arriving_pickup': `Your driver ${orderData.driver?.name || ''} is heading to pickup.`,
        'in_transit': 'Your package is now in transit. Track it live!',
        'delivered': 'Your package has been delivered. Please rate your experience.',
        'cancelled': `Order #${(orderData.id || '').substring(0, 8)} has been cancelled.`,
        'driver_assigned': `Driver ${orderData.driver?.name || ''} has been assigned to your order.`,
    };
    return bodies[status] || 'Your order status has been updated.';
}

module.exports = { sendPushNotification, getNotificationTitle, getNotificationBody };
