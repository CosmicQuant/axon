import React, { useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Loader2, Users, Clock } from 'lucide-react';
import { useBooking } from '../BookingContext';
import { VEHICLES, CARGO_VEHICLE_MAP } from '../constants';
import { useMapState } from '@/context/MapContext';
import { httpsCallable } from 'firebase/functions';
import {
    getEligibleVehicles, allowsFragile, allowsReturnTrip,
    requiresHelpers, getSuggestedHelpers, requiresScheduling, allowsConsolidated
} from '../../../services/vehicleCapabilities';

export const Step3How = () => {
    const { data, updateData, nextStep, prevStep } = useBooking();
    const { pickupCoords, dropoffCoords, waypointCoords } = useMapState();
    const [fetchingQuote, setFetchingQuote] = useState(false);
    const quoteRequestRef = useRef(0);

    const isStandard = data.serviceType === 'Standard';
    const weightVal = parseFloat(data.dimensions.weight) || 0;

    // Smart filter (Option A): use the capability service so all gating logic
    // lives in one place (vehicleCapabilities.ts). Also normalizes weight units.
    const eligibleVehicles = useMemo(
        () => getEligibleVehicles({ category: data.category, weightKg: weightVal, distanceKm: data.distanceKm, subCategory: data.subCategory }),
        [data.category, weightVal, data.distanceKm, data.subCategory]
    );
    const activeVehicle = eligibleVehicles.find(v => v.id === data.vehicle) || eligibleVehicles[0];

    // ── Vehicle-aware derived flags ──
    const showHelpers = !isStandard && (requiresHelpers(data.vehicle) || (data.helpersCount || 0) > 0);
    const showReturnTrip = !isStandard && allowsReturnTrip(data.vehicle) && allowsFragile(data.vehicle);
    const mustSchedule = !isStandard && requiresScheduling(data.vehicle);
    // Service-type lock: heavy/hazmat vehicles forbid consolidation. Hide the
    // Standard toggle and force Express so the user can't accidentally clear
    // the vehicle by picking "Standard".
    const canConsolidate = allowsConsolidated(data.vehicle);
    const visibleServiceTypes = canConsolidate
        ? [{ id: 'Standard', label: '📦 Standard', desc: 'Consolidated & affordable', accent: 'brand' }, { id: 'Express', label: '⚡ Express', desc: 'Dedicated vehicle, fast', accent: 'orange' }]
        : [{ id: 'Express', label: '⚡ Express', desc: 'Dedicated vehicle', accent: 'orange' }];

    // Auto-select first eligible vehicle + auto-prescribed helpers when heavy
    useEffect(() => {
        if (isStandard) {
            if (data.vehicle) updateData({ vehicle: '' });
            return;
        }
        if (eligibleVehicles.length > 0) {
            let updates: any = {};
            if (!data.vehicle || !eligibleVehicles.some(v => v.id === data.vehicle)) {
                updates.vehicle = eligibleVehicles[0].id;
            }
            // If the chosen vehicle requires helpers, pre-select the suggested count
            const chosenId = updates.vehicle ?? data.vehicle;
            const suggested = getSuggestedHelpers(chosenId);
            if (suggested > 0 && (data.helpersCount || 0) < suggested) {
                updates.helpersCount = suggested;
            }
            if (requiresScheduling(chosenId) && !data.isScheduled) {
                updates.isScheduled = true;
            }
            if (!allowsConsolidated(chosenId) && data.serviceType !== 'Express') {
                updates.serviceType = 'Express';
            }
            if (Object.keys(updates).length > 0) updateData(updates);
        }
    }, [isStandard, eligibleVehicles, data.vehicle, data.helpersCount, data.isScheduled, updateData]);

    // Live Quote Fetcher: Triggered whenever selection changes
    useEffect(() => {
        const fetchLiveQuote = async () => {
            if (!pickupCoords || (!dropoffCoords && waypointCoords.length === 0)) return;
            // Only require vehicle for non-standard or if vehicle is already picked
            if (!isStandard && !data.vehicle) return;

            const requestId = ++quoteRequestRef.current;

            try {
                setFetchingQuote(true);
                updateData({ calculatingQuote: true });

                const { functions } = await import('../../../firebase');
                if (!functions) return;

                const actualDropoff = dropoffCoords || (waypointCoords.length > 0 ? waypointCoords[waypointCoords.length - 1] : null);
                if (!actualDropoff) return; // Prevent calling backend without a destination

                const calculateQuote = httpsCallable(functions, 'calculateQuote');
                const response: any = await calculateQuote({
                    pickupCoords,
                    dropoffCoords: actualDropoff,
                    waypoints: waypointCoords,
                    vehicle: isStandard ? 'standard' : (data.vehicle || 'boda'),
                    serviceType: data.serviceType,
                    helpersCount: data.helpersCount || 0,
                    isReturnTrip: data.isReturnTrip || false,
                    isFragile: data.isFragile || false,
                    category: data.category,
                    subCategory: data.subCategory,
                    payloadWeight: parseFloat(data.dimensions.weight) || 0
                });

                if (requestId !== quoteRequestRef.current) return;

                const { quoteId, price, driverRate, distanceKm, durationMinutes, breakdown } = response.data;
                updateData({ quoteId, price, driverRate, calculatingQuote: false });
            } catch (error) {
                if (requestId !== quoteRequestRef.current) return;
                console.error("Live quote failed:", error);
                updateData({ calculatingQuote: false });
            } finally {
                if (requestId === quoteRequestRef.current) {
                    setFetchingQuote(false);
                }
            }
        };

        const timer = setTimeout(fetchLiveQuote, 600); // Debounce to prevent API spam
        return () => clearTimeout(timer);
    }, [data.vehicle, data.serviceType, data.helpersCount, pickupCoords, dropoffCoords, waypointCoords, isStandard, updateData]);

    const handleContinue = () => {
        if ((!isStandard && !data.vehicle) || fetchingQuote) return;
        nextStep();
    };

    return (
        <div className="space-y-4">
{/* Service Type Toggle — Standard hidden when vehicle forbids consolidation */}
            <div className={`grid ${visibleServiceTypes.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-2 px-0.5 pt-1`}>
                {visibleServiceTypes.map(svc => (
                    <button
                        key={svc.id}
                        onClick={() => updateData({ serviceType: svc.id as any, ...(svc.id === 'Standard' ? { vehicle: '' } : {}) })}
                        className={`text-left p-3 rounded-xl border-2 transition-all ${data.serviceType === svc.id
                            ? svc.accent === 'orange'
                                ? 'border-orange-500 bg-orange-50 ring-1 ring-orange-500'
                                : 'border-brand-500 bg-brand-50 ring-1 ring-brand-500'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                            }`}
                    >
                        <div className={`text-sm font-bold ${data.serviceType === svc.id
                            ? svc.accent === 'orange' ? 'text-orange-700' : 'text-brand-700'
                            : 'text-gray-700'
                            }`}>{svc.label}</div>
                        <div className={`text-[10px] mt-0.5 ${data.serviceType === svc.id
                            ? svc.accent === 'orange' ? 'text-orange-600' : 'text-brand-600'
                            : 'text-gray-400'
                            }`}>{svc.desc}</div>
                    </button>
                ))}
            </div>

            {/* Vehicle Grid - Only for Express */}
            <AnimatePresence>
                {!isStandard && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="relative">
                            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 pt-0.5 px-0.5">
                                {eligibleVehicles.length === 0 ? (
                                    <div className="w-full p-3 bg-red-50 text-red-600 rounded-xl text-xs font-medium border border-red-100">No vehicles support these limits.</div>
                                ) : (
                                    eligibleVehicles.map(v => (
                                        <button
                                            key={v.id} onClick={() => updateData({ vehicle: v.id })}
                                            className={`flex-shrink-0 w-[80px] p-2 rounded-[1rem] border flex flex-col items-center text-center transition-all duration-200 ${data.vehicle === v.id ? `border-gray-300 ${v.accentBgLight} shadow-sm ring-1 ring-gray-300 scale-[1.02]` : 'border-gray-200 bg-white hover:border-gray-300 scale-100'}`}
                                        >
                                            <img src={v.img} alt={v.label} className="w-10 h-10 object-contain mb-0.5" />
                                            <div className="font-bold text-[11px] leading-tight text-gray-900 line-clamp-1">{v.label}</div>
                                            <div className="text-[9px] font-medium text-gray-500 mt-0.5">≤ {v.constraints.maxWeight.toLocaleString()}{v.constraints.weightUnit === 'litres' ? ' L' : v.constraints.weightUnit === 'tonnes' ? 'T' : 'kg'}</div>
                                        </button>
                                    ))
                                )}
                            </div>
                            {/* Scroll fade hint */}
                            {eligibleVehicles.length > 3 && (
                                <div className="pointer-events-none absolute right-0 top-0 bottom-2 w-10 bg-gradient-to-l from-white to-transparent" />
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Helpers — gated by vehicle capability. Hidden for boda/tuktuk/probox/van
                (loaders not relevant); shown with pre-set suggested count for heavy/hazmat. */}
            {showHelpers && (
                <div className={`${requiresHelpers(data.vehicle) ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'} border rounded-xl p-3 flex items-center justify-between`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${requiresHelpers(data.vehicle) ? 'bg-amber-100 text-amber-600' : 'bg-brand-100 text-brand-600'}`}>
                            <Users size={18} />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-gray-900">{requiresHelpers(data.vehicle) ? 'Loaders required' : 'Add loaders?'}</h4>
                            <p className="text-[10px] text-gray-500">+KES 500 per helper{requiresHelpers(data.vehicle) ? ' · for heavy cargo' : ''}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => updateData({ helpersCount: Math.max(0, (data.helpersCount || 0) - 1) })}
                            className="w-8 h-8 rounded-full bg-white border border-gray-200 font-bold text-gray-700 hover:bg-gray-100 flex items-center justify-center"
                        >-</button>
                        <span className="font-bold text-sm w-4 text-center">{data.helpersCount || 0}</span>
                        <button
                            onClick={() => updateData({ helpersCount: (data.helpersCount || 0) + 1 })}
                            className="w-8 h-8 rounded-full bg-white border border-gray-200 font-bold text-gray-700 hover:bg-gray-100 flex items-center justify-center"
                        >+</button>
                    </div>
                </div>
            )}

            {/* Heavy/hazmat scheduled-only notice */}
            {mustSchedule && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-3">
                    <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
                    <div>
                        <h4 className="text-sm font-bold text-amber-900">Scheduled delivery</h4>
                        <p className="text-[10px] text-amber-700">Heavy/hazmat vehicles must pre-book. Pickup happens at your chosen time, not ASAP.</p>
                    </div>
                </div>
            )}

            <div className="flex gap-2 sticky bottom-0 bg-white z-10">
                <button onClick={() => prevStep()} className="w-12 h-[48px] bg-gray-100 text-gray-700 rounded-xl flex items-center justify-center hover:bg-gray-200"><ArrowLeft size={16} /></button>
                <button
                    onClick={handleContinue}
                    disabled={(!isStandard && !data.vehicle) || fetchingQuote}
                    className="flex-1 h-[48px] bg-gray-900 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                    {fetchingQuote ? <Loader2 size={16} className="animate-spin" /> : (isStandard ? "Confirm Service" : "Confirm Vehicle")}
                    {!fetchingQuote && <ArrowRight size={16} />}
                </button>
            </div>
        </div>
    );
};
