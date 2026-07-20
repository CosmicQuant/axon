const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");

admin.initializeApp();

const cors = require("cors")({ origin: true });

// ── UNIFIED PRICING MODEL (Single Source of Truth) ──────────────
// All prices in KES. Base fare covers first 2km.
// Rates calibrated to 2026 Kenya market:
//   Nairobi–Mombasa (~480km) small parcel Standard ≈ 300–600 KES
//   Nairobi–Mombasa Boda N/A (65km max), Probox ≈ 30k, Lorry-10T ≈ 85k
const VEHICLE_RATES = {
    // Light / Parcels
    'boda': { base: 100, perKm: 22, perMin: 2, stopFee: 30, min: 100 },
    'tuktuk': { base: 180, perKm: 35, perMin: 3, stopFee: 50, min: 180 },
    'probox': { base: 500, perKm: 50, perMin: 8, stopFee: 80, min: 500 },
    'van': { base: 800, perKm: 65, perMin: 12, stopFee: 120, min: 800 },
    'pickup': { base: 1000, perKm: 75, perMin: 14, stopFee: 150, min: 1000 },

    // Medium trucks
    'canter': { base: 2000, perKm: 95, perMin: 18, stopFee: 250, min: 2000 },

    // Lorry tonnage variants
    'lorry-5t': { base: 3000, perKm: 115, perMin: 20, stopFee: 350, min: 3000 },
    'lorry-7t': { base: 3500, perKm: 130, perMin: 22, stopFee: 400, min: 3500 },
    'lorry-10t': { base: 4500, perKm: 155, perMin: 25, stopFee: 500, min: 4500 },
    'lorry-14t': { base: 6000, perKm: 185, perMin: 30, stopFee: 600, min: 6000 },

    // Tipper tonnage variants
    'tipper-7t': { base: 3500, perKm: 120, perMin: 20, stopFee: 400, min: 3500 },
    'tipper-14t': { base: 5000, perKm: 160, perMin: 25, stopFee: 500, min: 5000 },
    'tipper-25t': { base: 7000, perKm: 200, perMin: 30, stopFee: 600, min: 7000 },

    // Container sizes
    'container-20ft': { base: 8000, perKm: 180, perMin: 35, stopFee: 700, min: 8000 },
    'container-40ft': { base: 12000, perKm: 250, perMin: 45, stopFee: 900, min: 12000 },

    // Tanker types (LPG vs Petroleum — different pricing)
    'lpg-tanker': { base: 10000, perKm: 220, perMin: 40, stopFee: 800, min: 10000 },
    'fuel-tanker': { base: 12000, perKm: 270, perMin: 45, stopFee: 1000, min: 12000 },

    // Legacy IDs (backward compatibility with existing orders)
    'lorry': { base: 4500, perKm: 155, perMin: 25, stopFee: 500, min: 4500 },
    'tipper': { base: 5000, perKm: 160, perMin: 25, stopFee: 500, min: 5000 },
    'container': { base: 8000, perKm: 180, perMin: 35, stopFee: 700, min: 8000 },
    'tanker': { base: 12000, perKm: 270, perMin: 45, stopFee: 1000, min: 12000 },
    'trailer': { base: 12000, perKm: 250, perMin: 45, stopFee: 900, min: 12000 },

    // Standard consolidated (no dedicated vehicle — affordable parcel rate)
    'standard': { base: 100, perKm: 1.0, perMin: 0, stopFee: 20, min: 80 },
};

// Express = baseline, Standard = consolidated discount
const HELPER_FEE = 500;
const RETURN_TRIP_MULTIPLIER = 1.7;
const FRAGILE_SURCHARGE = 200;

// ── Fuel / Power cost config (EPRA / KPLC — update monthly) ────
const FUEL_PRICE_PETROL = parseFloat(process.env.FUEL_PRICE_PETROL || '192');  // KES / litre
const FUEL_PRICE_DIESEL = parseFloat(process.env.FUEL_PRICE_DIESEL || '170');  // KES / litre
const POWER_TARIFF      = parseFloat(process.env.POWER_TARIFF || '26');        // KES / kWh (KPLC)

