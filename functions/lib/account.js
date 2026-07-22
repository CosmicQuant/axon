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
    //    A user can appear as the customer (userId) OR as the driver (driver.id).
    //    Both must be anonymized to comply with GDPR / Kenya DPA.
    const ordersAsCustomerSnap = await db.collection('orders').where('userId', '==', uid).get();
    const ordersAsDriverSnap = await db.collection('orders').where('driver.id', '==', uid).get();

    // Merge both result sets (dedup by doc ref)
    const orderDocsMap = new Map();
    ordersAsCustomerSnap.forEach(doc => orderDocsMap.set(doc.ref.path, doc));
    ordersAsDriverSnap.forEach(doc => orderDocsMap.set(doc.ref.path, doc));

    const orderUpdates = [];
    const privateDeletes = [];
    const deliveryPhotoPaths = [];
    for (const doc of orderDocsMap.values()) {
        const data = doc.data();
        const isDriver = data.driver && data.driver.id === uid;
        if (isDriver) {
            // Anonymize driver PII on the order
            orderUpdates.push(doc.ref.update({
                driver: { id: uid, name: '[Deleted Driver]', phone: '', plate: '' },
                driverPiiDeleted: true,
                updatedAt: new Date().toISOString()
            }));
        } else {
            // Anonymize customer/sender/recipient PII
            orderUpdates.push(doc.ref.update({
                sender: { name: '[Deleted User]', phone: '' },
                recipient: { name: '[Deleted User]', phone: '', id: '' },
                recipientPiiDeleted: true,
                updatedAt: new Date().toISOString()
            }));
        }
        // Delete verification codes (security-sensitive)
        privateDeletes.push(doc.ref.collection('private').doc('codes').delete());
        privateDeletes.push(doc.ref.collection('private').doc('attempts').delete());
        // Collect delivery proof photo paths for Storage cleanup
        if (data.deliveryConfirmationImage) {
            try {
                const url = new URL(data.deliveryConfirmationImage);
                const pathMatch = url.pathname.match(/\/o\/(.+)$/);
                if (pathMatch) deliveryPhotoPaths.push(decodeURIComponent(pathMatch[1]));
            } catch { /* not a URL, skip */ }
        }
    }
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
            const [deliveryFiles] = await bucket.getFiles({ prefix: `deliveries/` });
            // Filter delivery files to those belonging to this user's orders
            const userDeliveryFiles = deliveryFiles.filter(file => {
                const name = file.name;
                return deliveryPhotoPaths.some(p => p === name) ||
                    name.includes(`_${uid}_`);
            });
            const allFiles = [...userFiles, ...userDeliveryFiles];
            const fileDeletes = allFiles.map(file => file.delete());
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
