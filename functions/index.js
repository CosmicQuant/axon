// ── Axon Cloud Functions — entry point ──────────────────────────
// Modular layout: handlers live in ./lib/*, this file only wires them
// to exported endpoints. Export names are the deployed function names —
// do not rename without coordinating a client release.
const functions = require('firebase-functions/v1');

const { calculateQuoteHandler } = require('./lib/quotes');
const { verifyDeliveryCodeHandler, updateOrderStatusHandler, cancelOrderHandler } = require('./lib/orders');
const { submitReviewHandler } = require('./lib/reviews');
const { raiseDisputeHandler } = require('./lib/disputes');
const { registerFcmTokenHandler } = require('./lib/tokens');
const { expirePendingOrdersHandler } = require('./lib/scheduled');

// ── Pricing ─────────────────────────────────────────────────────
exports.calculateQuote = functions.https.onCall(calculateQuoteHandler);

// ── Business API (Express, API-key authenticated) ───────────────
const apiV1 = require('./v1/api');
exports.v1 = functions.https.onRequest(apiV1);

// ── Order lifecycle ─────────────────────────────────────────────
exports.verifyDeliveryCode = functions.https.onCall(verifyDeliveryCodeHandler);
exports.updateOrderStatus = functions.https.onCall(updateOrderStatusHandler);
exports.cancelOrder = functions.https.onCall(cancelOrderHandler);

// ── Reviews & disputes ──────────────────────────────────────────
exports.submitReview = functions.https.onCall(submitReviewHandler);
exports.raiseDispute = functions.https.onCall(raiseDisputeHandler);

// ── Push notifications ──────────────────────────────────────────
exports.registerFcmToken = functions.https.onCall(registerFcmTokenHandler);

// ── Scheduled jobs ──────────────────────────────────────────────
exports.expirePendingOrders = functions.pubsub.schedule('every 1 minutes').onRun(expirePendingOrdersHandler);
