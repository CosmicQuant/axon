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
    // Van family split (legacy single 'van' kept above for historical orders).
    'van-1t': { base: 600, perKm: 55, perMin: 10, stopFee: 100, min: 600 },
    'van-3t': { base: 850, perKm: 70, perMin: 12, stopFee: 120, min: 850 },
    'pickup': { base: 1000, perKm: 75, perMin: 14, stopFee: 150, min: 1000 },

    // Medium trucks
    'canter': { base: 2000, perKm: 95, perMin: 18, stopFee: 250, min: 2000 },

// Lorry tonnage variants
    'lorry-5t': { base: 3000, perKm: 115, perMin: 20, stopFee: 350, min: 3000 },
    'lorry-7t': { base: 3500, perKm: 130, perMin: 22, stopFee: 400, min: 3500 },
    'lorry-10t': { base: 4500, perKm: 155, perMin: 25, stopFee: 500, min: 4500 },
    'lorry-14t': { base: 6000, perKm: 185, perMin: 30, stopFee: 600, min: 6000 },

    // ── Axle-based rigid trucks (KeNHA / EAC Vehicle Load Control Act) ──
    'rigid-truck-2axle': { base: 3000, perKm: 110, perMin: 18, stopFee: 350, min: 3000 },  // 18T
    'rigid-truck-3axle': { base: 4500, perKm: 140, perMin: 22, stopFee: 500, min: 4500 },  // 26T
    'rigid-truck-4axle': { base: 6000, perKm: 180, perMin: 28, stopFee: 600, min: 6000 },  // 30T
    'semi-truck-4axle':  { base: 7000, perKm: 200, perMin: 32, stopFee: 700, min: 7000 },  // 38T
    'semi-truck-5axle':  { base: 8000, perKm: 225, perMin: 35, stopFee: 800, min: 8000 },  // 44T
    'semi-truck-6axle':  { base: 9500, perKm: 250, perMin: 40, stopFee: 900, min: 9500 },  // 50T
    'semi-truck-7axle':  { base: 11000, perKm: 280, perMin: 45, stopFee: 1000, min: 11000 }, // 56T

    // Tipper tonnage variants (legacy)
    'tipper-7t': { base: 3500, perKm: 120, perMin: 20, stopFee: 400, min: 3500 },
    'tipper-14t': { base: 5000, perKm: 160, perMin: 25, stopFee: 500, min: 5000 },
    'tipper-25t': { base: 7000, perKm: 200, perMin: 30, stopFee: 600, min: 7000 },

    // ── Axle-based tippers (KeNHA GVW; rigid dump trucks) ──
    'tipper-2axle': { base: 3500, perKm: 120, perMin: 20, stopFee: 400, min: 3500 },  // 18T
    'tipper-3axle': { base: 5000, perKm: 160, perMin: 25, stopFee: 500, min: 5000 },  // 26T
    'tipper-4axle': { base: 7000, perKm: 200, perMin: 30, stopFee: 600, min: 7000 },  // 30T

    // Container sizes (legacy)
    'container-20ft': { base: 8000, perKm: 180, perMin: 35, stopFee: 700, min: 8000 },
    'container-40ft': { base: 12000, perKm: 250, perMin: 45, stopFee: 900, min: 12000 },

    // ── Axle-based container semi-trucks (Port/Shippers Council 34T cap) ──
    'container-5axle': { base: 8000, perKm: 210, perMin: 35, stopFee: 800, min: 8000 },   // 44T (5-axle)
    'container-6axle': { base: 9500, perKm: 240, perMin: 40, stopFee: 900, min: 9500 },   // 50T (6-axle)
    'container-7axle': { base: 11000, perKm: 270, perMin: 45, stopFee: 1000, min: 11000 }, // 56T (7-axle)

    // Tanker types (legacy)
    'lpg-tanker': { base: 10000, perKm: 220, perMin: 40, stopFee: 800, min: 10000 },
    'fuel-tanker': { base: 12000, perKm: 270, perMin: 45, stopFee: 1000, min: 12000 },

    // ── Axle-based hazmat tankers (KeNHA GVW; strict cargo) ──
    'lpg-tanker-6axle':  { base: 10000, perKm: 240, perMin: 40, stopFee: 900, min: 10000 },  // 50T, ~22-25T LPG payload
    // Fuel tankers graded by tank capacity (litres).
    'fuel-tanker-2axle-10kl': { base: 6000, perKm: 180, perMin: 30, stopFee: 600, min: 6000 },  // 10,000L
    'fuel-tanker-3axle-18kl': { base: 8000, perKm: 200, perMin: 35, stopFee: 700, min: 8000 },  // 18,000L
    'fuel-tanker-4axle-20kl': { base: 9500, perKm: 220, perMin: 38, stopFee: 800, min: 9500 },  // 20,000L
    'fuel-tanker-6axle-30kl': { base: 11000, perKm: 260, perMin: 45, stopFee: 1000, min: 11000 }, // 30,000L
    // Legacy fuel tanker IDs (pre-capacity grading)
    'fuel-tanker-3axle': { base: 8000, perKm: 200, perMin: 35, stopFee: 700, min: 8000 },    // 26T rigid, ~16-18kL
    'fuel-tanker-6axle': { base: 12000, perKm: 270, perMin: 45, stopFee: 1000, min: 12000 }, // 50T semi, ~35-42kL

    // ── Refrigerated trucks (reefers) — temp-controlled cold chain ──
    // Premium over dry trucks (refrigeration fuel + insulation tare).
    'reefer-van':         { base: 1500, perKm: 95,  perMin: 14, stopFee: 150, min: 1500 },  // 1.5T
    'reefer-truck-3axle': { base: 5500, perKm: 185, perMin: 28, stopFee: 600, min: 5500 },  // 26T 3-axle
    'reefer-semi-6axle':  { base: 8500, perKm: 290, perMin: 40, stopFee: 800, min: 8500 },  // 50T 6-axle semi

    // ── New payload-tier taxonomy (canonical). Legacy axle ids kept above ──
    'truck-3t':  { base: 2000, perKm: 95,  perMin: 18, stopFee: 250, min: 2000 },
    'truck-5t':  { base: 2500, perKm: 115, perMin: 20, stopFee: 350, min: 2500 },
    'truck-7t':  { base: 3000, perKm: 140, perMin: 22, stopFee: 400, min: 3000 },
    'truck-10t': { base: 4500, perKm: 170, perMin: 26, stopFee: 500, min: 4500 },
    'truck-15t': { base: 6000, perKm: 200, perMin: 30, stopFee: 600, min: 6000 },
    'trailer-20ft': { base: 8000, perKm: 210, perMin: 35, stopFee: 800, min: 8000 },
    'trailer-40ft': { base: 11000, perKm: 270, perMin: 45, stopFee: 1000, min: 11000 },
    // Fuel tankers (canonical litre ids)
    'fuel-tanker-10kl': { base: 6000,  perKm: 180, perMin: 30, stopFee: 600,  min: 6000 },
    'fuel-tanker-18kl': { base: 8000,  perKm: 200, perMin: 35, stopFee: 700,  min: 8000 },
    'fuel-tanker-30kl': { base: 11000, perKm: 260, perMin: 45, stopFee: 1000, min: 11000 },
    'lpg-tanker':  { base: 10000, perKm: 240, perMin: 40, stopFee: 900, min: 10000 },
    // Reefers (new tiers)
    'reefer-truck-3t':  { base: 4000,  perKm: 165, perMin: 24, stopFee: 500, min: 4000 },
    'reefer-truck-10t': { base: 6500,  perKm: 210, perMin: 32, stopFee: 700, min: 6500 },

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
    'van-1t':    { energy: 'diesel',   lPerKm: 0.08,  fuel: 'diesel' },
    'van-3t':    { energy: 'diesel',   lPerKm: 0.11,  fuel: 'diesel' },
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
    'fuel-tanker-2axle-10kl': { energy: 'diesel', lPerKm: 0.35, fuel: 'diesel' },
    'fuel-tanker-3axle-18kl': { energy: 'diesel', lPerKm: 0.45, fuel: 'diesel' },
    'fuel-tanker-4axle-20kl': { energy: 'diesel', lPerKm: 0.50, fuel: 'diesel' },
    'fuel-tanker-6axle-30kl': { energy: 'diesel', lPerKm: 0.60, fuel: 'diesel' },
    'fuel-tanker-3axle': { energy: 'diesel', lPerKm: 0.45, fuel: 'diesel' },
    'fuel-tanker-6axle': { energy: 'diesel', lPerKm: 0.60, fuel: 'diesel' },
    // Reefers: diesel hauling + ~15% extra burn for refrigeration unit
    'reefer-van':         { energy: 'diesel', lPerKm: 0.13, fuel: 'diesel' },
    'reefer-truck-3axle': { energy: 'diesel', lPerKm: 0.32, fuel: 'diesel' },
    'reefer-semi-6axle':  { energy: 'diesel', lPerKm: 0.55, fuel: 'diesel' },
    'standard':    { energy: 'electric', kwhPerKm: 0.04, lPerKm: 0.045, fuel: 'petrol' },

    // New payload-tier taxonomy fuel profiles (canonical)
    'truck-3t':  { energy: 'diesel', lPerKm: 0.18, fuel: 'diesel' },
    'truck-5t':  { energy: 'diesel', lPerKm: 0.22, fuel: 'diesel' },
    'truck-7t':  { energy: 'diesel', lPerKm: 0.28, fuel: 'diesel' },
    'truck-10t': { energy: 'diesel', lPerKm: 0.35, fuel: 'diesel' },
    'truck-15t': { energy: 'diesel', lPerKm: 0.42, fuel: 'diesel' },
    'trailer-20ft': { energy: 'diesel', lPerKm: 0.48, fuel: 'diesel' },
    'trailer-40ft': { energy: 'diesel', lPerKm: 0.60, fuel: 'diesel' },
    'fuel-tanker-10kl': { energy: 'diesel', lPerKm: 0.35, fuel: 'diesel' },
    'fuel-tanker-18kl': { energy: 'diesel', lPerKm: 0.45, fuel: 'diesel' },
    'fuel-tanker-30kl': { energy: 'diesel', lPerKm: 0.60, fuel: 'diesel' },
    'reefer-truck-3t':  { energy: 'diesel', lPerKm: 0.21, fuel: 'diesel' },
    'reefer-truck-10t': { energy: 'diesel', lPerKm: 0.36, fuel: 'diesel' },
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
    'Petroleum / Oil', 'Loose Aggregate', 'Perishables / Cold Chain',
];

