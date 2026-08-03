// ── Server-side vehicle capability guard ─────────────────────────
// Mirrors the client-side `components/booking/constants.ts` config so the
// booking flow's constraints can't be bypassed by direct API calls.
// PRICING lives in pricing.js (VEHICLE_RATES) — this file only validates
// structural constraints (category/weight/distance/units).
//
// Taxonomy = market payload tiers (per Kenya market research). Legacy axle
// ids are aliased so historical orders keep resolving.
// IMPORTANT: keep this in sync with components/booking/constants.ts.

const toKg = (value, unit) => {
    if (unit === 'tonnes') return value * 1000;
    if (unit === 'litres') return value * 0.84;        // petrol ≈ 0.84 kg/L
    if (unit === 'm3') return value * 1000;            // water ≈ 1000 kg/m³
    return value;                                       // kg
};

// Specialised cargo → requires a dedicated vehicle. Mirrors pricing.js
// SPECIALIZED_SUBCATEGORIES. Defined inline (no circular require) to keep
// capabilities.js dependency-free.
const SPECIALIZED_SUBCATEGORIES = [
    'Loose Aggregate',
    'LPG / Gas (Bulk)',
    'Petroleum / Oil',
    'Perishables / Cold Chain',
];
const isSpecializedBulk = (sub) => SPECIALIZED_SUBCATEGORIES.includes(sub);

// Capability map (canonical id → capability bundle). Keep in sync with the
// client constants.ts. Payload tiers replace the old axle-based taxonomy; legacy
// ids are aliased in LEGACY_ALIASES so historical orders still resolve.
const VEHICLE_CAPABILITIES = {
    // Light express singletons
    'boda':   { label: 'Boda Boda',     allowedCats: ['A'],     maxWeightKg: 50,   maxDistKm: 65,  weightUnit: 'kg' },
    'tuktuk': { label: 'Cargo Tuk-Tuk', allowedCats: ['A'],     maxWeightKg: 500,  maxDistKm: 65,  weightUnit: 'kg' },
    'probox': { label: 'Probox',        allowedCats: ['A','B'], maxWeightKg: 1000, maxDistKm: 9999, weightUnit: 'kg' },
    'van':    { label: 'Cargo Van',     allowedCats: ['A','B'], maxWeightKg: 1500, maxDistKm: 9999, weightUnit: 'kg' },
    'van-1t': { label: 'Van <1T',       allowedCats: ['A','B'], maxWeightKg: 1000, maxDistKm: 9999, weightUnit: 'kg' },
    'van-3t': { label: 'Van 1-3T',      allowedCats: ['A','B'], maxWeightKg: 3000, maxDistKm: 9999, weightUnit: 'kg' },
    'pickup': { label: 'Pickup',        allowedCats: ['A','B'], maxWeightKg: 2000, maxDistKm: 9999, weightUnit: 'kg' },
    // Truck payload tiers
    'truck-3t':  { label: 'Truck 3T',  allowedCats: ['A','B'], maxWeightKg: 3000,  maxDistKm: 9999, weightUnit: 'tonnes' },
    'truck-5t':  { label: 'Truck 5T',  allowedCats: ['B'],     maxWeightKg: 5000,  maxDistKm: 9999, weightUnit: 'tonnes' },
    'truck-7t':  { label: 'Truck 7T',  allowedCats: ['B'],     maxWeightKg: 7000,  maxDistKm: 9999, weightUnit: 'tonnes' },
    'truck-10t': { label: 'Truck 10T', allowedCats: ['B'],     maxWeightKg: 10000, maxDistKm: 9999, weightUnit: 'tonnes' },
    'truck-15t': { label: 'Truck 15T', allowedCats: ['B'],     maxWeightKg: 15000, maxDistKm: 9999, weightUnit: 'tonnes' },
    // Trailer (was Container) — 20ft / 40ft
    'trailer-20ft': { label: 'Trailer 20ft', allowedCats: ['B'], maxWeightKg: 25000, maxDistKm: 9999, weightUnit: 'tonnes' },
    'trailer-40ft': { label: 'Trailer 40ft', allowedCats: ['B'], maxWeightKg: 34000, maxDistKm: 9999, weightUnit: 'tonnes' },
    // Tippers
    'tipper-7t':  { label: 'Tipper 7T',  allowedCats: ['B'], maxWeightKg: 7000,  maxDistKm: 9999, weightUnit: 'tonnes' },
    'tipper-14t': { label: 'Tipper 14T', allowedCats: ['B'], maxWeightKg: 14000, maxDistKm: 9999, weightUnit: 'tonnes' },
    'tipper-25t': { label: 'Tipper 25T', allowedCats: ['B'], maxWeightKg: 25000, maxDistKm: 9999, weightUnit: 'tonnes' },
    // Hazmat tankers
    'lpg-tanker':       { label: 'LPG Tanker',          allowedCats: ['B'], maxWeightKg: 24000, maxDistKm: 9999, weightUnit: 'tonnes' },
    'fuel-tanker-10kl': { label: 'Fuel Tanker 10,000L', allowedCats: ['B'], maxWeightKg: 8400,  maxDistKm: 9999, weightUnit: 'litres' },
    'fuel-tanker-18kl': { label: 'Fuel Tanker 18,000L', allowedCats: ['B'], maxWeightKg: 15120, maxDistKm: 9999, weightUnit: 'litres' },
    'fuel-tanker-30kl': { label: 'Fuel Tanker 30,000L', allowedCats: ['B'], maxWeightKg: 25200, maxDistKm: 9999, weightUnit: 'litres' },
    // Reefers (3 tiers)
    'reefer-van':       { label: 'Reefer Van (<2T)', allowedCats: ['A','B'], maxWeightKg: 1500,  maxDistKm: 9999, weightUnit: 'kg' },
    'reefer-truck-3t':  { label: 'Reefer Truck 3T',  allowedCats: ['A','B'], maxWeightKg: 4000,  maxDistKm: 9999, weightUnit: 'tonnes' },
    'reefer-truck-10t': { label: 'Reefer Truck 10T',  allowedCats: ['B'],     maxWeightKg: 10000, maxDistKm: 9999, weightUnit: 'tonnes' },
};

