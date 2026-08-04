/* ── Capability-driven vehicle config ────────────────────────────
   Single source of truth for booking-flow gating.
   Real PRICING lives server-side in functions/lib/pricing.js (VEHICLE_RATES).
   The `pricePerKm` here is informational only (used nowhere for billing).

   Taxonomy = market payload tiers (per Kenya market research), NOT axle counts.
   Heavy variants are sized by what the customer cares about (tonnage / container
   size / tank capacity), so the grid reads like a rental catalogue.
   Drivers still capture their actual GVW / payload / tare / axle weights during
   onboarding; matching uses the family + declared payload range (see services/
   vehicleCapabilities.ts `matchesDriverVehicle`). */

export type WeightUnit = 'kg' | 'tonnes' | 'litres' | 'm3';
export type HazardClass = false | 'Class2' | 'Class3' | 'Class9';
export type VehicleTier = 'light' | 'medium' | 'heavy' | 'hazmat';

export interface VehicleCapability {
    id: string;
    label: string;
    img: string;
    accentText: string;     // tailwind text-* class
    accentBg: string;       // tailwind bg-* class
    accentBgLight: string;  // tailwind bg-*-50 class
    pricePerKm: number;     // informational only
    tier: VehicleTier;
    /** Vehicle family — groups size variants shown together when a home card
     *  locks the user to a family (e.g. Truck → all tonnage tiers). */
    family: string;
    /** Payload range (tonnes) used to match a customer's chosen tier against a
     *  driver's declared payload capacity. Light singletons use their own id. */
    payloadTonnes?: [number, number];
    constraints: {
        maxDist: number;                 // km; 9999 = unlimited
        maxWeight: number;               // in weightUnit
        maxStops: number;                // 1 = single dropoff
        allowedCats: string[];
        weightUnit: WeightUnit;          // input + display unit
        allowFragile: boolean;
        allowReturn: boolean;
        allowAsap: boolean;              // heavy/hazmat → false (scheduled only)
        allowScheduled: boolean;
        requiresHelpers: boolean;       // mandatory helpers
        suggestedHelpers: number;        // auto-preselection (editable)
        cargoHazardous: HazardClass;     // none | gas | flammable | misc
        // Strict cargo filtering: specialized vehicles (tippers, tankers) only
        // carry specific cargo types. Step 2 will only show subcategories whose
        // CARGO_VEHICLE_MAP entry explicitly lists this vehicle id. Also forces
        // the category to the vehicle's only allowed category (no default 'A').
        strictCargoFilter?: boolean;
        // Consolidated (Standard shared-truck) allowed? Heavy/hazmat vehicles
        // are dedicated → false. The Service-type toggle hides Standard when
        // the chosen vehicle forbids consolidation.
        allowConsolidated?: boolean; // default true if omitted
    };
}

const UNLIMITED = 9999;

