// ── Axon Cloud Functions — entry point ──────────────────────────
// Modular layout: handlers live in ./lib/*, this file only wires them
// to exported endpoints. Export names are the deployed function names —
// do not rename without coordinating a client release.
const functions = require('firebase-functions/v1');

const { calculateQuoteHandler } = require('./lib/quotes');
const { verifyDeliveryCodeHandler, updateOrderStatusHandler, cancelOrderHandler, attachDeliveryPhotoHandler } = require('./lib/orders');
const { submitReviewHandler } = require('./lib/reviews');
const { raiseDisputeHandler } = require('./lib/disputes');
const { registerFcmTokenHandler } = require('./lib/tokens');
const { expirePendingOrdersHandler } = require('./lib/scheduled');
const { notifyDriversOnNewOrderHandler } = require('./lib/dispatch');
const { analyzeDeliveryRequestHandler, parseNaturalLanguageOrderHandler, chatWithAssistantHandler } = require('./lib/gemini');
const { deleteAccountHandler } = require('./lib/account');

// ── Pricing ─────────────────────────────────────────────────────
exports.calculateQuote = functions.https.onCall(calculateQuoteHandler);

// ── Business API (Express, API-key authenticated) ───────────────
const apiV1 = require('./v1/api');
exports.v1 = functions.https.onRequest(apiV1);

// ── Order lifecycle ─────────────────────────────────────────────
exports.verifyDeliveryCode = functions.https.onCall(verifyDeliveryCodeHandler);
exports.updateOrderStatus = functions.https.onCall(updateOrderStatusHandler);
exports.cancelOrder = functions.https.onCall(cancelOrderHandler);
exports.attachDeliveryPhoto = functions.https.onCall(attachDeliveryPhotoHandler);

// ── Reviews & disputes ──────────────────────────────────────────
exports.submitReview = functions.https.onCall(submitReviewHandler);
exports.raiseDispute = functions.https.onCall(raiseDisputeHandler);

// ── Push notifications ──────────────────────────────────────────
exports.registerFcmToken = functions.https.onCall(registerFcmTokenHandler);

// ── Scheduled jobs ──────────────────────────────────────────────
exports.expirePendingOrders = functions.pubsub.schedule('every 1 minutes').onRun(expirePendingOrdersHandler);

// ── Dispatch: ping online drivers on every new pending order ────
exports.notifyDriversOnNewOrder = functions.firestore.document('orders/{orderId}').onCreate(notifyDriversOnNewOrderHandler);

// ── Gemini AI (server-side key, never exposed to client) ────────
exports.analyzeDeliveryRequest = functions.https.onCall(analyzeDeliveryRequestHandler);
exports.parseNaturalLanguageOrder = functions.https.onCall(parseNaturalLanguageOrderHandler);
exports.chatWithAssistant = functions.https.onCall(chatWithAssistantHandler);

// ── Account management ──────────────────────────────────────────
exports.deleteAccount = functions.https.onCall(deleteAccountHandler);