// Vehicle fuel / energy consumption profiles
const VEHICLE_FUEL = {
    'boda':      { energy: 'electric', kwhPerKm: 0.04, lPerKm: 0.045, fuel: 'petrol' },
    'tuktuk':    { energy: 'petrol',   lPerKm: 0.06,  fuel: 'petrol' },
    'probox':    { energy: 'petrol',   lPerKm: 0.08,  fuel: 'petrol' },
    'van':       { energy: 'diesel',   lPerKm: 0.10,  fuel: 'diesel' },
    'pickup':    { energy: 'diesel',   lPerKm: 0.12,  fuel: 'diesel' },
    'canter':    { energy: 'diesel',   lPerKm: 0.18,  fuel: 'diesel' },
    'lorry-5t':  { energy: 'diesel',   lPerKm: 0.22,  fuel: 'diesel' },
    'lorry-7t':  { energy: 'diesel',   lPerKm: 0.28,  fuel: 'diesel' },
    'lorry-10t': { energy: 'diesel',   lPerKm: 0.35,  fuel: 'diesel' },
    'lorry-14t': { energy: 'diesel',   lPerKm: 0.42,  fuel: 'diesel' },
    'tipper-7t':   { energy: 'diesel', lPerKm: 0.30, fuel: 'diesel' },
    'tipper-14t':  { energy: 'diesel', lPerKm: 0.40, fuel: 'diesel' },
    'tipper-25t':  { energy: 'diesel', lPerKm: 0.55, fuel: 'diesel' },
    'container-20ft': { energy: 'diesel', lPerKm: 0.45, fuel: 'diesel' },
    'container-40ft': { energy: 'diesel', lPerKm: 0.60, fuel: 'diesel' },
    'lpg-tanker':  { energy: 'diesel', lPerKm: 0.50, fuel: 'diesel' },
    'fuel-tanker': { energy: 'diesel', lPerKm: 0.55, fuel: 'diesel' },
    'standard':    { energy: 'electric', kwhPerKm: 0.04, lPerKm: 0.045, fuel: 'petrol' },
};

// Business parameters
const COMMISSION_RATE       = 0.15;   // Axon commission on subtotal
const CONSOLIDATION_DISCOUNT = 0.55;  // Standard intra-city batching discount
const EXPRESS_PREMIUM       = 50;     // KES on-demand surcharge
const MIN_INTRA_CITY        = 80;     // KES minimum for intra-city standard
const MIN_EXPRESS           = 150;    // KES minimum for intra-city express
const MAINTENANCE_PER_KM    = 2;      // KES/km wear-and-tear
const DRIVER_BASE_PAY       = 30;     // KES base driver pay
const DRIVER_PER_KM         = 15;     // KES/km driver pay

// ── Parcel tier mapping (inter-city flat pricing) ───────────────
const PARCEL_TIERS = {
    'Document': 'small',
    'Small Box': 'small',
    'Medium Box': 'medium',
    'Large Box': 'medium',
    'Jumbo Box': 'jumbo',
    'Custom Dimensions': 'jumbo',
};
const INTERCITY_FLAT_PRICES = { small: 300, medium: 500, jumbo: 700 };

// ── Bulk / specialised categories (distance × vehicle rates) ───
const BULK_SUBCATEGORIES = [
    'Electronics', 'Large Appliances', 'Furniture',
    'Hardware / Construction', 'Agricultural', 'LPG / Gas (Bulk)',
    'Petroleum / Oil', 'Loose Aggregate',
];

// Google Maps API key for server-side Routes API calls
const GOOGLE_MAPS_KEY = process.env.GOOGLE_MAPS_KEY || '';

