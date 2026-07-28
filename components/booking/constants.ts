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
            weightUnit: 'kg', allowFragile: false, allowReturn: false,
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

    // ── Tier: heavy (lorries) ──────────────────────────────────
    {
        id: 'canter', label: 'Canter 3T', img: '/icons3d/delivery_truck.png',
        accentText: 'text-teal-600', accentBg: 'bg-teal-600', accentBgLight: 'bg-teal-50',
        pricePerKm: 110, tier: 'medium',
        constraints: { maxDist: UNLIMITED, maxWeight: 3000, maxStops: 5, allowedCats: ['B'],
            weightUnit: 'kg', allowFragile: true, allowReturn: true,
            allowAsap: true, allowScheduled: true, requiresHelpers: false, suggestedHelpers: 0,
            cargoHazardous: false },
    },
    {
        id: 'lorry-5t', label: 'Lorry 5T', img: '/icons3d/articulated_lorry.png',
        accentText: 'text-slate-600', accentBg: 'bg-slate-600', accentBgLight: 'bg-slate-50',
        pricePerKm: 130, tier: 'heavy',
        constraints: { maxDist: UNLIMITED, maxWeight: 5000, maxStops: 5, allowedCats: ['B'],
            weightUnit: 'tonnes', allowFragile: true, allowReturn: true,
            allowAsap: false, allowScheduled: true, requiresHelpers: true, suggestedHelpers: 2,
            cargoHazardous: false },
    },
    {
        id: 'lorry-7t', label: 'Lorry 7T', img: '/icons3d/articulated_lorry.png',
        accentText: 'text-slate-700', accentBg: 'bg-slate-700', accentBgLight: 'bg-slate-50',
        pricePerKm: 150, tier: 'heavy',
        constraints: { maxDist: UNLIMITED, maxWeight: 7000, maxStops: 5, allowedCats: ['B'],
            weightUnit: 'tonnes', allowFragile: true, allowReturn: true,
            allowAsap: false, allowScheduled: true, requiresHelpers: true, suggestedHelpers: 2,
            cargoHazardous: false },
    },
    {
        id: 'lorry-10t', label: 'Lorry 10T', img: '/icons3d/articulated_lorry.png',
        accentText: 'text-slate-800', accentBg: 'bg-slate-800', accentBgLight: 'bg-slate-100',
        pricePerKm: 170, tier: 'heavy',
        constraints: { maxDist: UNLIMITED, maxWeight: 10000, maxStops: 5, allowedCats: ['B'],
            weightUnit: 'tonnes', allowFragile: true, allowReturn: true,
            allowAsap: false, allowScheduled: true, requiresHelpers: true, suggestedHelpers: 3,
            cargoHazardous: false },
    },
    {
        id: 'lorry-14t', label: 'Lorry 14T', img: '/icons3d/articulated_lorry.png',
        accentText: 'text-slate-900', accentBg: 'bg-slate-900', accentBgLight: 'bg-slate-100',
        pricePerKm: 200, tier: 'heavy',
        constraints: { maxDist: UNLIMITED, maxWeight: 14000, maxStops: 5, allowedCats: ['B'],
            weightUnit: 'tonnes', allowFragile: true, allowReturn: true,
            allowAsap: false, allowScheduled: true, requiresHelpers: true, suggestedHelpers: 3,
            cargoHazardous: false },
    },

    // ── Tier: heavy (tippers — loose aggregate, volume/coverage) ─
    {
        id: 'tipper-7t', label: 'Tipper 7T', img: '/icons3d/tipper_truck.svg',
        accentText: 'text-amber-600', accentBg: 'bg-amber-600', accentBgLight: 'bg-amber-50',
        pricePerKm: 140, tier: 'heavy',
        constraints: { maxDist: UNLIMITED, maxWeight: 7000, maxStops: 1, allowedCats: ['B'],
            weightUnit: 'tonnes', allowFragile: false, allowReturn: false,
            allowAsap: false, allowScheduled: true, requiresHelpers: true, suggestedHelpers: 2,
            cargoHazardous: false },
    },
    {
        id: 'tipper-14t', label: 'Tipper 14T', img: '/icons3d/tipper_truck.svg',
        accentText: 'text-amber-700', accentBg: 'bg-amber-700', accentBgLight: 'bg-amber-50',
        pricePerKm: 180, tier: 'heavy',
        constraints: { maxDist: UNLIMITED, maxWeight: 14000, maxStops: 1, allowedCats: ['B'],
            weightUnit: 'tonnes', allowFragile: false, allowReturn: false,
            allowAsap: false, allowScheduled: true, requiresHelpers: true, suggestedHelpers: 3,
            cargoHazardous: false },
    },
    {
        id: 'tipper-25t', label: 'Tipper 25T', img: '/icons3d/tipper_truck.svg',
        accentText: 'text-amber-800', accentBg: 'bg-amber-800', accentBgLight: 'bg-amber-100',
        pricePerKm: 220, tier: 'heavy',
        constraints: { maxDist: UNLIMITED, maxWeight: 25000, maxStops: 1, allowedCats: ['B'],
            weightUnit: 'tonnes', allowFragile: false, allowReturn: false,
            allowAsap: false, allowScheduled: true, requiresHelpers: true, suggestedHelpers: 3,
            cargoHazardous: false },
    },

    // ── Tier: heavy (containers) ───────────────────────────────
    {
        id: 'container-20ft', label: '20ft Container', img: '/icons3d/container_truck.svg',
        accentText: 'text-purple-600', accentBg: 'bg-purple-600', accentBgLight: 'bg-purple-50',
        pricePerKm: 200, tier: 'heavy',
        constraints: { maxDist: UNLIMITED, maxWeight: 18000, maxStops: 3, allowedCats: ['B'],
            weightUnit: 'tonnes', allowFragile: true, allowReturn: true,
            allowAsap: false, allowScheduled: true, requiresHelpers: true, suggestedHelpers: 3,
            cargoHazardous: false },
    },
    {
        id: 'container-40ft', label: '40ft Container', img: '/icons3d/container_truck.svg',
        accentText: 'text-purple-700', accentBg: 'bg-purple-700', accentBgLight: 'bg-purple-50',
        pricePerKm: 280, tier: 'heavy',
        constraints: { maxDist: UNLIMITED, maxWeight: 28000, maxStops: 3, allowedCats: ['B'],
            weightUnit: 'tonnes', allowFragile: true, allowReturn: true,
            allowAsap: false, allowScheduled: true, requiresHelpers: true, suggestedHelpers: 3,
            cargoHazardous: false },
    },

    // ── Tier: hazmat (tankers) ─────────────────────────────────
    // LPG: petroleum gas (pressurized) — Class 2 dangerous goods, kg/tonnes
    {
        id: 'lpg-tanker', label: 'LPG Tanker', img: '/icons3d/tanker_truck.svg',
        accentText: 'text-sky-600', accentBg: 'bg-sky-600', accentBgLight: 'bg-sky-50',
        pricePerKm: 250, tier: 'hazmat',
        constraints: { maxDist: UNLIMITED, maxWeight: 20000, maxStops: 1, allowedCats: ['B'],
            weightUnit: 'tonnes', allowFragile: false, allowReturn: false,
            allowAsap: false, allowScheduled: true, requiresHelpers: true, suggestedHelpers: 3,
            cargoHazardous: 'Class2' },
    },
    // Fuel: petrol/diesel/kerosene (vented) — Class 3 flammable, litres
    {
        id: 'fuel-tanker', label: 'Fuel Tanker', img: '/icons3d/tanker_truck.svg',
        accentText: 'text-red-600', accentBg: 'bg-red-600', accentBgLight: 'bg-red-50',
        pricePerKm: 300, tier: 'hazmat',
        constraints: { maxDist: UNLIMITED, maxWeight: 30000, maxStops: 1, allowedCats: ['B'],
            weightUnit: 'litres', allowFragile: false, allowReturn: false,
            allowAsap: false, allowScheduled: true, requiresHelpers: true, suggestedHelpers: 3,
            cargoHazardous: 'Class3' },
    },
];

/* ── Cargo → Vehicle eligibility map ────────────────────────────
   Maps each subCategory to the vehicle IDs it can use.
   If a subCategory is NOT listed, all category-eligible vehicles are shown. */
export const CARGO_VEHICLE_MAP: Record<string, string[]> = {
    'Electronics': ['probox', 'van', 'pickup', 'canter', 'lorry-5t', 'lorry-7t', 'lorry-10t'],
    'Large Appliances': ['van', 'pickup', 'canter', 'lorry-5t', 'lorry-7t', 'lorry-10t'],
    'Furniture': ['van', 'pickup', 'canter', 'lorry-5t', 'lorry-7t', 'lorry-10t'],
    'Hardware / Construction': ['pickup', 'canter', 'lorry-5t', 'lorry-7t', 'lorry-10t', 'lorry-14t', 'tipper-7t', 'tipper-14t', 'tipper-25t'],
    'Agricultural': ['canter', 'lorry-5t', 'lorry-7t', 'lorry-10t', 'lorry-14t'],
    'LPG / Gas (Bulk)': ['lpg-tanker'],
    'Petroleum / Oil': ['fuel-tanker'],
    'Loose Aggregate': ['tipper-7t', 'tipper-14t', 'tipper-25t'],
};