// ── Dispatch: notify online drivers when a new order is posted ──
// Mirrors the client marketplace vehicle-matching + 50km radius logic so
// drivers get an Uber/Bolt-style "new request" push even when the app is
// in the background. Only fires for orders that start in 'pending'.
const functions = require('firebase-functions/v1');
const admin = require('./admin');
const { sendPushNotification } = require('./notifications');

const DISPATCH_RADIUS_KM = 50;

const haversineKm = (a, b) => {
    const R = 6371;
    const dLat = (b.lat - a.lat) * Math.PI / 180;
    const dLng = (b.lng - a.lng) * Math.PI / 180;
    const s = Math.sin(dLat / 2) ** 2 +
        Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
};

// Normalize driver.vehicleType + order.vehicle to a canonical id so
// 'Boda Boda' matches 'boda', 'Cargo Van' matches 'van', etc.
const normalizeVehicle = (raw) => {
    const t = String(raw || '').toLowerCase().trim();
    if (!t) return '';
    if (t.includes('boda') || t.includes('motor') || t.includes('bike') || t.includes('piki')) return 'boda';
    if (t.includes('tuk')) return 'tuktuk';
    if (t.includes('probox') || t === 'car' || t === 'automobile' || t.includes('sedan')) return 'probox';
    if (t.includes('pick')) return 'pickup';
    if (t.includes('van') || t.includes('minibus')) return 'van';
    if (t.includes('lorry') || t.includes('truck') || t.includes('canter') || t.includes('trailer') || t.includes('container') || t.includes('tanker')) return 'truck';
    if (t === 'standard') return 'standard';
    return t;
};

// Client-equivalent vehicle matching: a 'standard' order can be taken by
// boda/tuktuk/probox drivers; otherwise vehicle ids must match.
const vehicleMatches = (orderVehicle, driverVehicle) => {
    if (!orderVehicle) return true;           // unknown order vehicle → broadcast to all
    if (!driverVehicle) return false;          // driver with unknown vehicle can't be matched
    if (orderVehicle === 'standard') return ['boda', 'tuktuk', 'probox'].includes(driverVehicle);
    return orderVehicle === driverVehicle;
};

const notifyDriversOnNewOrderHandler = async (snap, context) => {
    const order = snap.data();
    if (!order) return null;
    if (order.status !== 'pending') return null;

    const orderVehicle = normalizeVehicle(order.vehicle);
    const pickup = order.pickupCoords;

    // All online drivers
    const driversSnap = await admin.firestore()
        .collection('drivers')
        .where('status', '==', 'online')
        .get();

    if (driversSnap.empty) return null;

    const pickupsText = order.pickup || 'Pickup';
    const dropoffsText = order.dropoff || 'Dropoff';
    const price = order.price != null ? `KES ${Number(order.price).toLocaleString()}` : '';

    const notified = [];
    const sends = [];

    driversSnap.forEach(doc => {
        const d = doc.data();
        // Skip the customer themselves if they happen to be a driver too
        if (order.userId && doc.id === order.userId) return;

        const driverVehicle = normalizeVehicle(d.vehicleType);
        if (!vehicleMatches(orderVehicle, driverVehicle)) return;

        // Radius gate when both sides have coordinates
        if (pickup && pickup.lat && pickup.lng && d.location && d.location.lat) {
            const dist = haversineKm({ lat: pickup.lat, lng: pickup.lng }, d.location);
            if (dist > DISPATCH_RADIUS_KM) return;
        }

        notified.push(doc.id);
        sends.push(sendPushNotification(doc.id, {
            title: 'New delivery nearby!',
            body: `${pickupsText} → ${dropoffsText}${price ? ' · ' + price : ''}`,
            data: {
                type: 'new_order',
                orderId: order.id || context.params.orderId,
                click_action: 'FLUTTER_NOTIFICATION_CLICK',
            },
        }));
    });

    await Promise.all(sends);
    console.log(`notifyDriversOnNewOrder: notified ${notified.length} drivers for order ${order.id || context.params.orderId}`);
    return null;
};

module.exports = { notifyDriversOnNewOrderHandler };
