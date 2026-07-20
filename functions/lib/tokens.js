// ── FCM token registration ──────────────────────────────────────
const functions = require('firebase-functions/v1');
const admin = require('./admin');

const registerFcmTokenHandler = async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'You must be signed in.');
    }

    const { token, platform } = data;
    if (!token) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing FCM token.');
    }

    // Store the token on the user's document
    const userRef = admin.firestore().doc(`users/${context.auth.uid}`);
    await userRef.set({
        fcmTokens: admin.firestore.FieldValue.arrayUnion(token),
        fcmPlatform: platform || 'web',
        updatedAt: new Date().toISOString(),
    }, { merge: true });

    // Also store on driver document if they're a driver
    const driverRef = admin.firestore().doc(`drivers/${context.auth.uid}`);
    const driverDoc = await driverRef.get();
    if (driverDoc.exists) {
        await driverRef.set({
            fcmToken: token,
            fcmPlatform: platform || 'web',
            updatedAt: new Date().toISOString(),
        }, { merge: true });
    }

    return { success: true };
};

module.exports = { registerFcmTokenHandler };