// ── Service Area (5 supported towns) ─────────────────────────────
const SUPPORTED_TOWNS = [
    { name: 'Nairobi', lat: -1.2864, lng: 36.8172, radiusKm: 25 },
    { name: 'Mombasa', lat: -4.0435, lng: 39.6682, radiusKm: 20 },
    { name: 'Garissa', lat: -0.4536, lng: 39.6461, radiusKm: 12 },
    { name: 'Wajir', lat: 1.7508, lng: 40.0449, radiusKm: 10 },
    { name: 'Ukunda', lat: -4.2700, lng: 39.4147, radiusKm: 10 },
];

function haversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function findTown(lat, lng) {
    for (const town of SUPPORTED_TOWNS) {
        if (haversineKm(lat, lng, town.lat, town.lng) <= town.radiusKm) return town;
    }
    return null;
}

function isLocationSupported(lat, lng) {
    return findTown(lat, lng) !== null;
}

// ── Routes API V2 — Real distance + duration ───────────────────
async function getRouteFromGoogleV2(origin, destination, waypoints = [], vehicleType = 'boda') {
    const normalized = (vehicleType || '').toLowerCase();
    let travelMode = 'DRIVE';
    let routingPreference = 'TRAFFIC_AWARE_OPTIMAL';

    if (normalized.includes('boda') || normalized.includes('moto') || normalized.includes('tuk')) {
        travelMode = 'TWO_WHEELER';
        routingPreference = 'TRAFFIC_AWARE';
    }

    const requestBody = {
        origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
        destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
        intermediates: (waypoints || []).map(w => ({
            location: { latLng: { latitude: w.lat, longitude: w.lng } }
        })),
        travelMode,
        routingPreference,
        computeAlternativeRoutes: false,
        routeModifiers: { avoidTolls: false, avoidHighways: false, avoidFerries: true },
        units: 'METRIC',
        languageCode: 'en-US'
    };

    const fieldMask = 'routes.duration,routes.distanceMeters,routes.legs';

    const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': GOOGLE_MAPS_KEY,
            'X-Goog-FieldMask': fieldMask
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Routes API error:', errorData);
        return null;
    }

    const data = await response.json();
    if (!data.routes || data.routes.length === 0) return null;

    const route = data.routes[0];
    const parseDuration = (dur) => dur ? parseInt(dur.replace('s', ''), 10) : 0;

    return {
        distanceMeters: route.distanceMeters || 0,
        durationSeconds: parseDuration(route.duration),
        legs: (route.legs || []).map(leg => ({
            distanceMeters: leg.distanceMeters || 0,
            durationSeconds: parseDuration(leg.duration)
        }))
    };
}