export const VEHICLES: VehicleCapability[] = [
    // ── Light express singletons (no size variants → Step 3 auto-advances) ──
    {
        id: 'boda', label: 'Boda Boda', img: '/icons3d/motorcycle.png',
        accentText: 'text-orange-500', accentBg: 'bg-orange-500', accentBgLight: 'bg-orange-50',
        pricePerKm: 25, tier: 'light', family: 'boda', payloadTonnes: [0.01, 0.05],
        constraints: { maxDist: 65, maxWeight: 50, maxStops: 2, allowedCats: ['A'],
            weightUnit: 'kg', allowFragile: false, allowReturn: true,
            allowAsap: true, allowScheduled: true, requiresHelpers: false, suggestedHelpers: 0,
            cargoHazardous: false },
    },
    {
        id: 'probox', label: 'Probox', img: '/icons3d/automobile.png',
        accentText: 'text-violet-500', accentBg: 'bg-violet-500', accentBgLight: 'bg-violet-50',
        pricePerKm: 55, tier: 'medium', family: 'probox', payloadTonnes: [0.5, 1],
        constraints: { maxDist: UNLIMITED, maxWeight: 1000, maxStops: 5, allowedCats: ['A', 'B'],
            weightUnit: 'kg', allowFragile: true, allowReturn: true,
            allowAsap: true, allowScheduled: true, requiresHelpers: false, suggestedHelpers: 0,
            cargoHazardous: false },
    },
    // Van family — two payload tiers (legacy single van is split here).
    {
        id: 'van-1t', label: 'Van <1T', img: '/icons3d/minibus.png',
        accentText: 'text-sky-500', accentBg: 'bg-sky-500', accentBgLight: 'bg-sky-50',
        pricePerKm: 75, tier: 'medium', family: 'van', payloadTonnes: [0.5, 1],
        constraints: { maxDist: UNLIMITED, maxWeight: 1000, maxStops: 5, allowedCats: ['A', 'B'],
            weightUnit: 'kg', allowFragile: true, allowReturn: true,
            allowAsap: true, allowScheduled: true, requiresHelpers: false, suggestedHelpers: 0,
            cargoHazardous: false },
    },
    {
        id: 'van-3t', label: 'Van 3T (1-3T)', img: '/icons3d/delivery_truck.png',
        accentText: 'text-sky-600', accentBg: 'bg-sky-600', accentBgLight: 'bg-sky-100',
        pricePerKm: 95, tier: 'medium', family: 'van', payloadTonnes: [1, 3],
        constraints: { maxDist: UNLIMITED, maxWeight: 3000, maxStops: 5, allowedCats: ['A', 'B'],
            weightUnit: 'kg', allowFragile: true, allowReturn: true,
            allowAsap: true, allowScheduled: true, requiresHelpers: false, suggestedHelpers: 0,
            cargoHazardous: false },
    },
    {
        id: 'pickup', label: 'Pickup', img: '/icons3d/pickup_truck.png',
        accentText: 'text-teal-500', accentBg: 'bg-teal-500', accentBgLight: 'bg-teal-50',
        pricePerKm: 85, tier: 'medium', family: 'pickup', payloadTonnes: [1, 2],
        constraints: { maxDist: UNLIMITED, maxWeight: 2000, maxStops: 5, allowedCats: ['A', 'B'],
            weightUnit: 'kg', allowFragile: false, allowReturn: true,
            allowAsap: true, allowScheduled: true, requiresHelpers: false, suggestedHelpers: 0,
            cargoHazardous: false },
    },

    // ── Truck family — payload tiers (Kenya market: Canter → FVZ) ──────
    {
        id: 'truck-3t', label: 'Truck 3T', img: '/icons3d/delivery_truck.png',
        accentText: 'text-teal-600', accentBg: 'bg-teal-600', accentBgLight: 'bg-teal-50',
        pricePerKm: 110, tier: 'medium', family: 'truck', payloadTonnes: [2, 3.5],
        constraints: { maxDist: UNLIMITED, maxWeight: 3, maxStops: 5, allowedCats: ['A', 'B'],
            weightUnit: 'tonnes', allowFragile: true, allowReturn: true,
            allowAsap: true, allowScheduled: true, requiresHelpers: false, suggestedHelpers: 0,
            cargoHazardous: false },
    },
    {
        id: 'truck-5t', label: 'Truck 5T', img: '/icons3d/delivery_truck.png',
        accentText: 'text-teal-700', accentBg: 'bg-teal-700', accentBgLight: 'bg-teal-50',
        pricePerKm: 130, tier: 'medium', family: 'truck', payloadTonnes: [4, 5.5],
        constraints: { maxDist: UNLIMITED, maxWeight: 5, maxStops: 5, allowedCats: ['B'],
            weightUnit: 'tonnes', allowFragile: true, allowReturn: true,
            allowAsap: true, allowScheduled: true, requiresHelpers: false, suggestedHelpers: 1,
            cargoHazardous: false },
    },
    {
        id: 'truck-7t', label: 'Truck 7T', img: '/icons3d/delivery_truck.png',
        accentText: 'text-slate-500', accentBg: 'bg-slate-500', accentBgLight: 'bg-slate-50',
        pricePerKm: 155, tier: 'heavy', family: 'truck', payloadTonnes: [6, 9],
        constraints: { maxDist: UNLIMITED, maxWeight: 7, maxStops: 5, allowedCats: ['B'],
            weightUnit: 'tonnes', allowFragile: true, allowReturn: true,
            allowAsap: true, allowScheduled: true, requiresHelpers: true, suggestedHelpers: 1,
            cargoHazardous: false, allowConsolidated: false },
    },
    {
        id: 'truck-10t', label: 'Truck 10T', img: '/icons3d/articulated_lorry.png',
        accentText: 'text-slate-600', accentBg: 'bg-slate-600', accentBgLight: 'bg-slate-50',
        pricePerKm: 180, tier: 'heavy', family: 'truck', payloadTonnes: [10, 13],
        constraints: { maxDist: UNLIMITED, maxWeight: 10, maxStops: 5, allowedCats: ['B'],
            weightUnit: 'tonnes', allowFragile: true, allowReturn: true,
            allowAsap: false, allowScheduled: true, requiresHelpers: true, suggestedHelpers: 2,
            cargoHazardous: false, allowConsolidated: false },
    },
    {
        id: 'truck-15t', label: 'Truck 15T', img: '/icons3d/articulated_lorry.png',
        accentText: 'text-slate-700', accentBg: 'bg-slate-700', accentBgLight: 'bg-slate-100',
        pricePerKm: 210, tier: 'heavy', family: 'truck', payloadTonnes: [14, 18],
        constraints: { maxDist: UNLIMITED, maxWeight: 15, maxStops: 3, allowedCats: ['B'],
            weightUnit: 'tonnes', allowFragile: true, allowReturn: true,
            allowAsap: false, allowScheduled: true, requiresHelpers: true, suggestedHelpers: 2,
            cargoHazardous: false, allowConsolidated: false },
    },

    // ── Trailer family (was "Container") — 20ft / 40ft semi-trailers ──
    {
        id: 'trailer-20ft', label: 'Trailer 20ft', img: '/icons3d/container_truck.svg',
        accentText: 'text-blue-600', accentBg: 'bg-blue-600', accentBgLight: 'bg-blue-50',
        pricePerKm: 230, tier: 'heavy', family: 'trailer', payloadTonnes: [20, 25],
        constraints: { maxDist: UNLIMITED, maxWeight: 25, maxStops: 3, allowedCats: ['B'],
            weightUnit: 'tonnes', allowFragile: true, allowReturn: true,
            allowAsap: false, allowScheduled: true, requiresHelpers: true, suggestedHelpers: 3,
            cargoHazardous: false, strictCargoFilter: true, allowConsolidated: false },
    },
    {
        id: 'trailer-40ft', label: 'Trailer 40ft', img: '/icons3d/container_truck.svg',
        accentText: 'text-blue-700', accentBg: 'bg-blue-700', accentBgLight: 'bg-blue-100',
        pricePerKm: 270, tier: 'heavy', family: 'trailer', payloadTonnes: [26, 34],
        constraints: { maxDist: UNLIMITED, maxWeight: 34, maxStops: 3, allowedCats: ['B'],
            weightUnit: 'tonnes', allowFragile: true, allowReturn: true,
            allowAsap: false, allowScheduled: true, requiresHelpers: true, suggestedHelpers: 3,
            cargoHazardous: false, strictCargoFilter: true, allowConsolidated: false },
    },

    // ── Tipper family — payload tiers, strict loose-aggregate cargo ────
    {
        id: 'tipper-7t', label: 'Tipper 7T', img: '/icons3d/tipper_truck.svg',
        accentText: 'text-amber-600', accentBg: 'bg-amber-600', accentBgLight: 'bg-amber-50',
        pricePerKm: 140, tier: 'heavy', family: 'tipper', payloadTonnes: [5, 8],
        constraints: { maxDist: UNLIMITED, maxWeight: 7, maxStops: 1, allowedCats: ['B'],
            weightUnit: 'tonnes', allowFragile: false, allowReturn: true,
            allowAsap: false, allowScheduled: true, requiresHelpers: true, suggestedHelpers: 2,
            cargoHazardous: false, strictCargoFilter: true, allowConsolidated: false },
    },
    {
        id: 'tipper-14t', label: 'Tipper 14T', img: '/icons3d/tipper_truck.svg',
        accentText: 'text-amber-700', accentBg: 'bg-amber-700', accentBgLight: 'bg-amber-50',
        pricePerKm: 170, tier: 'heavy', family: 'tipper', payloadTonnes: [10, 14],
        constraints: { maxDist: UNLIMITED, maxWeight: 14, maxStops: 1, allowedCats: ['B'],
            weightUnit: 'tonnes', allowFragile: false, allowReturn: true,
            allowAsap: false, allowScheduled: true, requiresHelpers: true, suggestedHelpers: 2,
            cargoHazardous: false, strictCargoFilter: true, allowConsolidated: false },
    },
    {
        id: 'tipper-25t', label: 'Tipper 25T', img: '/icons3d/tipper_truck.svg',
        accentText: 'text-amber-800', accentBg: 'bg-amber-800', accentBgLight: 'bg-amber-100',
        pricePerKm: 200, tier: 'heavy', family: 'tipper', payloadTonnes: [18, 25],
        constraints: { maxDist: UNLIMITED, maxWeight: 25, maxStops: 1, allowedCats: ['B'],
            weightUnit: 'tonnes', allowFragile: false, allowReturn: true,
            allowAsap: false, allowScheduled: true, requiresHelpers: true, suggestedHelpers: 3,
            cargoHazardous: false, strictCargoFilter: true, allowConsolidated: false },
    },

    // ── Hazmat tankers — capacity-graded (litres), strict cargo ──────
    {
        id: 'lpg-tanker', label: 'LPG Tanker', img: '/icons3d/tanker_truck.svg',
        accentText: 'text-sky-600', accentBg: 'bg-sky-600', accentBgLight: 'bg-sky-50',
        pricePerKm: 240, tier: 'hazmat', family: 'lpg-tanker', payloadTonnes: [20, 25],
        constraints: { maxDist: UNLIMITED, maxWeight: 24, maxStops: 1, allowedCats: ['B'],
            weightUnit: 'tonnes', allowFragile: false, allowReturn: true,
            allowAsap: false, allowScheduled: true, requiresHelpers: true, suggestedHelpers: 3,
            cargoHazardous: 'Class2', strictCargoFilter: true, allowConsolidated: false },
    },
    {
        id: 'fuel-tanker-10kl', label: 'Fuel Tanker 10,000L', img: '/icons3d/tanker_truck.svg',
        accentText: 'text-red-400', accentBg: 'bg-red-400', accentBgLight: 'bg-red-50',
        pricePerKm: 180, tier: 'hazmat', family: 'fuel-tanker',
        constraints: { maxDist: UNLIMITED, maxWeight: 10000, maxStops: 1, allowedCats: ['B'],
            weightUnit: 'litres', allowFragile: false, allowReturn: true,
            allowAsap: false, allowScheduled: true, requiresHelpers: true, suggestedHelpers: 2,
            cargoHazardous: 'Class3', strictCargoFilter: true, allowConsolidated: false },
    },
    {
        id: 'fuel-tanker-18kl', label: 'Fuel Tanker 18,000L', img: '/icons3d/tanker_truck.svg',
        accentText: 'text-red-500', accentBg: 'bg-red-500', accentBgLight: 'bg-red-50',
        pricePerKm: 200, tier: 'hazmat', family: 'fuel-tanker',
        constraints: { maxDist: UNLIMITED, maxWeight: 18000, maxStops: 1, allowedCats: ['B'],
            weightUnit: 'litres', allowFragile: false, allowReturn: true,
            allowAsap: false, allowScheduled: true, requiresHelpers: true, suggestedHelpers: 2,
            cargoHazardous: 'Class3', strictCargoFilter: true, allowConsolidated: false },
    },
    {
        id: 'fuel-tanker-30kl', label: 'Fuel Tanker 30,000L', img: '/icons3d/tanker_truck.svg',
        accentText: 'text-red-700', accentBg: 'bg-red-700', accentBgLight: 'bg-red-50',
        pricePerKm: 260, tier: 'hazmat', family: 'fuel-tanker',
        constraints: { maxDist: UNLIMITED, maxWeight: 30000, maxStops: 1, allowedCats: ['B'],
            weightUnit: 'litres', allowFragile: false, allowReturn: true,
            allowAsap: false, allowScheduled: true, requiresHelpers: true, suggestedHelpers: 3,
            cargoHazardous: 'Class3', strictCargoFilter: true, allowConsolidated: false },
    },

    // ── Reefer family — refrigerated, 3 payload tiers ────────────────
    {
        id: 'reefer-van', label: 'Reefer Van (<2T)', img: '/icons3d/delivery_truck.png',
        accentText: 'text-cyan-500', accentBg: 'bg-cyan-500', accentBgLight: 'bg-cyan-50',
        pricePerKm: 95, tier: 'medium', family: 'reefer', payloadTonnes: [0.5, 2],
        constraints: { maxDist: UNLIMITED, maxWeight: 1500, maxStops: 5, allowedCats: ['A', 'B'],
            weightUnit: 'kg', allowFragile: true, allowReturn: true,
            allowAsap: true, allowScheduled: true, requiresHelpers: false, suggestedHelpers: 0,
            cargoHazardous: false, allowConsolidated: false, strictCargoFilter: true },
    },
    {
        id: 'reefer-truck-3t', label: 'Reefer Truck 3T (2-4T)', img: '/icons3d/delivery_truck.png',
        accentText: 'text-cyan-600', accentBg: 'bg-cyan-600', accentBgLight: 'bg-cyan-50',
        pricePerKm: 165, tier: 'medium', family: 'reefer', payloadTonnes: [2, 4],
        constraints: { maxDist: UNLIMITED, maxWeight: 4, maxStops: 5, allowedCats: ['A', 'B'],
            weightUnit: 'tonnes', allowFragile: true, allowReturn: true,
            allowAsap: true, allowScheduled: true, requiresHelpers: true, suggestedHelpers: 1,
            cargoHazardous: false, allowConsolidated: false, strictCargoFilter: true },
    },
    {
        id: 'reefer-truck-10t', label: 'Reefer Truck 10T', img: '/icons3d/articulated_lorry.png',
        accentText: 'text-cyan-700', accentBg: 'bg-cyan-700', accentBgLight: 'bg-cyan-100',
        pricePerKm: 210, tier: 'heavy', family: 'reefer', payloadTonnes: [8, 12],
        constraints: { maxDist: UNLIMITED, maxWeight: 10, maxStops: 3, allowedCats: ['B'],
            weightUnit: 'tonnes', allowFragile: true, allowReturn: true,
            allowAsap: false, allowScheduled: true, requiresHelpers: true, suggestedHelpers: 2,
            cargoHazardous: false, allowConsolidated: false, strictCargoFilter: true },
    },
];

