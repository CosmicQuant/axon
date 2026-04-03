const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");

admin.initializeApp();

const cors = require("cors")({ origin: true });

// --- ENTERPRISE PRICING MODEL CONSTANTS ---
// Rates are in KES.
const VEHICLE_RATES = {
    'boda': { base: 100, perKm: 30, maxWeight: 100 },
    'tuktuk': { base: 200, perKm: 50, maxWeight: 500 },
    'probox': { base: 350, perKm: 70, maxWeight: 800 },
    'van': { base: 500, perKm: 90, maxWeight: 1500 },
    'pickup': { base: 600, perKm: 100, maxWeight: 2000 },
    'canter': { base: 1200, perKm: 150, maxWeight: 3000 },
    'lorry': { base: 2500, perKm: 200, maxWeight: 10000 },
    'tipper': { base: 3000, perKm: 220, maxWeight: 15000 },
    'container': { base: 4500, perKm: 280, maxWeight: 20000 },
    'tanker': { base: 5000, perKm: 300, maxWeight: 25000 }
};

const SERVICE_MULTIPLIERS = {
    'Standard': 1.0,
    'Express': 1.5
};

const HELPER_FEE = 500; // Flat fee per loader/helper
const RETURN_TRIP_MULTIPLIER = 1.7; // Return trip costs 70% extra (instead of 100%)

/**
 * Calculates straight-line distance (Haversine formula).
 * In production, replace this with Google Maps Distance Matrix API.
 */
function calculateStraightLineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;  
    const dLon = (lon2 - lon1) * Math.PI / 180; 
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c;
}

// --- CALLABLE CLOUD FUNCTION ---
exports.calculateQuote = functions.https.onCall(async (data, context) => {
    // 1. Extract and validate parameters
    const { pickupCoords, dropoffCoords, vehicle, serviceType, helpersCount = 0, isReturnTrip = false } = data;

    if (!pickupCoords || !dropoffCoords || !vehicle) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required coordinates or vehicle type.');
    }

    const vehicleConfig = VEHICLE_RATES[vehicle];
    if (!vehicleConfig) {
        throw new functions.https.HttpsError('invalid-argument', 'Unsupported vehicle type.');
    }

    const multiplier = SERVICE_MULTIPLIERS[serviceType] || 1.0;

    // 2. Calculate Distance
    // Note: For true enterprise routing, you would call the Google Maps Distance Matrix API here
    // using axios. For now, we use straight-line distance multiplied by a routing factor (1.3).
    let distanceKm = calculateStraightLineDistance(
        pickupCoords.lat, pickupCoords.lng, 
        dropoffCoords.lat, dropoffCoords.lng
    );
    distanceKm = distanceKm * 1.3; // Rough routing factor

    // If it's less than 1km, round up to 1km minimum
    if (distanceKm < 1) distanceKm = 1;

    // 3. Apply Enterprise Formula
    const baseFare = vehicleConfig.base;
    const distanceFare = vehicleConfig.perKm * distanceKm;
    const helpersFare = helpersCount * HELPER_FEE;

    // Base + Distance * Multiplier + Fixed Add-ons
    let rawTotal = ((baseFare + distanceFare) * multiplier);

    // Apply Return Trip Multiplier if requested
    if (isReturnTrip) {
        rawTotal = rawTotal * RETURN_TRIP_MULTIPLIER;
    }

    rawTotal += helpersCount * HELPER_FEE;

    // Round to nearest 10 KES for clean numbers
    const finalPrice = Math.round(rawTotal / 10) * 10;

    // 4. Generate Quote ID and save to Firestore
    const quoteId = `QT-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
    const expiresAt = new Date(Date.now() + 15 * 60000); // 15 minute expiry

    await admin.firestore().collection('quotes').doc(quoteId).set({
        pickupCoords,
        dropoffCoords,
        vehicle,
        serviceType,
        helpersCount,
        isReturnTrip,
        distanceKm,
        price: finalPrice,
        expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
        status: 'active'
    });

    // 5. Return payload to frontend
    return {
        quoteId,
        price: finalPrice,
        distanceKm: Number(distanceKm.toFixed(1)),
        breakdown: {
            baseFare,
            distanceFare: Math.round(distanceFare),
            multiplier,
            helpersFare: helpersCount * HELPER_FEE,
            returnTripFare: isReturnTrip ? Math.round(rawTotal - (rawTotal / RETURN_TRIP_MULTIPLIER)) : 0
        },
        expiresAt: expiresAt.toISOString()
    };
});


// --- API & WEBHOOKS MODULE ---
const apiV1 = require('./v1/api');
exports.v1 = functions.https.onRequest(apiV1);