// ── UNIFIED PRICE FORMULA (v2) ─────────────────────────────────
// Three pricing models:
//   1. intercity_flat   — parcel tiers, flat KES between supported towns
//   2. intra_city       — fuel-aware formula (Standard = consolidated electric boda, Express = on-demand)
//   3. bulk             — distance × vehicle rates for heavy / specialised cargo
function computePrice({ distanceKm, durationMinutes, vehicle, serviceType, helpersCount = 0, isReturnTrip = false, isFragile = false, stopCount = 0, isIntercity = false, category = 'A', subCategory = '' }) {
    const rates = VEHICLE_RATES[vehicle] || VEHICLE_RATES['boda'];
    const fuel = VEHICLE_FUEL[vehicle] || VEHICLE_FUEL['boda'];
    const isBulk = category === 'B' || BULK_SUBCATEGORIES.includes(subCategory);
    const round10 = (n) => Math.round(n / 10) * 10;

    // ── 1. Inter-city parcel flat pricing ──────────────────────
    if (isIntercity && !isBulk) {
        const tier = PARCEL_TIERS[subCategory] || 'medium';
        let price = INTERCITY_FLAT_PRICES[tier];
        // Standard gets a small consolidation discount on inter-city too
        if (serviceType === 'Standard') price = Math.round(price * 0.9);
        price += stopCount * 50; // flat stop fee for inter-city parcels
        if (isReturnTrip) price = Math.round(price * RETURN_TRIP_MULTIPLIER);
        if (isFragile) price += FRAGILE_SURCHARGE;
        const driverCut = Math.round(price * 0.7);
        return { price: round10(Math.max(price, INTERCITY_FLAT_PRICES.small)), driverCut, model: 'intercity_flat' };
    }

    // ── 3. Bulk / specialised cargo (inter-city or intra-city) ─
    if (isBulk) {
        const billableKm = Math.max(0, distanceKm - 2);
        const extraStopFee = Math.max(0, stopCount) * rates.stopFee;
        const intercitySurcharge = isIntercity ? (rates.base * 0.3) : 0;

        let total = rates.base + (billableKm * rates.perKm) + extraStopFee + intercitySurcharge;
        if (isReturnTrip) total *= RETURN_TRIP_MULTIPLIER;
        total += helpersCount * HELPER_FEE;
        if (isFragile) total += FRAGILE_SURCHARGE;
        total = Math.max(total, rates.min);
        const driverCut = Math.round(total * 0.75);
        return { price: round10(total), driverCut, model: 'bulk' };
    }

    // ── 2. Intra-city parcels (fuel-aware) ─────────────────────
    const fuelCost = fuel.energy === 'electric'
        ? distanceKm * fuel.kwhPerKm * POWER_TARIFF
        : distanceKm * fuel.lPerKm * (fuel.fuel === 'diesel' ? FUEL_PRICE_DIESEL : FUEL_PRICE_PETROL);

    const maintenance = distanceKm * MAINTENANCE_PER_KM;
    const driverCut = DRIVER_BASE_PAY + (distanceKm * DRIVER_PER_KM);
    const subtotal = fuelCost + maintenance + driverCut;
    const commission = subtotal * COMMISSION_RATE;

    let price;
    let model;

    if (serviceType === 'Standard') {
        // Consolidated delivery (8am / 12pm / 4pm windows, electric boda batching)
        price = (subtotal + commission) * CONSOLIDATION_DISCOUNT;
        price += stopCount * 20;
        model = 'intra_standard';
        price = Math.max(price, MIN_INTRA_CITY);
    } else {
        // Express on-demand
        price = subtotal + commission + EXPRESS_PREMIUM;
        price += stopCount * rates.stopFee;
        model = 'intra_express';
        price = Math.max(price, MIN_EXPRESS);
    }

    if (isReturnTrip) price *= RETURN_TRIP_MULTIPLIER;
    if (isFragile) price += FRAGILE_SURCHARGE;
    price += helpersCount * HELPER_FEE;

    return { price: round10(price), driverCut: round10(driverCut), model };
}