/* ── Cargo → Vehicle eligibility map ────────────────────────────
    Maps each subCategory to the vehicle IDs it can use.
    If a subCategory is NOT listed, all category-eligible vehicles are shown. */
export const CARGO_VEHICLE_MAP: Record<string, string[]> = {
    'Electronics': ['probox', 'van', 'pickup', 'truck-3t', 'truck-5t', 'truck-7t', 'truck-10t', 'trailer-20ft', 'trailer-40ft'],
    'Large Appliances': ['van', 'pickup', 'truck-3t', 'truck-5t', 'truck-7t', 'truck-10t', 'truck-15t', 'trailer-20ft', 'trailer-40ft'],
    'Furniture': ['van', 'pickup', 'truck-3t', 'truck-5t', 'truck-7t', 'truck-10t', 'truck-15t', 'trailer-20ft', 'trailer-40ft'],
    'Hardware / Construction': ['pickup', 'truck-3t', 'truck-5t', 'truck-7t', 'truck-10t', 'truck-15t', 'tipper-7t', 'tipper-14t', 'tipper-25t', 'trailer-20ft', 'trailer-40ft'],
    'Agricultural': ['truck-3t', 'truck-5t', 'truck-7t', 'truck-10t', 'truck-15t', 'trailer-20ft', 'trailer-40ft', 'reefer-van', 'reefer-truck-3t', 'reefer-truck-10t'],
    'Perishables / Cold Chain': ['reefer-van', 'reefer-truck-3t', 'reefer-truck-10t'],
    'LPG / Gas (Bulk)': ['lpg-tanker'],
    'Petroleum / Oil': ['fuel-tanker-10kl', 'fuel-tanker-18kl', 'fuel-tanker-30kl'],
    'Loose Aggregate': ['tipper-7t', 'tipper-14t', 'tipper-25t'],
};

