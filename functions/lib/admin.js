// Shared Firebase Admin instance — initialized once, used by all modules.
const admin = require('firebase-admin');

admin.initializeApp();

module.exports = admin;
