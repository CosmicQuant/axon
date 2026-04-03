import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Loader2, Users } from 'lucide-react';
import { useBooking } from '../BookingContext';
import { VEHICLES } from '../constants';
import { useMapState } from '@/context/MapContext';
import { httpsCallable } from 'firebase/functions';

export const Step3How = () => {
    const { data, updateData, nextStep, prevStep } = useBooking();
    const { pickupCoords, dropoffCoords, waypointCoords } = useMapState();
    const [fetchingQuote, setFetchingQuote] = useState(false);

    const isStandard = data.serviceType === 'Standard';
    const weightVal = parseFloat(data.dimensions.weight) || 0;

    const eligibleVehicles = VEHICLES.filter(v => {
        if (data.distanceKm > v.maxDist) return false;
        if (!v.allowedCats.includes(data.category)) return false;
        if (data.category === 'A' && weightVal > v.maxWeight) return false;
        return true;
    });

    // Auto-select first eligible vehicle if none selected
    useEffect(() => {
        if (!isStandard && eligibleVehicles.length > 0 && !data.vehicle) {
            updateData({ vehicle: eligibleVehicles[0].id });
        }
    }, [isStandard, eligibleVehicles, data.vehicle, updateData]);

    // Live Quote Fetcher: Triggered whenever selection changes
    useEffect(() => {
        const fetchLiveQuote = async () => {
            if (!pickupCoords || (!dropoffCoords && waypointCoords.length === 0)) return;
            // Only require vehicle for non-standard or if vehicle is already picked
            if (!isStandard && !data.vehicle) return;

            try {
                setFetchingQuote(true);
                updateData({ calculatingQuote: true });

                const { functions } = await import('../../../firebase');
                if(!functions) return;

                const actualDropoff = dropoffCoords || (waypointCoords.length > 0 ? waypointCoords[waypointCoords.length - 1] : null);
                if (!actualDropoff) return; // Prevent calling backend without a destination

                const calculateQuote = httpsCallable(functions, 'calculateQuote');
                const response: any = await calculateQuote({
                    pickupCoords,
                    dropoffCoords: actualDropoff,
                    waypoints: waypointCoords,
                    vehicle: data.vehicle || 'boda', // fallback for price preview
                    serviceType: data.serviceType,
                    helpersCount: data.helpersCount || 0,
                    isReturnTrip: data.isReturnTrip || false
                });

                const { quoteId, price } = response.data;
                updateData({ quoteId, price, calculatingQuote: false });
            } catch (error) {
                console.error("Live quote failed:", error);
                updateData({ calculatingQuote: false });
            } finally {
                setFetchingQuote(false);
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
            {/* Service Type Toggle */}
            <div className="grid grid-cols-2 gap-2 px-0.5 pt-1">
                {[
                    { id: 'Standard', label: '📦 Standard', desc: 'Consolidated & affordable', accent: 'brand' },
                    { id: 'Express', label: '⚡ Express', desc: 'Dedicated vehicle, fast', accent: 'orange' }
                ].map(svc => (
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
                        <div className="flex flex-wrap gap-2 pb-2 pt-0.5 px-0.5 justify-center w-full">
                            {eligibleVehicles.length === 0 ? (
                                <div className="w-full p-3 bg-red-50 text-red-600 rounded-xl text-xs font-medium border border-red-100">No vehicles support these limits.</div>
                            ) : (
                                eligibleVehicles.map(v => (
                                    <button
                                        key={v.id} onClick={() => updateData({ vehicle: v.id })}
                                        className={`flex-shrink-0 w-[85px] p-2.5 rounded-[1rem] border flex flex-col items-center text-center transition-all duration-200 ${data.vehicle === v.id ? `border-gray-300 ${v.bgLight} shadow-sm ring-1 ring-gray-300 scale-[1.02]` : 'border-gray-200 bg-white hover:border-gray-300 scale-100'}`}
                                    >
                                        <img src={v.img} alt={v.label} className="w-10 h-10 object-contain mb-0.5" />
                                        <div className="font-bold text-[11px] leading-tight text-gray-900 line-clamp-1">{v.label}</div>
                                        <div className="text-[9px] font-medium text-gray-500 mt-0.5">≤ {v.maxWeight >= 1000 ? `${v.maxWeight / 1000}T` : `${v.maxWeight}kg`}</div>
                                    </button>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Need Helpers? Toggle */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-600">
                        <Users size={18} />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-gray-900">Need Loaders?</h4>
                        <p className="text-[10px] text-gray-500">+KES 500 per helper</p>
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

            <div className="flex items-center justify-end pt-2">
                <div className="flex gap-2 w-full">
                    <button onClick={() => prevStep()} className="px-3 bg-gray-100 text-gray-700 rounded-xl flex items-center justify-center hover:bg-gray-200"><ArrowLeft size={16} /></button>
                    <button 
                        onClick={handleContinue} 
                        disabled={(!isStandard && !data.vehicle) || fetchingQuote} 
                        className="flex-1 py-3.5 bg-gray-900 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-gray-900/20 disabled:opacity-50"
                    >
                        {fetchingQuote ? <Loader2 size={16} className="animate-spin" /> : "Continue to Details"} 
                        {!fetchingQuote && <ArrowRight size={16} />}
                    </button>
                </div>
            </div>
        </div>
    );
};
