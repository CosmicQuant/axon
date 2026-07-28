// ── Server-side vehicle capability guard ─────────────────────────
// Mirrors the client-side `services/vehicleCapabilities.ts` config so the
// booking flow's constraints can't be bypassed by direct API calls.
// PRICING lives in pricing.js (VEHICLE_RATES) ÃÂ¢ this file only validates
// structural constraints (category/weight/distance/units).
//
// IMPORTANT: keep this in sync with components/booking/constants.ts. Any
// vehicle entry added to one must be added to the other.

// Normalized to kg for cross-vehicle comparison.
const toKg = (value, unit) => {
    if (unit === 'tonnes') return value * 1000;
    if (unit === 'litres') return value * 0.84;        // petrol Ã¢ 0.84 kg/L
    if (unit === 'm3') return value * 1000;            // water Ã¢ 1000 kg/mÂ³
    return value;                                       // kg
};

// Capability map (canonical id Ã¢ capability bundle). Keep in sync with the client.
const VEHICLE_CAPABILITIES = {
    'boda':          { label: 'Boda Boda',         allowedCats: ['A'],     maxWeightKg: 50,     maxDistKm: 65,    weightUnit: 'kg' },
    'tuktuk':        { label: 'Cargo Tuk-Tuk',     allowedCats: ['A'],     maxWeightKg: 500,    maxDistKm: 65,    weightUnit: 'kg' },
    'probox':        { label: 'Probox',            allowedCats: ['A', 'B'], maxWeightKg: 1000,  maxDistKm: 9999,  weightUnit: 'kg' },
    'van':           { label: 'Cargo Van',          allowedCats: ['A', 'B'], maxWeightKg: 1500,  maxDistKm: 9999,  weightUnit: 'kg' },
    'pickup':        { label: 'Pick-up',            allowedCats: ['A', 'B'], maxWeightKg: 2000,  maxDistKm: 9999,  weightUnit: 'kg' },
    'canter':        { label: 'Canter 3T',         allowedCats: ['B'],     maxWeightKg: 3000,  maxDistKm: 9999,  weightUnit: 'kg' },
    'lorry-5t':      { label: 'Lorry 5T',          allowedCats: ['B'],     maxWeightKg: 5000,  maxDistKm: 9999,  weightUnit: 'tonnes' },
    'lorry-7t':      { label: 'Lorry 7T',          allowedCats: ['B'],     maxWeightKg: 7000,  maxDistKm: 9999,  weightUnit: 'tonnes' },
    'lorry-10t':     { label: 'Lorry 10T',        allowedCats: ['B'],     maxWeightKg: 10000, maxDistKm: 9999,  weightUnit: 'tonnes' },
    'lorry-14t':     { label: 'Lorry 14T',        allowedCats: ['B'],     maxWeightKg: 14000, maxDistKm: 9999,  weightUnit: 'tonnes' },
    'tipper-7t':     { label: 'Tipper 7T',        allowedCats: ['B'],     maxWeightKg: 7000,  maxDistKm: 9999,  weightUnit: 'tonnes' },
    'tipper-14t':    { label: 'Tipper 14T',       allowedCats: ['B'],     maxWeightKg: 14000, maxDistKm: 9999,  weightUnit: 'tonnes' },
    'tipper-25t':    { label: 'Tipper 25T',       allowedCats: ['B'],     maxWeightKg: 25000, maxDistKm: 9999,  weightUnit: 'tonnes' },
    'container-20ft': { label: '20ft Container',   allowedCats: ['B'],     maxWeightKg: 18000, maxDistKm: 9999,  weightUnit: 'tonnes' },
    'container-40ft': { label: '40ft Container',   allowedCats: ['B'],     maxWeightKg: 28000, maxDistKm: 9999,  weightUnit: 'tonnes' },
    'lpg-tanker':    { label: 'LPG Tanker',        allowedCats: ['B'],     maxWeightKg: 20000, maxDistKm: 9999,  weightUnit: 'tonnes' },
    'fuel-tanker':   { label: 'Fuel Tanker',       allowedCats: ['B'],     maxWeightKg: 25200, maxDistKm: 9999,  weightUnit: 'litres' }, // 30000L * 0.84
};

// Legacy id shim ÃÂ¢ keep historical orders working.
const LEGACY_ALIASES = {
    'tanker': 'fuel-tanker',
    'lorry': 'lorry-5t',
    'container': 'container-20ft',
    'tipper': 'tipper-7t',
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

// Validate an order against the capability map. quoted inputs use the *server*
// distance (already computed from coords) so this is more accurate than the
// client's _estimate_ call.
// Returns { ok: true } | { ok: false, reason: '...' }
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