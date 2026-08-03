// ── Quote generation (server-side pricing authority) ────────────
const functions = require('firebase-functions/v1');
const admin = require('./admin');
const {
    VEHICLE_RATES,
    HELPER_FEE,
    FRAGILE_SURCHARGE,
    RETURN_TRIP_MULTIPLIER,
    FUEL_PRICE_PETROL,
    FUEL_PRICE_DIESEL,
    POWER_TARIFF,
    COMMISSION_RATE,
    GOOGLE_MAPS_KEY,
    haversineKm,
    findTown,
    isLocationSupported,
    getRouteFromGoogleV2,
    computePrice,
} = require('./pricing');
const { validateVehicleCapability } = require('./capabilities');

// ── CALLABLE CLOUD FUNCTION ────────────────────────────────────
const calculateQuoteHandler = async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to get a quote.');
    }

    const { pickupCoords, dropoffCoords, waypoints = [], vehicle, serviceType, helpersCount = 0, isReturnTrip = false, isFragile = false, category = 'A', subCategory = '', payloadWeight, payloadWeightUnit } = data;

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

    // ── Capability guard: validate (vehicle, category, distanceKm) against the
    // canonical capability map. Prevents spoofed API calls bypassing client UI.
    // Authoritative check (server is the only pricing/capability source per spec).
    // Forward the weight unit so toKg() inside the guard converts correctly.
    const capCheck = validateVehicleCapability({ vehicle, category, distanceKm, subCategory, payloadWeight, payloadWeightUnit });
    if (!capCheck.ok) {
        throw new functions.https.HttpsError(
            'failed-precondition',
            `This vehicle can't take this order: ${capCheck.reason}. Please choose a different vehicle.`
        );
    }

    // ── Normalise the cargo weight to kg for the Consolidated LTL branch.
    // The client always sends the raw number + its unit (kg/tonnes/litres/m³).
    // pricing.computePrice then auto-selects a truck tier from this kg value.
    const toKg = (value, unit) => {
        const v = Number(value) || 0;
        if (unit === 'tonnes') return v * 1000;
        if (unit === 'litres') return v * 0.84;     // petrol ≈ 0.84 kg/L
        if (unit === 'm3')     return v * 1000;     // water ≈ 1000 kg/m³
        return v;                                   // kg
    };
    const payloadWeightKg = payloadWeightUnit
        ? toKg(payloadWeight, payloadWeightUnit)
        : (Number(payloadWeight) || 0);

    const result = computePrice({
        distanceKm, durationMinutes, vehicle, serviceType,
        helpersCount, isReturnTrip, isFragile, stopCount,
        isIntercity, category, subCategory, payloadWeightKg
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
        consolidatedTruck: result.consolidatedTruck || undefined,
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
};

module.exports = { calculateQuoteHandler };
