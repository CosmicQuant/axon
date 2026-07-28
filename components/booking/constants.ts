/* ── Capability-driven vehicle config ────────────────────────────
   Single source of truth for booking-flow gating.
   Real PRICING lives server-side in functions/lib/pricing.js (VEHICLE_RATES).
   The `pricePerKm` here is informational only (used nowhere for billing). */

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
    // ── Tier: light ───────────────────────────────────────────
    {
        id: 'boda', label: 'Boda Boda', img: '/icons3d/motorcycle.png',
        accentText: 'text-orange-500', accentBg: 'bg-orange-500', accentBgLight: 'bg-orange-50',
        pricePerKm: 25, tier: 'light',
        constraints: { maxDist: 65, maxWeight: 50, maxStops: 2, allowedCats: ['A'],
            weightUnit: 'kg', allowFragile: false, allowReturn: true,
            allowAsap: true, allowScheduled: true, requiresHelpers: false, suggestedHelpers: 0,
            cargoHazardous: false },
    },
    {
        id: 'tuktuk', label: 'Cargo Tuk-Tuk', img: '/icons3d/auto_rickshaw.png',
        accentText: 'text-yellow-500', accentBg: 'bg-yellow-500', accentBgLight: 'bg-yellow-50',
        pricePerKm: 40, tier: 'light',
        constraints: { maxDist: 65, maxWeight: 500, maxStops: 3, allowedCats: ['A'],
            weightUnit: 'kg', allowFragile: true, allowReturn: true,
            allowAsap: true, allowScheduled: true, requiresHelpers: false, suggestedHelpers: 0,
            cargoHazardous: false },
    },
    {
        id: 'probox', label: 'Probox', img: '/icons3d/automobile.png',
        accentText: 'text-violet-500', accentBg: 'bg-violet-500', accentBgLight: 'bg-violet-50',
        pricePerKm: 55, tier: 'medium',
        constraints: { maxDist: UNLIMITED, maxWeight: 1000, maxStops: 5, allowedCats: ['A', 'B'],
            weightUnit: 'kg', allowFragile: true, allowReturn: true,
            allowAsap: true, allowScheduled: true, requiresHelpers: false, suggestedHelpers: 0,
            cargoHazardous: false },
    },
    {
        id: 'van', label: 'Cargo Van', img: '/icons3d/minibus.png',
        accentText: 'text-sky-500', accentBg: 'bg-sky-500', accentBgLight: 'bg-sky-50',
        pricePerKm: 75, tier: 'medium',
        constraints: { maxDist: UNLIMITED, maxWeight: 1500, maxStops: 5, allowedCats: ['A', 'B'],
            weightUnit: 'kg', allowFragile: true, allowReturn: true,
            allowAsap: true, allowScheduled: true, requiresHelpers: false, suggestedHelpers: 0,
            cargoHazardous: false },
    },
    {
        id: 'pickup', label: 'Pick-up', img: '/icons3d/pickup_truck.png',
        accentText: 'text-teal-500', accentBg: 'bg-teal-500', accentBgLight: 'bg-teal-50',
        pricePerKm: 85, tier: 'medium',
        constraints: { maxDist: UNLIMITED, maxWeight: 2000, maxStops: 5, allowedCats: ['A', 'B'],
            weightUnit: 'kg', allowFragile: false, allowReturn: true,
            allowAsap: true, allowScheduled: true, requiresHelpers: false, suggestedHelpers: 0,
            cargoHazardous: false },
    },

    // ── Tier: heavy (rigid lorries — axle-based GVW per KeNHA / EAC Act) ──