// ── CALLABLE CLOUD FUNCTION ────────────────────────────────────
exports.calculateQuote = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to get a quote.');
    }

    const { pickupCoords, dropoffCoords, waypoints = [], vehicle, serviceType, helpersCount = 0, isReturnTrip = false, isFragile = false, category = 'A', subCategory = '' } = data;

    if (!pickupCoords || !dropoffCoords || !vehicle) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required coordinates or vehicle type.');
    }

    const rates = VEHICLE_RATES[vehicle];
    if (!rates) {
        throw new functions.https.HttpsError('invalid-argument', `Unsupported vehicle type: ${vehicle}`);
    }

    // Service-area enforcement: pickup, dropoff, and all waypoints must be
    // within one of the 5 supported towns.
    if (!isLocationSupported(pickupCoords.lat, pickupCoords.lng)) {
        throw new functions.https.HttpsError('failed-precondition',
            "We don't serve this pickup area yet. Axon is live in Nairobi, Mombasa, Garissa, Wajir & Ukanda.");
    }
    if (!isLocationSupported(dropoffCoords.lat, dropoffCoords.lng)) {
        throw new functions.https.HttpsError('failed-precondition',
            "We don't serve this drop-off area yet. Axon is live in Nairobi, Mombasa, Garissa, Wajir & Ukanda.");
    }
    if (Array.isArray(waypoints)) {
        for (const wp of waypoints) {
            if (!isLocationSupported(wp.lat, wp.lng)) {
                throw new functions.https.HttpsError('failed-precondition',
                    "One of your stops is outside our service area. Axon is live in Nairobi, Mombasa, Garissa, Wajir & Ukanda.");
            }
        }
    }

    const pickupTown = findTown(pickupCoords.lat, pickupCoords.lng);
    const dropoffTown = findTown(dropoffCoords.lat, dropoffCoords.lng);
    const isIntercity = pickupTown.name !== dropoffTown.name;

    // Count extra stops (waypoints excluding dropoff)
    const stopCount = Array.isArray(waypoints) ? waypoints.length : 0;

    let distanceKm, durationMinutes;

    // Try real Routes API V2 first
    if (GOOGLE_MAPS_KEY) {
        try {
            const routeResult = await getRouteFromGoogleV2(pickupCoords, dropoffCoords, waypoints, vehicle);
            if (routeResult) {
                distanceKm = routeResult.distanceMeters / 1000;
                durationMinutes = routeResult.durationSeconds / 60;
            }
        } catch (err) {
            console.warn('Routes API call failed, falling back to Haversine:', err.message);
        }
    }

    // Fallback: Haversine × routing factor
    if (!distanceKm) {
        distanceKm = haversineKm(pickupCoords.lat, pickupCoords.lng, dropoffCoords.lat, dropoffCoords.lng) * 1.3;
        durationMinutes = (distanceKm / 35) * 60; // estimate at 35km/h
    }

    if (distanceKm < 1) distanceKm = 1;

    const result = computePrice({
        distanceKm, durationMinutes, vehicle, serviceType,
        helpersCount, isReturnTrip, isFragile, stopCount,
        isIntercity, category, subCategory
    });
    const finalPrice = result.price;
    const driverRate = Math.max(100, result.driverCut);

    const quoteId = `QT-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
    const expiresAt = new Date(Date.now() + 15 * 60000);

    await admin.firestore().collection('quotes').doc(quoteId).set({
        pickupCoords, dropoffCoords, waypoints,
        vehicle, serviceType, helpersCount, isReturnTrip, isFragile,
        category, subCategory,
        distanceKm: Number(distanceKm.toFixed(1)),
        durationMinutes: Number(durationMinutes.toFixed(1)),
        price: finalPrice, driverRate,
        pricingModel: result.model,
        pickupTown: pickupTown.name, dropoffTown: dropoffTown.name, isIntercity,
        expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
        status: 'active'
    });

    return {
        quoteId,
        price: finalPrice,
        driverRate,
        distanceKm: Number(distanceKm.toFixed(1)),
        durationMinutes: Number(durationMinutes.toFixed(1)),
        pricingModel: result.model,
        isIntercity,
        breakdown: {
            baseFare: rates.base,
            distanceFare: Math.round(Math.max(0, distanceKm - 2) * rates.perKm),
            timeFare: Math.round(durationMinutes * rates.perMin),
            stopFees: stopCount * rates.stopFee,
            helpersFee: helpersCount * HELPER_FEE,
            fragileFee: isFragile ? FRAGILE_SURCHARGE : 0,
            returnTripMultiplier: isReturnTrip ? RETURN_TRIP_MULTIPLIER : 1.0,
            fuelPricePetrol: FUEL_PRICE_PETROL,
            fuelPriceDiesel: FUEL_PRICE_DIESEL,
            powerTariff: POWER_TARIFF,
            commissionRate: COMMISSION_RATE
        },
        expiresAt: expiresAt.toISOString()
    };
});


// --- API & WEBHOOKS MODULE ---
const apiV1 = require('./v1/api');
exports.v1 = functions.https.onRequest(apiV1);

// ── SERVER-SIDE DELIVERY VERIFICATION ───────────────────────────
// Verifies the 4-digit passcode server-side so the driver never has
// access to the code in the order document.
exports.verifyDeliveryCode = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to verify a delivery.');
    }

    const { orderId, code, stopId } = data;
    if (!orderId || !code) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing orderId or code.');
    }

    const orderRef = admin.firestore().doc(`orders/${orderId}`);
    const orderDoc = await orderRef.get();
    if (!orderDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Order not found.');
    }

    const orderData = orderDoc.data();

    // Ensure the caller is the assigned driver
    if (!orderData.driver || orderData.driver.id !== context.auth.uid) {
        throw new functions.https.HttpsError('permission-denied', 'You are not assigned to this order.');
    }

    // Codes live in the private subcollection (orders/{id}/private/codes) so the
    // driver can never read them from the order doc. Fall back to legacy fields
    // on the order doc for orders created before the subcollection existed.
    let targetCode;
    const codesDoc = await orderRef.collection('private').doc('codes').get();
    if (codesDoc.exists) {
        const codes = codesDoc.data();
        targetCode = stopId ? (codes.stopCodes || {})[stopId] : undefined;
        if (!targetCode) targetCode = codes.orderCode;
    }
    if (!targetCode) {
        targetCode = orderData.verificationCode;
        if (stopId && Array.isArray(orderData.stops)) {
            const stop = orderData.stops.find(s => s.id === stopId);
            if (stop) {
                targetCode = stop.verificationCode || orderData.verificationCode;
            }
        }
    }

    if (!targetCode) {
        throw new functions.https.HttpsError('internal', 'No verification code found for this order.');
    }

    const isValid = String(code) === String(targetCode);

    return { valid: isValid };
});

// ── SERVER-SIDE ORDER STATUS TRANSITION ─────────────────────────
// Forward-only driver transitions. Cancel goes through cancelOrder,
// disputes through raiseDispute, reviews through submitReview, expiry
// through the scheduled expirePendingOrders job.
exports.updateOrderStatus = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'You must be signed in.');
    }

    const { orderId, newStatus, extraData } = data;
    if (!orderId || !newStatus) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing orderId or newStatus.');
    }

    const allowedTransitions = {
        'driver_assigned':  ['arriving_pickup', 'in_transit'],
        'arriving_pickup':  ['in_transit'],
        'in_transit':       ['delivered'],
    };

    const orderRef = admin.firestore().doc(`orders/${orderId}`);

    try {
        await admin.firestore().runTransaction(async (transaction) => {
            const orderDoc = await transaction.get(orderRef);
            if (!orderDoc.exists) {
                throw new functions.https.HttpsError('not-found', 'Order not found.');
            }

            const orderData = orderDoc.data();
            const currentStatus = orderData.status;

            const isDriver = orderData.driver && orderData.driver.id === context.auth.uid;
            if (!isDriver) {
                throw new functions.https.HttpsError('permission-denied', 'Only the assigned driver can update this order.');
            }

            const allowed = allowedTransitions[currentStatus] || [];
            if (!allowed.includes(newStatus)) {
                throw new functions.https.HttpsError('failed-precondition',
                    `Cannot transition from ${currentStatus} to ${newStatus}.`);
            }

            const updates = {
                status: newStatus,
                updatedAt: new Date().toISOString(),
            };

            if (newStatus === 'arriving_pickup') {
                updates.headingToPickupAt = updates.updatedAt;
            } else if (newStatus === 'in_transit') {
                updates.startedAt = new Date().toISOString();
                updates.startTime = updates.startedAt;
            } else if (newStatus === 'delivered') {
                updates.deliveredAt = new Date().toISOString();
                updates.endTime = updates.deliveredAt;
                if (extraData?.deliveryConfirmationImage) {
                    updates.deliveryConfirmationImage = extraData.deliveryConfirmationImage;
                }
            }

            transaction.update(orderRef, updates);
        });

        // Send push notification for status changes
        const orderDoc = await orderRef.get();
        const orderData = orderDoc.data();
        if (orderData.userId) {
            await sendPushNotification(orderData.userId, {
                title: getNotificationTitle(newStatus),
                body: getNotificationBody(newStatus, orderData),
            });
        }

        return { success: true };
    } catch (error) {
        console.error('updateOrderStatus error:', error);
        throw error;
    }
});


// ── CANCEL ORDER (structured cancel with refund logic) ──────────
exports.cancelOrder = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'You must be signed in.');
    }

    const { orderId, reason } = data;
    if (!orderId) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing orderId.');
    }

    const orderRef = admin.firestore().doc(`orders/${orderId}`);
    let orderData;
    let isCustomer;
    let isDriver;

    await admin.firestore().runTransaction(async (transaction) => {
        const orderDoc = await transaction.get(orderRef);
        if (!orderDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Order not found.');
        }

        orderData = orderDoc.data();

        // Either the customer or the assigned driver can cancel
        isCustomer = orderData.userId === context.auth.uid;
        isDriver = orderData.driver && orderData.driver.id === context.auth.uid;

        if (!isCustomer && !isDriver) {
            throw new functions.https.HttpsError('permission-denied', 'You are not authorized to cancel this order.');
        }

        // Can only cancel before in_transit
        if (!['pending', 'driver_assigned', 'arriving_pickup'].includes(orderData.status)) {
            throw new functions.https.HttpsError('failed-precondition', 'Cannot cancel at this stage. Please raise a dispute instead.');
        }

        const updates = {
            status: 'cancelled',
            cancellationReason: reason || (isDriver ? 'Driver cancelled' : 'Customer cancelled'),
            cancelledBy: isDriver ? 'driver' : 'customer',
            updatedAt: new Date().toISOString(),
        };

        // Cancel penalty: if customer cancels after driver assigned, driver gets 100 KES
        if (isCustomer && ['driver_assigned', 'arriving_pickup'].includes(orderData.status)) {
            if (orderData.paymentMethod === 'M-Pesa') {
                updates.refundAmount = Math.max(0, (orderData.price || 0) - 100);
                updates.cancelPenaltyPaid = true;
            }
        }

        transaction.update(orderRef, updates);
    });

    // Notify the other party
    const penaltyApplied = isCustomer && ['driver_assigned', 'arriving_pickup'].includes(orderData.status) && orderData.paymentMethod === 'M-Pesa';
    if (isCustomer && orderData.driver && orderData.driver.id) {
        await sendPushNotification(orderData.driver.id, {
            title: 'Order Cancelled',
            body: `The customer cancelled order #${orderId.substring(0, 8)}. ${penaltyApplied ? 'You will receive KES 100 compensation.' : ''}`,
        });
    } else if (isDriver && orderData.userId) {
        await sendPushNotification(orderData.userId, {
            title: 'Order Cancelled',
            body: `Your driver cancelled order #${orderId.substring(0, 8)}. We're finding you a new driver.`,
        });
    }

    return { success: true };
});

