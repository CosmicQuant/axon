import { VEHICLES, CARGO_VEHICLE_MAP, VehicleCapability, WeightUnit } from '../components/booking/constants';

// ── Legacy alias map ─────────────────────────────────────────────
// Old orders may carry simplified vehicle ids. Map them to the canonical
// entry so historical data doesn't break the new capability model.
const LEGACY_ALIASES: Record<string, string> = {
    'tanker': 'fuel-tanker-6axle-30kl',          // legacy "tanker" → 30kL semi
    'fuel-tanker': 'fuel-tanker-6axle-30kl',     // old pre-axle taxonomy
    'fuel-tanker-3axle': 'fuel-tanker-3axle-18kl',
    'fuel-tanker-6axle': 'fuel-tanker-6axle-30kl',
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
    'motorbike': 'boda',
    'motorcycle': 'boda',
    'boda boda': 'boda',
    'bodaboda': 'boda',
    'cargo van': 'van',
    'van': 'van',
    'pickup truck': 'pickup',
    'pick-up': 'pickup',
    'tuk-tuk': 'tuktuk',
    'tuk tuk': 'tuktuk',
    'tuktuk': 'tuktuk',
    'auto rickshaw': 'tuktuk',
};

const normalizeVehicleId = (raw: string | undefined | null): string => {
    if (!raw) return '';
    const t = String(raw).toLowerCase().trim();
    return LEGACY_ALIASES[t] || t;
};

// ── Vehicle family (used when a home-screen card locks the user to a family) ─
// Returns the family ID for a vehicle, or the vehicle id itself for singletons.
export const getVehicleFamily = (rawId?: string | null): string | null => {
    const id = normalizeVehicleId(rawId);
    if (!id) return null;
    if (id.startsWith('rigid-truck-') || id.startsWith('semi-truck-') || id === 'canter') return 'truck';
    if (id.startsWith('container-')) return 'container';
    if (id.startsWith('tipper-')) return 'tipper';
    if (id.startsWith('fuel-tanker-')) return 'fuel-tanker';
    if (id.startsWith('lpg-tanker-')) return 'lpg-tanker';
    if (id.startsWith('reefer-')) return 'reefer';
    return id; // singletons: boda, tuktuk, probox, van, pickup
};

// Returns all vehicles belonging to the same family as the given vehicle.
export const getFamilyVehicles = (rawId?: string | null): VehicleCapability[] => {
    const family = getVehicleFamily(rawId);
    if (!family) return [];
    if (family === rawId) return VEHICLES.filter(v => v.id === family); // singleton
    return VEHICLES.filter(v => getVehicleFamily(v.id) === family);
};

// ── Core lookups ─────────────────────────────────────────────────
export const getVehicle = (rawId?: string | null): VehicleCapability | null => {
    if (!rawId) return null;
    const id = normalizeVehicleId(rawId);
    return VEHICLES.find(v => v.id === id) || null;
};

// ── Weight unit display ──────────────────────────────────────────
export const getWeightUnitLabel = (vehicleId?: string | null): string => {
    const v = getVehicle(vehicleId);
    if (!v) return 'kg';
    const u = v.constraints.weightUnit;
    return u === 'litres' ? 'litres' : u === 'm3' ? 'm³' : u;
};

// ── Smart-filter eligibility (Option A) ──────────────────────────
// Returns vehicles that match the chosen category + optional weight cap +
// optional distance cap + cargo subCategory restriction.
export interface EligibilityInputs {
    category?: 'A' | 'B' | string;
    weightKg?: number;     // customer's stated weight (always normalized to kg)
    distanceKm?: number;
    subCategory?: string;
}

// Convert weight in any unit to kg for cross-vehicle comparison.
// Tipper/lorry use tonnes internally; tanker uses litres.
const toKg = (value: number, unit: WeightUnit): number => {
    if (unit === 'tonnes') return value * 1000;
    if (unit === 'litres') return value * 0.84;            // petrol ≈ 0.84 kg/L
    if (unit === 'm3') return value * 1000;                // water ≈ 1000 kg/m³
    return value;                                          // kg
};

export const isEligible = (vehicle: VehicleCapability, inputs: EligibilityInputs): boolean => {
    // Category gate (empty/unknown category = allow all)
    if (inputs.category) {
        const cat = String(inputs.category) as 'A' | 'B';
        if (!vehicle.constraints.allowedCats.includes(cat)) return false;
    }
    // Distance gate
    if (typeof inputs.distanceKm === 'number' && inputs.distanceKm > vehicle.constraints.maxDist) {
        return false;
    }
    // Weight gate — compare normalized kg
    if (typeof inputs.weightKg === 'number' && inputs.weightKg > 0) {
        const vehicleMaxKg = toKg(vehicle.constraints.maxWeight, vehicle.constraints.weightUnit);
        if (inputs.weightKg > vehicleMaxKg) return false;
    }
    // Cargo subCategory restriction (e.g. LPG → only LPG tanker)
    if (inputs.subCategory) {
        const cargoAllowed = CARGO_VEHICLE_MAP[inputs.subCategory];
        if (cargoAllowed && !cargoAllowed.includes(vehicle.id)) return false;
    }
    return true;
};

export const getEligibleVehicles = (inputs: EligibilityInputs): VehicleCapability[] => {
    // Option A: Smart filter — show ONLY matching vehicles, no greyed-out extras.
    return VEHICLES.filter(v => isEligible(v, inputs));
};