// Legacy id → canonical id. Keep historical orders working under the new
// payload-tier taxonomy. Mirrors constants.ts LEGACY_VEHICLE_ALIASES.
const LEGACY_ALIASES = {
    'boda boda': 'boda', 'bodaboda': 'boda', 'motorbike': 'boda', 'motorcycle': 'boda',
    'tuk-tuk': 'tuktuk', 'tuk tuk': 'tuktuk', 'auto rickshaw': 'tuktuk',
    'cargo van': 'van',
    'pickup truck': 'pickup', 'pick-up': 'pickup',
    'canter': 'truck-3t',
    'lorry': 'truck-7t', 'lorry-5t': 'truck-5t', 'lorry-7t': 'truck-7t',
    'lorry-10t': 'truck-10t', 'lorry-14t': 'truck-15t',
    'rigid-truck-2axle': 'truck-10t', 'rigid-truck-3axle': 'truck-15t', 'rigid-truck-4axle': 'truck-15t',
    'semi-truck-4axle': 'trailer-40ft', 'semi-truck-5axle': 'trailer-40ft',
    'semi-truck-6axle': 'trailer-40ft', 'semi-truck-7axle': 'trailer-40ft',
    'container': 'trailer-20ft', 'container-20ft': 'trailer-20ft', 'container-40ft': 'trailer-40ft',
    'container-5axle': 'trailer-20ft', 'container-6axle': 'trailer-40ft', 'container-7axle': 'trailer-40ft',
    'tipper': 'tipper-14t', 'tipper-2axle': 'tipper-14t', 'tipper-3axle': 'tipper-25t', 'tipper-4axle': 'tipper-25t',
    'lpg-tanker-6axle': 'lpg-tanker',
    'fuel-tanker': 'fuel-tanker-18kl', 'tanker': 'fuel-tanker-18kl',
    'fuel-tanker-2axle-10kl': 'fuel-tanker-10kl', 'fuel-tanker-3axle-18kl': 'fuel-tanker-18kl',
    'fuel-tanker-4axle-20kl': 'fuel-tanker-18kl', 'fuel-tanker-6axle-30kl': 'fuel-tanker-30kl',
    'fuel-tanker-3axle': 'fuel-tanker-18kl', 'fuel-tanker-6axle': 'fuel-tanker-30kl',
    'reefer-truck-3axle': 'reefer-truck-10t', 'reefer-semi-6axle': 'reefer-truck-10t',
    'trailer': 'trailer-40ft',
};

const normalizeVehicleId = (raw) => {
    if (!raw) return '';
    const t = String(raw).toLowerCase().trim();
    return LEGACY_ALIASES[t] || t;
};

// Family map derived from the canonical ids (mirrors client getVehicleFamily).
const VEHICLE_FAMILY = {
    'boda': 'boda', 'tuktuk': 'boda', 'probox': 'probox',
    'van': 'van', 'van-1t': 'van', 'van-3t': 'van', 'pickup': 'pickup',
    'truck-3t': 'truck', 'truck-5t': 'truck', 'truck-7t': 'truck', 'truck-10t': 'truck', 'truck-15t': 'truck',
    'trailer-20ft': 'trailer', 'trailer-40ft': 'trailer',
    'tipper-7t': 'tipper', 'tipper-14t': 'tipper', 'tipper-25t': 'tipper',
    'lpg-tanker': 'lpg-tanker',
    'fuel-tanker-10kl': 'fuel-tanker', 'fuel-tanker-18kl': 'fuel-tanker', 'fuel-tanker-30kl': 'fuel-tanker',
    'reefer-van': 'reefer', 'reefer-truck-3t': 'reefer', 'reefer-truck-10t': 'reefer',
};