// ── SUBMIT REVIEW (double-blind) ────────────────────────────────
exports.submitReview = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'You must be signed in.');
    }

    const { orderId, rating, comment, tags, reviewedRole } = data;
    if (!orderId || rating === undefined || rating === null || !reviewedRole) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required fields.');
    }

    // Validate rating: integer 1–5
    const numericRating = Number(rating);
    if (!Number.isFinite(numericRating) || numericRating < 1 || numericRating > 5) {
        throw new functions.https.HttpsError('invalid-argument', 'Rating must be between 1 and 5.');
    }

    const orderRef = admin.firestore().doc(`orders/${orderId}`);
    let willHaveBoth = false;

    await admin.firestore().runTransaction(async (transaction) => {
        const orderDoc = await transaction.get(orderRef);
        if (!orderDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Order not found.');
        }

        const orderData = orderDoc.data();

        // Can only review delivered orders
        if (!['delivered', 'reviewed'].includes(orderData.status)) {
            throw new functions.https.HttpsError('failed-precondition', 'Can only review after delivery.');
        }

        const isCustomer = orderData.userId === context.auth.uid;
        const isDriver = orderData.driver && orderData.driver.id === context.auth.uid;

        if (!isCustomer && !isDriver) {
            throw new functions.https.HttpsError('permission-denied', 'Not authorized.');
        }

        const review = {
            rating: numericRating,
            comment: comment || '',
            tags: Array.isArray(tags) ? tags : [],
            date: new Date().toISOString(),
            submittedBy: isCustomer ? 'customer' : 'driver',
        };

        const updates = { updatedAt: new Date().toISOString() };

        if (isCustomer) {
            // Customer reviews the driver
            if (orderData.reviewForDriver) {
                throw new functions.https.HttpsError('failed-precondition', 'You have already reviewed this order.');
            }
            updates.reviewForDriver = review;
        } else {
            // Driver reviews the customer
            if (orderData.reviewForCustomer) {
                throw new functions.https.HttpsError('failed-precondition', 'You have already reviewed this order.');
            }
            updates.reviewForCustomer = review;
        }

        // If both reviews are now submitted, transition to 'reviewed'
        willHaveBoth = (isCustomer && !!orderData.reviewForCustomer) || (isDriver && !!orderData.reviewForDriver);
        if (willHaveBoth) {
            updates.status = 'reviewed';
        }

        transaction.update(orderRef, updates);

        // Update driver's average rating atomically (same transaction)
        if (isCustomer && orderData.driver && orderData.driver.id) {
            const driverRef = admin.firestore().doc(`drivers/${orderData.driver.id}`);
            const driverDoc = await transaction.get(driverRef);
            if (driverDoc.exists) {
                const driverData = driverDoc.data();
                const currentRating = driverData.rating || 0;
                const currentTrips = driverData.totalTrips || 0;
                const newTrips = currentTrips + 1;
                const newRating = ((currentRating * currentTrips) + numericRating) / newTrips;
                transaction.update(driverRef, { rating: Math.round(newRating * 10) / 10, totalTrips: newTrips });
            }
        }
    });

    return { success: true, bothSubmitted: willHaveBoth };
});

