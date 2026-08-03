import React, { useRef, useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Camera, ShieldCheck, ShieldAlert, AlertTriangle, X, Loader2 } from 'lucide-react';
import { useBooking } from '../BookingContext';
import { allowsFragile, getWeightUnitLabel, getVehicle, getStrictSubcategories, getForcedCategory } from '../../../services/vehicleCapabilities';
import type { WeightUnit } from '../constants';

// ── Specialised Cat B cargo that requires a dedicated vehicle (tipper / tanker
// / reefer). Under Standard Consolidated they're hidden so the customer can't
// pick them and reach the server-side guard failure (which would zero out the
// quote). Mirrors functions/lib/pricing.js SPECIALIZED_SUBCATEGORIES (kept here
// so the booking UI never offers an unreachable combo).
const SPECIALIZED_SUBCATEGORIES = [
    'Loose Aggregate',
    'LPG / Gas (Bulk)',
    'Petroleum / Oil',
    'Perishables / Cold Chain',
];

// Returns the subcategories visible for the current (serviceType, vehicle-lock)
// combo. Standard Consolidated hides specialised Cat B (they force Express).
// Specialised vehicles (strictCargoFilter) keep only their mapped cargo.
const getVisibleCargo = (baseItems: any[], serviceType: string, strictSubs: string[] | null): any[] => {
    let items = baseItems;
    if (strictSubs && strictSubs.length > 0) {
        items = items.filter((item: any) => strictSubs.includes(item.id));
    } else if (serviceType === 'Standard') {
        // Standard Consolidated handles all Cat A + general Cat B; specialised
        // cargo (aggregate/LPG/petroleum/cold-chain) requires a dedicated vehicle
        // and is never offered under Standard.
        items = items.filter((item: any) => !SPECIALIZED_SUBCATEGORIES.includes(item.id));
    }
    return items;
};

// Client-side mirror of pricing.pickConsolidationTruck — purely informational:
// gives the customer a "this will ride in a Truck 3T" hint under Standard LTL
// without exposing the server pricing table. Real tier selection happens server-
// side in functions/lib/pricing.js — keep this in lockstep.
const pickConsolidationTruckLabel = (weightKg: number): string | null => {
    const w = Number(weightKg) || 0;
    if (w <= 0) return null;
    if (w <= 3500)  return 'Truck 3T';
    if (w <= 5500)  return 'Truck 5T';
    if (w <= 9000)  return 'Truck 7T';
    if (w <= 13000) return 'Truck 10T';
    if (w <= 18000) return 'Truck 15T';
    if (w <= 24000) return 'Trailer 20ft';
    return 'Trailer 40ft';
};

// Convert a bulk cargo weight to kilograms given the customer's unit choice,
// mirroring functions/lib/pricing.js toKg() so the chip matches the server's
// tier decision exactly.
const toKg = (value: number, unit: WeightUnit | undefined): number => {
    if (unit === 'tonnes') return value * 1000;
    if (unit === 'litres') return value * 0.84;
    if (unit === 'm3') return value * 1000;
    return value; // kg
};