// GVW = truck + body + cargo. Naming follows axle count, which is the legal
// enforcement standard at Kenyan weighbridges (not cargo type).
    {
        id: 'rigid-truck-2axle', label: 'Truck 18T (2-Axle)', img: '/icons3d/delivery_truck.png',
        accentText: 'text-teal-600', accentBg: 'bg-teal-600', accentBgLight: 'bg-teal-50',
        pricePerKm: 110, tier: 'medium',
        constraints: { maxDist: UNLIMITED, maxWeight: 18, maxStops: 5, allowedCats: ['A', 'B'],
            weightUnit: 'tonnes', allowFragile: true, allowReturn: true,
            allowAsap: true, allowScheduled: true, requiresHelpers: false, suggestedHelpers: 0,
            cargoHazardous: false },
    },
    {
        id: 'canter', label: 'Canter 3T', img: '/icons3d/delivery_truck.png',
        accentText: 'text-teal-700', accentBg: 'bg-teal-700', accentBgLight: 'bg-teal-50',
        pricePerKm: 110, tier: 'medium',
        constraints: { maxDist: UNLIMITED, maxWeight: 3, maxStops: 5, allowedCats: ['B'],
            weightUnit: 'tonnes', allowFragile: true, allowReturn: true,
            allowAsap: true, allowScheduled: true, requiresHelpers: false, suggestedHelpers: 0,
            cargoHazardous: false },
    },
    {
        id: 'rigid-truck-3axle', label: 'Truck 26T (3-Axle)', img: '/icons3d/articulated_lorry.png',
        accentText: 'text-slate-600', accentBg: 'bg-slate-600', accentBgLight: 'bg-slate-50',
        pricePerKm: 150, tier: 'heavy',
        constraints: { maxDist: UNLIMITED, maxWeight: 26, maxStops: 5, allowedCats: ['B'],
            weightUnit: 'tonnes', allowFragile: true, allowReturn: true,
            allowAsap: false, allowScheduled: true, requiresHelpers: true, suggestedHelpers: 2,
            cargoHazardous: false, allowConsolidated: false },
    },
    {
        id: 'rigid-truck-4axle', label: 'Truck 30T (4-Axle)', img: '/icons3d/articulated_lorry.png',
        accentText: 'text-slate-700', accentBg: 'bg-slate-700', accentBgLight: 'bg-slate-50',
        pricePerKm: 170, tier: 'heavy',
        constraints: { maxDist: UNLIMITED, maxWeight: 30, maxStops: 5, allowedCats: ['B'],
            weightUnit: 'tonnes', allowFragile: true, allowReturn: true,
            allowAsap: false, allowScheduled: true, requiresHelpers: true, suggestedHelpers: 2,
            cargoHazardous: false, allowConsolidated: false },
    },
    {
        id: 'semi-truck-4axle', label: 'Truck 38T (Semi 4-Axle)', img: '/icons3d/articulated_lorry.png',
        accentText: 'text-slate-800', accentBg: 'bg-slate-800', accentBgLight: 'bg-slate-100',
        pricePerKm: 190, tier: 'heavy',
        constraints: { maxDist: UNLIMITED, maxWeight: 38, maxStops: 3, allowedCats: ['B'],
            weightUnit: 'tonnes', allowFragile: true, allowReturn: true,
            allowAsap: false, allowScheduled: true, requiresHelpers: true, suggestedHelpers: 3,
            cargoHazardous: false, allowConsolidated: false },
    },
    {
        id: 'semi-truck-5axle', label: 'Truck 44T (Semi 5-Axle)', img: '/icons3d/articulated_lorry.png',
        accentText: 'text-slate-900', accentBg: 'bg-slate-900', accentBgLight: 'bg-slate-100',
        pricePerKm: 220, tier: 'heavy',
        constraints: { maxDist: UNLIMITED, maxWeight: 44, maxStops: 3, allowedCats: ['B'],
            weightUnit: 'tonnes', allowFragile: true, allowReturn: true,
            allowAsap: false, allowScheduled: true, requiresHelpers: true, suggestedHelpers: 3,
            cargoHazardous: false, allowConsolidated: false },
    },
    {
        id: 'semi-truck-6axle', label: 'Truck 50T (Semi 6-Axle)', img: '/icons3d/articulated_lorry.png',
        accentText: 'text-slate-950', accentBg: 'bg-slate-950', accentBgLight: 'bg-slate-100',
        pricePerKm: 260, tier: 'heavy',
        constraints: { maxDist: UNLIMITED, maxWeight: 50, maxStops: 3, allowedCats: ['B'],
            weightUnit: 'tonnes', allowFragile: true, allowReturn: true,
            allowAsap: false, allowScheduled: true, requiresHelpers: true, suggestedHelpers: 3,
            cargoHazardous: false, allowConsolidated: false },
    },
    {
        id: 'semi-truck-7axle', label: 'Truck 56T (Max 7-Axle)', img: '/icons3d/articulated_lorry.png',
        accentText: 'text-gray-900', accentBg: 'bg-gray-900', accentBgLight: 'bg-gray-100',
        pricePerKm: 300, tier: 'heavy',
        constraints: { maxDist: UNLIMITED, maxWeight: 56, maxStops: 3, allowedCats: ['B'],
            weightUnit: 'tonnes', allowFragile: true, allowReturn: true,
            allowAsap: false, allowScheduled: true, requiresHelpers: true, suggestedHelpers: 3,
            cargoHazardous: false, allowConsolidated: false },
    },

    // ── Tier: heavy (tippers — rigid dump trucks by axle, strict cargo) ─
    // Tippers carry only loose aggregate (sand, ballast, hardcore). The KeNHA
    // axle limits apply, but the cargo type is locked via strictCargoFilter.
    {
        id: 'tipper-2axle', label: 'Tipper 18T (2-Axle)', img: '/icons3d/tipper_truck.svg',
        accentText: 'text-amber-600', accentBg: 'bg-amber-600', accentBgLight: 'bg-amber-50',
        pricePerKm: 140, tier: 'heavy',
        constraints: { maxDist: UNLIMITED, maxWeight: 18, maxStops: 1, allowedCats: ['B'],
            weightUnit: 'tonnes', allowFragile: false, allowReturn: true,
            allowAsap: false, allowScheduled: true, requiresHelpers: true, suggestedHelpers: 2,
            cargoHazardous: false, strictCargoFilter: true, allowConsolidated: false },
    },
    {
        id: 'tipper-3axle', label: 'Tipper 26T (3-Axle)', img: '/icons3d/tipper_truck.svg',
        accentText: 'text-amber-700', accentBg: 'bg-amber-700', accentBgLight: 'bg-amber-50',
        pricePerKm: 170, tier: 'heavy',
        constraints: { maxDist: UNLIMITED, maxWeight: 26, maxStops: 1, allowedCats: ['B'],
            weightUnit: 'tonnes', allowFragile: false, allowReturn: true,
            allowAsap: false, allowScheduled: true, requiresHelpers: true, suggestedHelpers: 3,
            cargoHazardous: false, strictCargoFilter: true, allowConsolidated: false },
    },
    {
        id: 'tipper-4axle', label: 'Tipper 30T (4-Axle)', img: '/icons3d/tipper_truck.svg',
        accentText: 'text-amber-800', accentBg: 'bg-amber-800', accentBgLight: 'bg-amber-100',
        pricePerKm: 200, tier: 'heavy',
        constraints: { maxDist: UNLIMITED, maxWeight: 30, maxStops: 1, allowedCats: ['B'],
            weightUnit: 'tonnes', allowFragile: false, allowReturn: true,
            allowAsap: false, allowScheduled: true, requiresHelpers: true, suggestedHelpers: 3,
            cargoHazardous: false, strictCargoFilter: true, allowConsolidated: false },
    },

    // ── Tier: heavy (containers — semi-trailer configs, port-road limits) ─
    // Container cargo + tare capped at 34T per maritime/Shippers Council rules;
    // GVW follows the semi-trailer axle totals. Height <4.3m enforced by carrier.
    {
        id: 'container-5axle', label: 'Container Truck 44T (5-Axle)', img: '/icons3d/container_truck.svg',
        accentText: 'text-purple-600', accentBg: 'bg-purple-600', accentBgLight: 'bg-purple-50',
        pricePerKm: 230, tier: 'heavy',
        constraints: { maxDist: UNLIMITED, maxWeight: 34, maxStops: 3, allowedCats: ['B'],
            weightUnit: 'tonnes', allowFragile: true, allowReturn: true,
            allowAsap: false, allowScheduled: true, requiresHelpers: true, suggestedHelpers: 3,
            cargoHazardous: false, allowConsolidated: false },
    },
    {
        id: 'container-6axle', label: 'Container Truck 50T (6-Axle)', img: '/icons3d/container_truck.svg',
        accentText: 'text-purple-700', accentBg: 'bg-purple-700', accentBgLight: 'bg-purple-50',
        pricePerKm: 260, tier: 'heavy',
        constraints: { maxDist: UNLIMITED, maxWeight: 34, maxStops: 3, allowedCats: ['B'],
            weightUnit: 'tonnes', allowFragile: true, allowReturn: true,
            allowAsap: false, allowScheduled: true, requiresHelpers: true, suggestedHelpers: 3,
            cargoHazardous: false, allowConsolidated: false },
    },
    {
        id: 'container-7axle', label: 'Container Truck 56T (7-Axle)', img: '/icons3d/container_truck.svg',
        accentText: 'text-purple-800', accentBg: 'bg-purple-800', accentBgLight: 'bg-purple-100',
        pricePerKm: 290, tier: 'heavy',
        constraints: { maxDist: UNLIMITED, maxWeight: 34, maxStops: 3, allowedCats: ['B'],
            weightUnit: 'tonnes', allowFragile: true, allowReturn: true,
            allowAsap: false, allowScheduled: true, requiresHelpers: true, suggestedHelpers: 3,
            cargoHazardous: false, allowConsolidated: false },
    },

    // ── Tier: hazmat (tankers — axle GVW + strict cargo) ────────
    // LPG: pressurized gas, Class 2; payload ~22-25T within 50T 6-axle GVW.
    {
        id: 'lpg-tanker-6axle', label: 'LPG Tanker 50T (6-Axle)', img: '/icons3d/tanker_truck.svg',
        accentText: 'text-sky-600', accentBg: 'bg-sky-600', accentBgLight: 'bg-sky-50',
        pricePerKm: 260, tier: 'hazmat',
        constraints: { maxDist: UNLIMITED, maxWeight: 24, maxStops: 1, allowedCats: ['B'],
            weightUnit: 'tonnes', allowFragile: false, allowReturn: true,
            allowAsap: false, allowScheduled: true, requiresHelpers: true, suggestedHelpers: 3,
            cargoHazardous: 'Class2', strictCargoFilter: true, allowConsolidated: false },
    },
    // Fuel: petrol/diesel/kerosene, Class 3; capacity-graded tankers.
    {
        id: 'fuel-tanker-2axle-10kl', label: 'Fuel Tanker 10,000L (2-Axle)', img: '/icons3d/tanker_truck.svg',
        accentText: 'text-red-400', accentBg: 'bg-red-400', accentBgLight: 'bg-red-50',
        pricePerKm: 180, tier: 'hazmat',
        constraints: { maxDist: UNLIMITED, maxWeight: 10000, maxStops: 1, allowedCats: ['B'],
            weightUnit: 'litres', allowFragile: false, allowReturn: true,
            allowAsap: false, allowScheduled: true, requiresHelpers: true, suggestedHelpers: 2,
            cargoHazardous: 'Class3', strictCargoFilter: true, allowConsolidated: false },
    },
    {
        id: 'fuel-tanker-3axle-18kl', label: 'Fuel Tanker 18,000L (3-Axle)', img: '/icons3d/tanker_truck.svg',
        accentText: 'text-red-500', accentBg: 'bg-red-500', accentBgLight: 'bg-red-50',
        pricePerKm: 200, tier: 'hazmat',
        constraints: { maxDist: UNLIMITED, maxWeight: 18000, maxStops: 1, allowedCats: ['B'],
            weightUnit: 'litres', allowFragile: false, allowReturn: true,
            allowAsap: false, allowScheduled: true, requiresHelpers: true, suggestedHelpers: 2,
            cargoHazardous: 'Class3', strictCargoFilter: true, allowConsolidated: false },
    },
    {
        id: 'fuel-tanker-4axle-20kl', label: 'Fuel Tanker 20,000L (4-Axle)', img: '/icons3d/tanker_truck.svg',
        accentText: 'text-red-600', accentBg: 'bg-red-600', accentBgLight: 'bg-red-50',
        pricePerKm: 220, tier: 'hazmat',
        constraints: { maxDist: UNLIMITED, maxWeight: 20000, maxStops: 1, allowedCats: ['B'],
            weightUnit: 'litres', allowFragile: false, allowReturn: true,
            allowAsap: false, allowScheduled: true, requiresHelpers: true, suggestedHelpers: 3,
            cargoHazardous: 'Class3', strictCargoFilter: true, allowConsolidated: false },
    },
    {
        id: 'fuel-tanker-6axle-30kl', label: 'Fuel Tanker 30,000L (6-Axle)', img: '/icons3d/tanker_truck.svg',
        accentText: 'text-red-700', accentBg: 'bg-red-700', accentBgLight: 'bg-red-50',
        pricePerKm: 260, tier: 'hazmat',
        constraints: { maxDist: UNLIMITED, maxWeight: 30000, maxStops: 1, allowedCats: ['B'],
            weightUnit: 'litres', allowFragile: false, allowReturn: true,
            allowAsap: false, allowScheduled: true, requiresHelpers: true, suggestedHelpers: 3,
            cargoHazardous: 'Class3', strictCargoFilter: true, allowConsolidated: false },
    },
];