// ── RAISE DISPUTE ───────────────────────────────────────────────
exports.raiseDispute = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'You must be signed in.');
    }

    const { orderId, reason, description } = data;
    if (!orderId || !reason) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing orderId or reason.');
    }

    const orderRef = admin.firestore().doc(`orders/${orderId}`);
    const orderDoc = await orderRef.get();
    if (!orderDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Order not found.');
    }

    const orderData = orderDoc.data();

    const isCustomer = orderData.userId === context.auth.uid;
    const isDriver = orderData.driver && orderData.driver.id === context.auth.uid;

    if (!isCustomer && !isDriver) {
        throw new functions.https.HttpsError('permission-denied', 'Not authorized.');
    }

    // Can only dispute delivered or in_transit orders
    if (!['in_transit', 'delivered'].includes(orderData.status)) {
        throw new functions.https.HttpsError('failed-precondition', 'Can only dispute active or delivered orders.');
    }

    const dispute = {
        raisedBy: isCustomer ? 'customer' : 'driver',
        reason,
        description: description || '',
        status: 'open',
        createdAt: new Date().toISOString(),
    };

    // Save dispute to a separate collection for admin review.
    // userId/driverId fields match the Firestore rules so both parties can read it.
    await admin.firestore().collection('disputes').add({
        orderId,
        userId: orderData.userId || null,
        driverId: orderData.driver?.id || null,
        orderData: {
            pickup: orderData.pickup,
            dropoff: orderData.dropoff,
            price: orderData.price,
            customerName: orderData.sender?.name,
            driverName: orderData.driver?.name,
        },
        ...dispute,
    });

    await orderRef.update({
        status: 'disputed',
        dispute,
        updatedAt: new Date().toISOString(),
    });

    return { success: true };
});

// ── EXPIRE PENDING ORDERS (scheduled cron) ──────────────────────
exports.expirePendingOrders = functions.pubsub.schedule('every 1 minutes').onRun(async (event) => {
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
});

// ── FCM TOKEN REGISTRATION ──────────────────────────────────────
exports.registerFcmToken = functions.https.onCall(async (data, context) => {
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
});

// ── Helper: send push notification ──────────────────────────────
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