/* ── Legacy ID → canonical ID aliasing ───────────────────────────
    Keeps historical orders/drivers resolving to the new taxonomy. */
export const LEGACY_VEHICLE_ALIASES: Record<string, string> = {
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
    'container': 'trailer-20ft', 'container-20ft': 'trailer-20ft',
    'container-5axle': 'trailer-20ft', 'container-6axle': 'trailer-40ft', 'container-7axle': 'trailer-40ft',
    'container-40ft': 'trailer-40ft',
    'tipper': 'tipper-14t', 'tipper-2axle': 'tipper-14t', 'tipper-3axle': 'tipper-25t', 'tipper-4axle': 'tipper-25t',
    'lpg-tanker-6axle': 'lpg-tanker',
    'fuel-tanker': 'fuel-tanker-18kl', 'tanker': 'fuel-tanker-18kl',
    'fuel-tanker-2axle-10kl': 'fuel-tanker-10kl', 'fuel-tanker-3axle-18kl': 'fuel-tanker-18kl',
    'fuel-tanker-4axle-20kl': 'fuel-tanker-18kl', 'fuel-tanker-6axle-30kl': 'fuel-tanker-30kl',
    'fuel-tanker-3axle': 'fuel-tanker-18kl', 'fuel-tanker-6axle': 'fuel-tanker-30kl',
    'reefer-truck-3axle': 'reefer-truck-10t', 'reefer-semi-6axle': 'reefer-truck-10t',
    'trailer': 'trailer-40ft',
    // Standard pseudo-vehicle for consolidated parcel service (not a real vehicle)
    'standard': 'standard',
};