export const Step2What = () => {
    const { data, updateData, nextStep, prevStep } = useBooking();
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    // ── Gate category tabs by pre-selected vehicle's allowedCats ──
    // If the user clicked a vehicle from the home catalog, the tabs should
    // only show categories that vehicle can carry. A tanker (Cat B only) hides
    // the "Standard" parcel tab. A boda (Cat A only) hides the "Bulky" tab.
    const preselectedVehicle = getVehicle(data.vehicle);
    const allowedCats = preselectedVehicle?.constraints.allowedCats;
    const allTabs = [
        { id: 'A', label: '📦 Standard' },
        { id: 'B', label: '🏗️ Bulky / Heavy' }
    ];
    const tabs = allowedCats
        ? allTabs.filter(t => allowedCats.includes(t.id))
        : allTabs;

    const subcategories = {
        'A': [
            { id: 'Document', label: 'Document', desc: 'Max 0.5kg', examples: 'e.g. passports, keys, envelopes', img: '/icons3d/page_facing_up.png' },
            { id: 'Small Box', label: 'Small Box', desc: 'Max 2kg', examples: 'e.g. phones, clothes, books', img: '/icons3d/package.png' },
            { id: 'Medium Box', label: 'Medium Box', desc: 'Max 5kg', examples: 'e.g. shoes, laptops, toasters', img: '/icons3d/package.png' },
            { id: 'Large Box', label: 'Large Box', desc: 'Max 15kg', examples: 'e.g. microwaves, desktop pcs', img: '/icons3d/package.png' },
            { id: 'Jumbo Box', label: 'Jumbo Box', desc: 'Max 30kg', examples: 'e.g. mini-fridges, seating', img: '/icons3d/package.png' },
            { id: 'Custom Dimensions', label: 'Custom', desc: 'Custom', examples: 'enter sizes below', img: '/icons3d/triangular_ruler.png' }
        ],
        'B': [
            { id: 'Electronics', label: 'Electronics (TVs)', desc: 'All sizes — secure transit', img: '/icons3d/television.png' },
            { id: 'Large Appliances', label: 'Large Appliances', desc: 'Fridges, freezers, washing machines', img: '/icons3d/ice.png' },
            { id: 'Furniture', label: 'Furniture', desc: 'Sofas, beds, mattresses', img: '/icons3d/couch_and_lamp.png' },
            { id: 'Hardware / Construction', label: 'Hardware / Construction', desc: 'Raw materials', img: '/icons3d/hammer.png' },
            { id: 'Agricultural', label: '90kg Ag Sacks', desc: 'Cereals & produce', img: '/icons3d/sheaf_of_rice.png' },
            { id: 'Perishables / Cold Chain', label: 'Perishables / Cold Chain', desc: 'Refrigerated — food, pharma, flowers', img: '/icons3d/ice.png' },
            { id: 'LPG / Gas (Bulk)', label: 'LPG / Gas (Bulk)', desc: 'Tanker transport', img: '/icons3d/fuel_pump.png' },
            { id: 'Petroleum / Oil', label: 'Petroleum / Oil', desc: 'Liquid bulk', img: '/icons3d/oil_drum.png' },
            { id: 'Loose Aggregate', label: 'Loose Aggregate', desc: 'Sand, gravel, ballast', img: '/icons3d/rock.png' },
            // Custom bulk description — appears for both general and (when hidden
            // by Standard filter) specialised flows. Always last so it reads like
            // a fallback "tell us what it is" option.
            { id: 'Custom', label: 'Custom Cargo', desc: 'Describe your bulky freight', img: '/icons3d/triangular_ruler.png' }
        ]
    };

    const activeItems = subcategories[data.category as keyof typeof subcategories] || [];

    // ── Auto-lock category + strict subcategory filter ──
    // If the pre-selected vehicle restricts allowedCats to one (e.g. tanker → B,
    // boda → A), force the category so the grid matches. For specialized
    // vehicles (tippers/tankers), only show subcategories explicitly in the
    // CARGO_VEHICLE_MAP for that vehicle. Auto-select when only one option.
    const strictSubs = getStrictSubcategories(data.vehicle);
    const visibleItems = useMemo(
        () => getVisibleCargo(activeItems, data.serviceType, strictSubs),
        [activeItems, data.serviceType, strictSubs]
    );

    useEffect(() => {
        const forcedCat = getForcedCategory(data.vehicle);
        if (forcedCat && data.category !== forcedCat) {
            updateData({ category: forcedCat as any });
            return; // re-render with new category, then subcat logic fires next pass
        }
        // When strict + only one compatible subcategory → auto-select it
        const subs = getStrictSubcategories(data.vehicle);
        if (subs && subs.length === 1 && data.subCategory !== subs[0]) {
            updateData({ subCategory: subs[0] });
        } else if (subs && subs.length > 0 && data.subCategory && !subs.includes(data.subCategory)) {
            // Current subcategory not compatible with this vehicle → clear it
            updateData({ subCategory: '' });
        } else if (data.serviceType === 'Standard'
            && data.subCategory
            && SPECIALIZED_SUBCATEGORIES.includes(data.subCategory)
            && !(subs && subs.length > 0)) {
            // User was on a specialised cargo then switched to Standard: clear it
            // so we don't trip the server-side guard / zero out the quote.
            updateData({ subCategory: '' });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data.vehicle, data.category, data.subCategory, data.serviceType]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setUploading(true);
            const reader = new FileReader();
            reader.onloadend = () => {
                updateData({ itemImage: reader.result as string });
                setUploading(false);
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error('Upload failed:', error);
            setUploading(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-1 pb-2 pt-2 px-0 text-center w-full">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => updateData({ category: tab.id as any, subCategory: '' })}
                        className={`flex-1 px-1 py-3 rounded-xl text-[11px] sm:text-sm font-bold whitespace-nowrap transition-all border ${data.category === tab.id
                            ? 'bg-brand-50 border-brand-500 text-brand-700 shadow-sm ring-1 ring-brand-500'
                            : 'bg-gray-100 border-gray-200 text-gray-500 hover:bg-gray-200'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="min-h-[160px]">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={data.category}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="grid grid-cols-2 gap-3 max-h-[34vh] overflow-y-auto no-scrollbar p-1 pb-4"
                    >
                        {visibleItems.map((item: any) => {
                            const isSelected = data.subCategory === item.id;
                            const isA = data.category === 'A';
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => updateData({ subCategory: item.id })}
                                    className={`relative text-left p-2.5 rounded-xl border transition-all flex flex-col ${isSelected
                                        ? 'border-brand-500 bg-brand-50 shadow-sm scale-[1.02] ring-1 ring-brand-500'
                                        : 'border-gray-200 bg-white hover:border-brand-200 hover:bg-gray-50'
                                        } ${isA ? 'min-h-[85px] justify-start gap-1' : ''}`}
                                >
                                    <img src={item.img} alt={item.label} className="w-5 h-5 object-contain" />

                                    <div className="w-full">
                                        <div className={`text-[13px] font-bold ${isA ? 'pr-12' : ''} ${isSelected ? 'text-brand-900' : 'text-gray-900'}`}>{item.label}</div>
                                        {!isA && <div className={`text-xs mt-0.5 ${isSelected ? 'text-brand-600' : 'text-gray-500'}`}>{item.desc}</div>}
                                    </div>

                                    {isA && (
                                        <div className="w-full mt-auto flex flex-col">
                                            {item.desc !== 'Custom' && <span className={`absolute top-2.5 right-2.5 text-[9px] font-bold px-1.5 py-0.5 rounded ${isSelected ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-500'}`}>{item.desc.replace('Max ', 'MAX ')}</span>}
                                            <span className={`text-[10px] lowercase leading-tight block ${isSelected ? 'text-brand-600' : 'text-gray-500'}`}>{item.examples}</span>
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </motion.div>
                </AnimatePresence>
            </div>

            <AnimatePresence>
                {data.subCategory !== '' && (
                    <motion.div
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        className="overflow-hidden space-y-4"
                    >
                        {data.category === 'A' && (
                            <div className="grid grid-cols-2 gap-3 px-1">
                                {['Length', 'Width', 'Height', 'Weight'].map((dim) => {
                                    const prop = dim.toLowerCase() as keyof typeof data.dimensions;
                                    const unitLabel = dim === 'Weight' ? `(${getWeightUnitLabel(data.vehicle)})` : '(cm)';
                                    return (
                                        <div key={dim} className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase">{dim} {unitLabel}</label>
                                            <input
                                                type="number"
                                                value={data.dimensions[prop]}
                                                onChange={e => updateData({ dimensions: { ...data.dimensions, [prop]: e.target.value } })}
                                                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {data.category === 'B' && (
                            <div className="space-y-3 px-1">
                                {/* Bulk weight + unit + insured + quantity — the consolidated LTL server
                                    engine auto-selects the truck tier from this weight (kg-normalized). */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase">Total Weight</label>
                                        <input
                                            type="number"
                                            inputMode="decimal"
                                            placeholder="e.g. 900"
                                            value={data.dimensions.weight}
                                            onChange={e => updateData({ dimensions: { ...data.dimensions, weight: e.target.value } })}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase">Unit</label>
                                        <select
                                            value={data.quantityUnit || 'kg'}
                                            onChange={e => updateData({ quantityUnit: e.target.value as WeightUnit })}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
                                        >
                                            <option value="kg">kilograms (kg)</option>
                                            <option value="tonnes">tonnes (T)</option>
                                            <option value="litres">litres (L)</option>
                                            <option value="m3">cubic metres (m³)</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase">Quantity</label>
                                        <input
                                            type="number"
                                            inputMode="numeric"
                                            min={1}
                                            value={data.quantity ?? 1}
                                            onChange={e => updateData({ quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1">
                                            <ShieldCheck size={10} className="text-blue-500" /> Insured?
                                        </label>
                                        <button
                                            onClick={() => updateData({ isInsured: !data.isInsured })}
                                            className={`w-full py-2.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 transition-all ${data.isInsured ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-500'}`}
                                        >
                                            <div className={`w-3 h-3 rounded-full ${data.isInsured ? 'bg-blue-500 animate-pulse' : 'bg-gray-200'}`} />
                                            {data.isInsured ? 'Insured' : 'Not insured'}
                                        </button>
                                    </div>
                                </div>
                                {/* Custom cargo description — required when the user picked
                                    the "Custom" subcategory (general or specialised flow). */}
                                {(data.subCategory === 'Custom') && (
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1">
                                            <ShieldAlert size={10} className="text-amber-500" /> Describe this cargo
                                        </label>
                                        <textarea
                                            placeholder="e.g. 10×90kg sacks of Irish potatoes, packed on pallets, keep dry"
                                            value={data.customCargoDesc || ''}
                                            onChange={e => updateData({ customCargoDesc: e.target.value })}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-bold focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all min-h-[64px]"
                                        />
                                    </div>
                                )}
                                {/* Vehicle-for-weight chip — only under Standard Consolidated LTL.
                                    Reads the cargo weight + unit, maps it to a truck tier (Client mirror
                                    of pricing.pickConsolidationTruck) so the customer knows which shared
                                    truck will be allocated before the quote runs. */}
                                {data.serviceType === 'Standard' && data.subCategory !== '' && data.subCategory !== 'Custom' && (() => {
                                    const weightKg = toKg(parseFloat(data.dimensions.weight) || 0, data.quantityUnit);
                                    const tierLabel = pickConsolidationTruckLabel(weightKg);
                                    if (!tierLabel) return null;
                                    return (
                                        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5 text-emerald-800">
                                            <ShieldCheck size={14} className="text-emerald-600" />
                                            <p className="text-[11px] font-bold leading-tight">
                                                Consolidated in a shared <span className="font-black">{tierLabel}</span> truck ({Math.round(weightKg).toLocaleString()} kg payload)
                                            </p>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}

                        <div className="bg-white border border-gray-200 rounded-2xl p-3 shadow-sm space-y-4">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand-600">Package Details</p>
                                <h4 className="text-sm font-black text-gray-900">Add proof, value and handling notes</h4>
                            </div>

                            <div className="w-full">
                                <label className="text-[10px] font-bold text-gray-500 uppercase mb-2 block">Item Photo (Recommended)</label>
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`relative w-full aspect-video rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${data.itemImage ? 'border-brand-500 bg-brand-50' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'}`}
                                >
                                    {data.itemImage ? (
                                        <>
                                            <img src={data.itemImage} className="w-full h-full object-cover rounded-2xl" alt="Item" />
                                            <button
                                                onClick={(e) => { e.stopPropagation(); updateData({ itemImage: undefined }); }}
                                                className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-md text-red-500 hover:bg-red-50"
                                            >
                                                <X size={16} />
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-brand-600 mb-2">
                                                {uploading ? <Loader2 size={24} className="animate-spin" /> : <Camera size={24} />}
                                            </div>
                                            <span className="text-xs font-bold text-gray-600">Snap or Upload Item Photo</span>
                                            <span className="text-[10px] text-gray-400 mt-1">Helps with insurance and verification</span>
                                        </>
                                    )}
                                </div>
                                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                            </div>

                            <div className="grid grid-cols-2 gap-3 w-full">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1">
                                        <ShieldCheck size={10} className="text-blue-500" /> Est. Value (KES)
                                    </label>
                                    <input
                                        type="number"
                                        placeholder="e.g. 5000"
                                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-500 transition-all"
                                        value={data.itemValue || ''}
                                        onChange={(e) => updateData({ itemValue: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1">
                                        <AlertTriangle size={10} className="text-amber-500" /> Handle with care?
                                    </label>
                                    {allowsFragile(data.vehicle) ? (
                                        <button
                                            onClick={() => updateData({ isFragile: !data.isFragile })}
                                            className={`w-full py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${data.isFragile ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-gray-200 bg-white text-gray-500'}`}
                                        >
                                            <div className={`w-3 h-3 rounded-full ${data.isFragile ? 'bg-amber-500 animate-pulse' : 'bg-gray-200'}`} />
                                            {data.isFragile ? 'Fragile' : 'Standard'}
                                        </button>
                                    ) : (
                                        <div className="w-full py-2.5 rounded-xl border border-gray-100 bg-gray-50 text-xs font-bold text-gray-300 flex items-center justify-center gap-2">
                                            <AlertTriangle size={12} /> Not available for this vehicle
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="w-full">
                                <label className="text-[10px] font-bold text-gray-500 uppercase mb-2 block">Handling Notes</label>
                                <textarea
                                    placeholder="e.g. Please use a blanket, keep it upright..."
                                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold min-h-[80px] focus:ring-2 focus:ring-brand-500 transition-all"
                                    value={data.handlingNotes || ''}
                                    onChange={(e) => updateData({ handlingNotes: e.target.value })}
                                />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex gap-2 sticky bottom-0 bg-white z-10">
                <button onClick={() => prevStep()} className="w-12 h-[48px] bg-gray-100 text-gray-700 rounded-xl flex items-center justify-center hover:bg-gray-200"><ArrowLeft size={16} /></button>
                <button
                    onClick={() => nextStep()}
                    disabled={!data.subCategory}
                    className="flex-1 h-[48px] bg-gray-900 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 transition-all"
                >
                    Confirm Cargo <ArrowRight size={16} />
                </button>
            </div>
        </div>
    );
};