// ── Specialised cargo → must use a dedicated vehicle (Express). Standard
// Consolidated cannot carry them because the truck is shared with other
// shippers' freight that the dedicated cargo would damage/contaminate.
const SPECIALIZED_SUBCATEGORIES = [
    'Loose Aggregate',     // tipper-only
    'LPG / Gas (Bulk)',    // pressurised tanker
    'Petroleum / Oil',     // fuel tanker
    'Perishables / Cold Chain', // reefer
];
const isSpecializedBulk = (sub) => SPECIALIZED_SUBCATEGORIES.includes(sub);

// ── Pick the LTL truck tier for a consolidated shipment from its weight in kg.
// Covers everything from a single 90kg ag sack up to ~18T of furniture. Cargo
// heavier than the truck tier bounds still gets a consolidated share but is
// upsized to a trailer rate — never blocks the quote. No weight cap: Standard
// Consolidated is full LTL support (Nairobi–Mombasa heavy furniture, tonnes
// of produce, etc.) and the truck tier is auto-selected by payload size.
const pickConsolidationTruck = (weightKg) => {
    const w = Number(weightKg) || 0;
    if (w <= 3500)  return 'truck-3t';        // up to ~3T (most common LTL)
    if (w <= 5500)  return 'truck-5t';
    if (w <= 9000)  return 'truck-7t';
    if (w <= 13000) return 'truck-10t';
    if (w <= 18000) return 'truck-15t';
    if (w <= 24000) return 'trailer-20ft';
    return 'trailer-40ft';                  // very heavy consolidated freight
};

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
// Four pricing models:
//   1. intercity_flat      — parcel tiers, flat KES between supported towns
//   2. consolidated_ltl    — Standard Consolidated LTL freight (Cat B general
//                            bulky cargo in a shared truck; tier by weight ×
//                            CONSOLIDATION_DISCOUNT). No weight cap.
//   3. intra_city          — fuel-aware formula (Standard = consolidated parcel;
//                            Express = on-demand). Cat A parcels only.
//   4. bulk                — distance × vehicle rates for heavy / dedicated cargo
function computePrice({ distanceKm, durationMinutes, vehicle, serviceType, helpersCount = 0, isReturnTrip = false, isFragile = false, stopCount = 0, isIntercity = false, category = 'A', subCategory = '', payloadWeightKg = 0 }) {
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

    // ── 2. Standard Consolidated LTL (shared truck, general bulky cargo) ──
    // Standard + general Cat B bulk = less-than-truckload freight. The customer's
    // share rides in a shared truck; the consolidated discount (0.55) is applied
    // to the LTL truck rate auto-picked from cargo weight. No weight cap — from
    // a few kg up to ~18T (truck-15t) and beyond (trailer share). Specialised
    // cargo (aggregate/LPG/petroleum/cold-chain) is rejected upstream by the
    // capability guard, so it never reaches this branch.
    if (serviceType === 'Standard' && isBulk && !isSpecializedBulk(subCategory)) {
        const weightKg = Number(payloadWeightKg) || 0;
        const tierVehicle = pickConsolidationTruck(weightKg);
        const tierRates = VEHICLE_RATES[tierVehicle] || VEHICLE_RATES['truck-10t'];
        const billableKm = Math.max(0, distanceKm - 2);
        // Shared truck: stops are subsidised between shippers.
        const extraStopFee = Math.max(0, stopCount) * tierRates.stopFee * 0.3;
        const intercitySurcharge = isIntercity ? (tierRates.base * 0.2) : 0;

        let total = tierRates.base + (billableKm * tierRates.perKm) + extraStopFee + intercitySurcharge;
        total *= CONSOLIDATION_DISCOUNT;
        if (isReturnTrip) total *= RETURN_TRIP_MULTIPLIER;
        total += helpersCount * HELPER_FEE;
        if (isFragile) total += FRAGILE_SURCHARGE;
        // Modest LTL floor (~2× the intra-city parcel minimum) protects against
        // tiny-distance undercharging on consolidated freight.
        total = Math.max(total, MIN_INTRA_CITY * 2);
        const driverCut = Math.round(total * 0.7);
        return { price: round10(total), driverCut, model: 'consolidated_ltl', consolidatedTruck: tierVehicle };
    }

    // ── 4. Bulk / specialised cargo (inter-city or intra-city) ─
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

    // ── 3. Intra-city parcels (fuel-aware) ─────────────────────
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

module.exports = {
    VEHICLE_RATES,
    VEHICLE_FUEL,
    HELPER_FEE,
    RETURN_TRIP_MULTIPLIER,
    FRAGILE_SURCHARGE,
    FUEL_PRICE_PETROL,
    FUEL_PRICE_DIESEL,
    POWER_TARIFF,
    COMMISSION_RATE,
    CONSOLIDATION_DISCOUNT,
    EXPRESS_PREMIUM,
    MIN_INTRA_CITY,
    MIN_EXPRESS,
    MAINTENANCE_PER_KM,
    DRIVER_BASE_PAY,
    DRIVER_PER_KM,
    PARCEL_TIERS,
    INTERCITY_FLAT_PRICES,
    BULK_SUBCATEGORIES,
    SPECIALIZED_SUBCATEGORIES,
    isSpecializedBulk,
    pickConsolidationTruck,
    GOOGLE_MAPS_KEY,
    SUPPORTED_TOWNS,
    haversineKm,
    findTown,
    isLocationSupported,
    getRouteFromGoogleV2,
    computePrice,
};