// ── Flow gating helpers ──────────────────────────────────────────
export const requiresScheduling = (vehicleId?: string | null): boolean => {
    const v = getVehicle(vehicleId);
    return !!v && !v.constraints.allowAsap;
};

// ── Strict cargo filter (specialized vehicles) ─────────────────
// Returns the subcategory IDs allowed for this vehicle, using the inverted
// CARGO_VEHICLE_MAP. Only vehicles flagged strictCargoFilter use this;
// general vehicles return null (meaning: show the full category list).
export const getStrictSubcategories = (vehicleId?: string | null): string[] | null => {
    const v = getVehicle(vehicleId);
    if (!v || !v.constraints.strictCargoFilter) return null;
    const allowed: string[] = [];
    for (const [subcat, vehicleIds] of Object.entries(CARGO_VEHICLE_MAP)) {
        if (vehicleIds.includes(v.id)) allowed.push(subcat);
    }
    return allowed;
};

// ── Consolidated (Standard shared-truck) allowed? ───────────────
// Heavy/hazmat vehicles are dedicated ÃÂ¢ Standard consolidates parcels in a
// shared truck, which is incompatible. Step3 hides the Standard toggle when
// the chosen vehicle forbids consolidation, locking to Express.
export const allowsConsolidated = (vehicleId?: string | null): boolean => {
    const v = getVehicle(vehicleId);
    if (!v) return true;              // unknown vehicle = allow (default UX)
    return v.constraints.allowConsolidated !== false;
};

// ── Auto-set the category when a vehicle restricts it ────────────
// If the vehicle's allowedCats has exactly one entry, that's the only valid
// category (e.g. tankers → B, boda → A). The Step2 effect uses this to lock
// the category so the subcategory grid matches the vehicle.
export const getForcedCategory = (vehicleId?: string | null): string | null => {
    const v = getVehicle(vehicleId);
    if (!v) return null;
    if (v.constraints.allowedCats.length === 1) return v.constraints.allowedCats[0];
    return null;
};

export const allowsMultiStop = (vehicleId?: string | null): boolean => {
    const v = getVehicle(vehicleId);
    return !!v && v.constraints.maxStops > 1;
};

export const getMaxStops = (vehicleId?: string | null, serviceType?: string): number => {
    // Standard consolidated → single dropoff, always.
    if (serviceType === 'Standard') return 1;
    const v = getVehicle(vehicleId);
    if (!v) return 5; // default to 5 waypoints (preserves prior UX for unknown vehicles)
    return v.constraints.maxStops;
};

export const allowsFragile = (vehicleId?: string | null): boolean => {
    const v = getVehicle(vehicleId);
    return v ? v.constraints.allowFragile : true;
};

export const allowsReturnTrip = (vehicleId?: string | null): boolean => {
    const v = getVehicle(vehicleId);
    return v ? v.constraints.allowReturn : true;
};

export const requiresHelpers = (vehicleId?: string | null): boolean => {
    const v = getVehicle(vehicleId);
    return !!v && v.constraints.requiresHelpers;
};

export const getSuggestedHelpers = (vehicleId?: string | null): number => {
    const v = getVehicle(vehicleId);
    return v?.constraints.suggestedHelpers || 0;
};

export const isHazmat = (vehicleId?: string | null): boolean => {
    const v = getVehicle(vehicleId);
    return !!v && v.constraints.cargoHazardous !== false;
};

export const getHazardClass = (vehicleId?: string | null): string | null => {
    const v = getVehicle(vehicleId);
    const h = v?.constraints.cargoHazardous;
    return h ? String(h) : null;
};

// ── Server-side guard ────────────────────────────────────────────
// Used by quotes.js + orders.js to reject an order whose (vehicle, category,
// weight, distance) combination violates the capability map. Prevents spoofed
// API calls bypassing client UI gates. Mirrors the client logic so any change
// here must be applied identically on the server (copy-paste safe — no React).
export const validateVehicleCapability = (vehicleId: string, inputs: EligibilityInputs): { ok: boolean; reason?: string } => {
    const id = normalizeVehicleId(vehicleId);
    if (id === 'standard') {
        if (inputs.category && inputs.category !== 'A') {
            return { ok: false, reason: 'Standard service is only available for parcel deliveries' };
        }
        return { ok: true };
    }
    const v = getVehicle(vehicleId);
    if (!v) return { ok: false, reason: `Unknown vehicle id: ${vehicleId}` };
    if (!isEligible(v, inputs)) {
        const reasons: string[] = [];
        if (inputs.category && !v.constraints.allowedCats.includes(inputs.category as 'A' | 'B')) {
            reasons.push(`category ${inputs.category} not allowed for ${v.label}`);
        }
        if (typeof inputs.distanceKm === 'number' && inputs.distanceKm > v.constraints.maxDist) {
            reasons.push(`distance ${inputs.distanceKm}km exceeds ${v.label} max ${v.constraints.maxDist}km`);
        }
        if (typeof inputs.weightKg === 'number' && inputs.weightKg > 0) {
            const maxKg = toKg(v.constraints.maxWeight, v.constraints.weightUnit);
            if (inputs.weightKg > maxKg) reasons.push(`weight ${inputs.weightKg}kg exceeds ${v.label} capacity`);
        }
        return { ok: false, reason: reasons.join('; ') || 'vehicle/category/weight mismatch' };
    }
    return { ok: true };
};