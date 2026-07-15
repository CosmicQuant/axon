/* ── Cargo → Vehicle eligibility map ────────────────────────────
   Maps each subCategory to the vehicle IDs it can use.
   If a subCategory is NOT listed, all category-eligible vehicles are shown. */
export const CARGO_VEHICLE_MAP: Record<string, string[]> = {
    // Category A — standard parcels (all Cat-A vehicles allowed by default)
    // No overrides needed for Document, Small Box, Medium Box, Large Box, Jumbo Box, Custom Dimensions

    // Category B — specific vehicle restrictions
    'Electronics': ['probox', 'van', 'pickup', 'canter', 'lorry-5t', 'lorry-7t', 'lorry-10t'],
    'Large Appliances': ['van', 'pickup', 'canter', 'lorry-5t', 'lorry-7t', 'lorry-10t'],
    'Furniture': ['van', 'pickup', 'canter', 'lorry-5t', 'lorry-7t', 'lorry-10t'],
    'Hardware / Construction': ['pickup', 'canter', 'lorry-5t', 'lorry-7t', 'lorry-10t', 'lorry-14t', 'tipper-7t', 'tipper-14t', 'tipper-25t'],
    'Agricultural': ['canter', 'lorry-5t', 'lorry-7t', 'lorry-10t', 'lorry-14t'],
    'LPG / Gas (Bulk)': ['lpg-tanker'],
    'Petroleum / Oil': ['fuel-tanker'],
    'Loose Aggregate': ['tipper-7t', 'tipper-14t', 'tipper-25t'],
};

/* ── Vehicle fleet ──────────────────────────────────────────────
   Pricing reflects real Kenya market rates (2026).
   pricePerKm is used for client-side estimates only.
   Server-side uses VEHICLE_RATES in functions/index.js. */
export const VEHICLES = [
    // ── Category A: Light / Parcels ───────────────────────────
    { id: 'boda', label: 'Motorbike', maxDist: 65, maxWeight: 20, allowedCats: ['A'], pricePerKm: 25, img: '/icons3d/motorcycle.png', color: 'text-orange-500', bgColor: 'bg-orange-500', bgLight: 'bg-orange-50' },
    { id: 'tuktuk', label: 'Cargo Tuk-Tuk', maxDist: 65, maxWeight: 300, allowedCats: ['A'], pricePerKm: 40, img: '/icons3d/auto_rickshaw.png', color: 'text-yellow-500', bgColor: 'bg-yellow-500', bgLight: 'bg-yellow-50' },
    { id: 'probox', label: 'Probox', maxDist: 9999, maxWeight: 500, allowedCats: ['A', 'B'], pricePerKm: 55, img: '/icons3d/automobile.png', color: 'text-blue-500', bgColor: 'bg-blue-500', bgLight: 'bg-blue-50' },
    { id: 'van', label: 'Cargo Van', maxDist: 9999, maxWeight: 1500, allowedCats: ['A', 'B'], pricePerKm: 75, img: '/icons3d/minibus.png', color: 'text-indigo-500', bgColor: 'bg-indigo-500', bgLight: 'bg-indigo-50' },
    { id: 'pickup', label: 'Pick-up', maxDist: 9999, maxWeight: 2000, allowedCats: ['A', 'B'], pricePerKm: 85, img: '/icons3d/pickup_truck.png', color: 'text-emerald-500', bgColor: 'bg-emerald-500', bgLight: 'bg-emerald-50' },

    // ── Category B: Medium trucks ─────────────────────────────
    { id: 'canter', label: 'Canter 3T', maxDist: 9999, maxWeight: 3000, allowedCats: ['B'], pricePerKm: 110, img: '/icons3d/delivery_truck.png', color: 'text-teal-600', bgColor: 'bg-teal-600', bgLight: 'bg-teal-50' },

    // ── Lorry tonnage variants ────────────────────────────────
    { id: 'lorry-5t', label: 'Lorry 5T', maxDist: 9999, maxWeight: 5000, allowedCats: ['B'], pricePerKm: 130, img: '/icons3d/articulated_lorry.png', color: 'text-slate-600', bgColor: 'bg-slate-600', bgLight: 'bg-slate-50' },
    { id: 'lorry-7t', label: 'Lorry 7T', maxDist: 9999, maxWeight: 7000, allowedCats: ['B'], pricePerKm: 150, img: '/icons3d/articulated_lorry.png', color: 'text-slate-700', bgColor: 'bg-slate-700', bgLight: 'bg-slate-50' },
    { id: 'lorry-10t', label: 'Lorry 10T', maxDist: 9999, maxWeight: 10000, allowedCats: ['B'], pricePerKm: 170, img: '/icons3d/articulated_lorry.png', color: 'text-slate-800', bgColor: 'bg-slate-800', bgLight: 'bg-slate-100' },
    { id: 'lorry-14t', label: 'Lorry 14T', maxDist: 9999, maxWeight: 14000, allowedCats: ['B'], pricePerKm: 200, img: '/icons3d/articulated_lorry.png', color: 'text-slate-900', bgColor: 'bg-slate-900', bgLight: 'bg-slate-100' },

    // ── Tipper tonnage variants ───────────────────────────────
    { id: 'tipper-7t', label: 'Tipper 7T', maxDist: 9999, maxWeight: 7000, allowedCats: ['B'], pricePerKm: 140, img: '/icons3d/tipper_truck.svg', color: 'text-amber-600', bgColor: 'bg-amber-600', bgLight: 'bg-amber-50' },
    { id: 'tipper-14t', label: 'Tipper 14T', maxDist: 9999, maxWeight: 14000, allowedCats: ['B'], pricePerKm: 180, img: '/icons3d/tipper_truck.svg', color: 'text-amber-700', bgColor: 'bg-amber-700', bgLight: 'bg-amber-50' },
    { id: 'tipper-25t', label: 'Tipper 25T', maxDist: 9999, maxWeight: 25000, allowedCats: ['B'], pricePerKm: 220, img: '/icons3d/tipper_truck.svg', color: 'text-amber-800', bgColor: 'bg-amber-800', bgLight: 'bg-amber-100' },

    // ── Container sizes ───────────────────────────────────────
    { id: 'container-20ft', label: '20ft Container', maxDist: 9999, maxWeight: 18000, allowedCats: ['B'], pricePerKm: 200, img: '/icons3d/container_truck.svg', color: 'text-purple-600', bgColor: 'bg-purple-600', bgLight: 'bg-purple-50' },
    { id: 'container-40ft', label: '40ft Container', maxDist: 9999, maxWeight: 28000, allowedCats: ['B'], pricePerKm: 280, img: '/icons3d/container_truck.svg', color: 'text-purple-700', bgColor: 'bg-purple-700', bgLight: 'bg-purple-50' },

    // ── Tanker types (separate for LPG vs Petroleum) ──────────
    { id: 'lpg-tanker', label: 'LPG Tanker', maxDist: 9999, maxWeight: 20000, allowedCats: ['B'], pricePerKm: 250, img: '/icons3d/tanker_truck.svg', color: 'text-sky-600', bgColor: 'bg-sky-600', bgLight: 'bg-sky-50' },
    { id: 'fuel-tanker', label: 'Fuel Tanker', maxDist: 9999, maxWeight: 30000, allowedCats: ['B'], pricePerKm: 300, img: '/icons3d/tanker_truck.svg', color: 'text-red-600', bgColor: 'bg-red-600', bgLight: 'bg-red-50' },
];