/* ── Cargo → Vehicle eligibility map ────────────────────────────
   Maps each subCategory to the vehicle IDs it can use.
   If a subCategory is NOT listed, all category-eligible vehicles are shown. */
export const CARGO_VEHICLE_MAP: Record<string, string[]> = {
    'Electronics': ['probox', 'van', 'pickup', 'canter', 'rigid-truck-2axle', 'rigid-truck-3axle', 'rigid-truck-4axle'],
    'Large Appliances': ['van', 'pickup', 'canter', 'rigid-truck-2axle', 'rigid-truck-3axle', 'rigid-truck-4axle'],
    'Furniture': ['van', 'pickup', 'canter', 'rigid-truck-2axle', 'rigid-truck-3axle', 'rigid-truck-4axle'],
    'Hardware / Construction': ['pickup', 'canter', 'rigid-truck-2axle', 'rigid-truck-3axle', 'rigid-truck-4axle', 'semi-truck-4axle', 'semi-truck-5axle', 'semi-truck-6axle', 'semi-truck-7axle', 'tipper-2axle', 'tipper-3axle', 'tipper-4axle'],
    'Agricultural': ['canter', 'rigid-truck-2axle', 'rigid-truck-3axle', 'rigid-truck-4axle', 'semi-truck-4axle', 'semi-truck-5axle'],
    'LPG / Gas (Bulk)': ['lpg-tanker-6axle'],
    'Petroleum / Oil': ['fuel-tanker-2axle-10kl', 'fuel-tanker-3axle-18kl', 'fuel-tanker-4axle-20kl', 'fuel-tanker-6axle-30kl'],
    'Loose Aggregate': ['tipper-2axle', 'tipper-3axle', 'tipper-4axle'],
};