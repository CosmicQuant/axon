// ── Server-side vehicle capability guard ─────────────────────────
// Mirrors the client-side `components/booking/constants.ts` config so the
// booking flow's constraints can't be bypassed by direct API calls.
// PRICING lives in pricing.js (VEHICLE_RATES) ÃÂ¢ this file only validates
// structural constraints (category/weight/distance/units).
//
// Taxonomy follows KeNHA / EAC Vehicle Load Control Act: axle-based GVW.
// IMPORTANT: keep this in sync with components/booking/constants.ts.

const toKg = (value, unit) => {
    if (unit === 'tonnes') return value * 1000;
    if (unit === 'litres') return value * 0.84;        // petrol Ã¢ 0.84 kg/L
    if (unit === 'm3') return value * 1000;            // water Ã¢ 1000 kg/mÂ³
    return value;                                       // kg
};

// Capability map (canonical id ÃÂ¢ capability bundle). Keep in sync with the client.
const VEHICLE_CAPABILITIES = {
    'boda':             { label: 'Boda Boda',              allowedCats: ['A'],     maxWeightKg: 50,    maxDistKm: 65,    weightUnit: 'kg' },
    'tuktuk':           { label: 'Cargo Tuk-Tuk',          allowedCats: ['A'],     maxWeightKg: 500,   maxDistKm: 65,    weightUnit: 'kg' },
    'probox':           { label: 'Probox',                 allowedCats: ['A','B'], maxWeightKg: 1000,  maxDistKm: 9999,  weightUnit: 'kg' },
    'van':              { label: 'Cargo Van',              allowedCats: ['A','B'], maxWeightKg: 1500,  maxDistKm: 9999,  weightUnit: 'kg' },
    'pickup':           { label: 'Pick-up',                allowedCats: ['A','B'], maxWeightKg: 2000,  maxDistKm: 9999,  weightUnit: 'kg' },
    'canter':           { label: 'Canter 3T',              allowedCats: ['B'],     maxWeightKg: 3000,  maxDistKm: 9999,  weightUnit: 'tonnes' },
    'rigid-truck-2axle':{ label: 'Truck 18T (2-Axle)',     allowedCats: ['A','B'], maxWeightKg: 18000, maxDistKm: 9999,  weightUnit: 'tonnes' },
    'rigid-truck-3axle':{ label: 'Truck 26T (3-Axle)',     allowedCats: ['B'],     maxWeightKg: 26000, maxDistKm: 9999,  weightUnit: 'tonnes' },
    'rigid-truck-4axle':{ label: 'Truck 30T (4-Axle)',     allowedCats: ['B'],     maxWeightKg: 30000, maxDistKm: 9999,  weightUnit: 'tonnes' },
    'semi-truck-4axle': { label: 'Truck 38T (Semi 4-Axle)', allowedCats: ['B'],     maxWeightKg: 38000, maxDistKm: 9999,  weightUnit: 'tonnes' },
    'semi-truck-5axle': { label: 'Truck 44T (Semi 5-Axle)', allowedCats: ['B'],     maxWeightKg: 44000, maxDistKm: 9999,  weightUnit: 'tonnes' },
    'semi-truck-6axle': { label: 'Truck 50T (Semi 6-Axle)', allowedCats: ['B'],     maxWeightKg: 50000, maxDistKm: 9999,  weightUnit: 'tonnes' },
    'semi-truck-7axle': { label: 'Truck 56T (Max 7-Axle)', allowedCats: ['B'],     maxWeightKg: 56000, maxDistKm: 9999,  weightUnit: 'tonnes' },
    'tipper-2axle':     { label: 'Tipper 18T (2-Axle)',    allowedCats: ['B'],     maxWeightKg: 18000, maxDistKm: 9999,  weightUnit: 'tonnes' },
    'tipper-3axle':     { label: 'Tipper 26T (3-Axle)',    allowedCats: ['B'],     maxWeightKg: 26000, maxDistKm: 9999,  weightUnit: 'tonnes' },
    'tipper-4axle':     { label: 'Tipper 30T (4-Axle)',    allowedCats: ['B'],     maxWeightKg: 30000, maxDistKm: 9999,  weightUnit: 'tonnes' },
    'container-5axle':  { label: 'Container Truck 44T (5-Axle)', allowedCats: ['B'], maxWeightKg: 34000, maxDistKm: 9999, weightUnit: 'tonnes' },
    'container-6axle':  { label: 'Container Truck 50T (6-Axle)', allowedCats: ['B'], maxWeightKg: 34000, maxDistKm: 9999, weightUnit: 'tonnes' },
    'container-7axle':  { label: 'Container Truck 56T (7-Axle)', allowedCats: ['B'], maxWeightKg: 34000, maxDistKm: 9999, weightUnit: 'tonnes' },
    'lpg-tanker-6axle': { label: 'LPG Tanker 50T (6-Axle)', allowedCats: ['B'],     maxWeightKg: 24000, maxDistKm: 9999, weightUnit: 'tonnes' },
    'fuel-tanker-3axle':{ label: 'Fuel Tanker 26T (3-Axle, Rigid)', allowedCats: ['B'], maxWeightKg: 15120, maxDistKm: 9999, weightUnit: 'litres' }, // 18000L * 0.84
    'fuel-tanker-6axle':{ label: 'Fuel Tanker 50T (6-Axle, Semi)', allowedCats: ['B'], maxWeightKg: 35280, maxDistKm: 9999, weightUnit: 'litres' }, // 42000L * 0.84
};

// Legacy id shim ÃÂ¢ keep historical orders working.
const LEGACY_ALIASES = {
    'tanker': 'fuel-tanker-6axle',
    'fuel-tanker': 'fuel-tanker-6axle',
    'lpg-tanker': 'lpg-tanker-6axle',
    'lorry': 'rigid-truck-3axle',
    'lorry-5t': 'rigid-truck-3axle',
    'lorry-7t': 'rigid-truck-3axle',
    'lorry-10t': 'rigid-truck-4axle',
    'lorry-14t': 'rigid-truck-4axle',
    'container': 'container-5axle',
    'container-20ft': 'container-5axle',
    'container-40ft': 'container-6axle',
    'tipper': 'tipper-3axle',
    'tipper-7t': 'tipper-2axle',
    'tipper-14t': 'tipper-3axle',
    'tipper-25t': 'tipper-4axle',
    'motorbike': 'boda', 'motorcycle': 'boda', 'boda boda': 'boda', 'bodaboda': 'boda',
    'cargo van': 'van', 'van': 'van',
    'pickup truck': 'pickup', 'pick-up': 'pickup',
    'tuk-tuk': 'tuktuk', 'tuk tuk': 'tuktuk', 'tuktuk': 'tuktuk', 'auto rickshaw': 'tuktuk',
};

const normalizeVehicleId = (raw) => {
    if (!raw) return '';
    const t = String(raw).toLowerCase().trim();
    return LEGACY_ALIASES[t] || t;
};

function validateVehicleCapability({ vehicle, category, distanceKm, subCategory }) {
    const id = normalizeVehicleId(vehicle);
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
    return reasons.length
        ? { ok: false, reason: reasons.join('; ') }
        : { ok: true };
}

module.exports = { VEHICLE_CAPABILITIES, validateVehicleCapability, normalizeVehicleId };