const getVehicleFamily = (raw) => {
    const id = normalizeVehicleId(raw);
    return VEHICLE_FAMILY[id] || id;
};

// Payload tier ranges (tonnes) for matching driver-declared payload capacity.
const VEHICLE_PAYLOAD_TONNES = {
    'boda': [0.01, 0.05], 'tuktuk': [0.05, 0.5], 'probox': [0.5, 1],
    'van': [1, 1.5], 'van-1t': [0.5, 1], 'van-3t': [1, 3], 'pickup': [1, 2],
    'truck-3t': [2, 3.5], 'truck-5t': [4, 5.5], 'truck-7t': [6, 9], 'truck-10t': [10, 13], 'truck-15t': [14, 18],
    'trailer-20ft': [20, 25], 'trailer-40ft': [26, 34],
    'tipper-7t': [5, 8], 'tipper-14t': [10, 14], 'tipper-25t': [18, 25],
    'lpg-tanker': [20, 25],
    'reefer-van': [0.5, 2], 'reefer-truck-3t': [2, 4], 'reefer-truck-10t': [8, 12],
};

// ── Driver ↔ order matching (payload-aware) ──────────────────────
// A driver declares their real vehicle spec at onboarding (payloadTonnes etc.).
// A customer's order has a canonical vehicle tier. A driver matches when:
//   1. families match (order tier family === driver vehicleType family), AND
//   2. the driver's declared payload covers the order tier's upper bound.
// Drivers without declared payload fall back to exact-id/legacy-id match.
const matchesDriverVehicle = (orderVehicleId, driver) => {
    const id = normalizeVehicleId(orderVehicleId);
    if (id === 'standard') {
        const fam = getVehicleFamily(driver && driver.vehicleType);
        return ['boda', 'tuktuk', 'probox', 'van', 'pickup'].includes(fam);
    }
    const orderFamily = getVehicleFamily(id);
    const driverFamily = getVehicleFamily(driver && driver.vehicleType);
    if (orderFamily !== driverFamily) return false;
    const tier = VEHICLE_PAYLOAD_TONNES[id];
    if (tier && driver && typeof driver.payloadTonnes === 'number' && driver.payloadTonnes > 0) {
        const tierMax = tier[1];
        if (driver.payloadTonnes < tierMax) return false;
    }
    return true;
};

function validateVehicleCapability({ vehicle, category, distanceKm, subCategory, payloadWeight, payloadWeightUnit }) {
    const id = normalizeVehicleId(vehicle);
    // 'standard' is a service-level pseudo-vehicle for Standard Consolidated.
    // It now covers both intra-city parcel batching (Cat A) and LTL bulk
    // consolidation (general Cat B bulky: Electronics, Appliances, Furniture,
    // Agricultural, Hardware/Construction) — the pricing engine
    // (pricing.computePrice) auto-selects an LTL truck tier by weight.
    // Specialised cargo (aggregate / LPG / petroleum / cold chain) requires a
    // dedicated vehicle → reject here so the UI forces Express.
    if (id === 'standard') {
        if (isSpecializedBulk(subCategory)) {
            return { ok: false, reason: `This cargo needs a dedicated vehicle — use Express instead of Standard.` };
        }
        return { ok: true };
    }
    const cap = VEHICLE_CAPABILITIES[id];
    if (!cap) {
        return { ok: false, reason: `Unsupported vehicle: ${vehicle}` };
    }
    const reasons = [];
    if (category && !cap.allowedCats.includes(String(category))) {
        reasons.push(`category ${category} not allowed for ${cap.label}`);
    }
    if (typeof distanceKm === 'number' && distanceKm > cap.maxDistKm) {
        reasons.push(`distance ${distanceKm}km exceeds ${cap.label} max ${cap.maxDistKm}km`);
    }
    if (typeof payloadWeight === 'number' && payloadWeight > 0 && cap.maxWeightKg) {
        const payloadKg = toKg(payloadWeight, payloadWeightUnit || cap.weightUnit);
        if (payloadKg > cap.maxWeightKg) {
            reasons.push(`payload ${payloadWeight}${payloadWeightUnit || cap.weightUnit} exceeds ${cap.label} capacity (${cap.maxWeightKg}kg)`);
        }
    }
    return reasons.length
        ? { ok: false, reason: reasons.join('; ') }
        : { ok: true };
}

module.exports = {
    VEHICLE_CAPABILITIES,
    validateVehicleCapability,
    normalizeVehicleId,
    getVehicleFamily,
    matchesDriverVehicle,
    isSpecializedBulk,
    SPECIALIZED_SUBCATEGORIES,
};