// ── Account deletion cascade (GDPR / Kenya DPA compliance) ──────
// Deletes the user's personal data across all collections + Storage.
// Orders are anonymized (PII stripped) rather than deleted to preserve
// the audit trail required for disputes, reviews, and financial records.
const functions = require('firebase-functions/v1');
const admin = require('./admin');

const deleteAccountHandler = async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'You must be signed in.');
    }

    const uid = context.auth.uid;
    const db = admin.firestore();
    const bucket = admin.storage().bucket();

    try {
        // 1. Fetch user doc to determine role
        const userDoc = await db.doc(`users/${uid}`).get();
        const role = userDoc.exists ? userDoc.data().role : null;

        // 2. Delete role-specific docs
        const roleDocDeletes = [];
        if (role === 'driver') {
            roleDocDeletes.push(db.doc(`drivers/${uid}`).delete());
        } else if (role === 'business') {
            roleDocDeletes.push(db.doc(`businesses/${uid}`).delete());
            // Delete business API keys
            const keysSnap = await db.collection('api_keys').where('businessId', '==', uid).get();
            keysSnap.forEach(doc => roleDocDeletes.push(doc.ref.delete()));
            // Delete address book
            const addrSnap = await db.collection(`businesses/${uid}/addressBook`).get();
            addrSnap.forEach(doc => roleDocDeletes.push(doc.ref.delete()));
        }
        await Promise.all(roleDocDeletes);

        // 3. Anonymize user's orders (strip PII, keep for audit)
        const ordersSnap = await db.collection('orders').where('userId', '==', uid).get();
        const orderUpdates = [];
        const privateDeletes = [];
        ordersSnap.forEach(doc => {
            // Anonymize sender/recipient PII but keep the order for audit
            orderUpdates.push(doc.ref.update({
                sender: { name: '[Deleted User]', phone: '' },
                recipient: { name: '[Deleted User]', phone: '', id: '' },
                recipientPiiDeleted: true,
                updatedAt: new Date().toISOString()
            }));
            // Delete verification codes (security-sensitive)
            privateDeletes.push(doc.ref.collection('private').doc('codes').delete());
            privateDeletes.push(doc.ref.collection('private').doc('attempts').delete());
        });
        await Promise.all([...orderUpdates, ...privateDeletes]);

        // 4. Delete disputes created by the user
        const disputesSnap = await db.collection('disputes').where('userId', '==', uid).get();
        const disputeDeletes = disputesSnap.docs.map(doc => doc.ref.delete());
        await Promise.all(disputeDeletes);

        // 5. Delete FCM tokens registered by the user
        const tokensSnap = await db.collection('fcm_tokens').where('userId', '==', uid).get();
        const tokenDeletes = tokensSnap.docs.map(doc => doc.ref.delete());
        await Promise.all(tokenDeletes);

        // 6. Delete user's Storage files (profile photos, documents, delivery photos)
        try {
            const [userFiles] = await bucket.getFiles({ prefix: `users/${uid}/` });
            const fileDeletes = userFiles.map(file => file.delete());
            await Promise.all(fileDeletes);
        } catch (storageErr) {
            console.warn('Storage cleanup failed (non-fatal):', storageErr);
        }

        // 7. Delete the user document itself
        await db.doc(`users/${uid}`).delete();

        // 8. Delete the Firebase Auth account
        try {
            await admin.auth().deleteUser(uid);
        } catch (authErr) {
            // Auth account may already be deleted if the client called user.delete() first
            console.warn('Auth deletion skipped (may already be deleted):', authErr.message);
        }

        return { success: true };
    } catch (error) {
        console.error('Account deletion cascade failed:', error);
        throw new functions.https.HttpsError('internal', 'Account deletion failed. Please contact support.');
    }
};

module.exports = { deleteAccountHandler };
