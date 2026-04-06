import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Banknote, Check, ArrowLeft, ChevronRight } from 'lucide-react';
import { useBooking } from '../BookingContext';
import { VEHICLES } from '../constants';
import mpesaLogo from '../../../assets/mpesa.png';

interface Step5Props {
    submit: () => void;
}

export const Step5Payment: React.FC<Step5Props> = ({ submit }) => {
    const { data, updateData, prevStep, setStep } = useBooking();
    const routeStops = [data.pickup, ...data.waypoints, data.dropoff].filter(Boolean);
    const weightVal = parseFloat(data.dimensions.weight) || 0;
    const eligibleVehicles = VEHICLES.filter(v => {
        if (data.distanceKm > v.maxDist) return false;
        if (!v.allowedCats.includes(data.category)) return false;
        if (data.category === 'A' && weightVal > v.maxWeight) return false;
        return true;
    });
    const activeVehicle = VEHICLES.find(v => v.id === data.vehicle) || eligibleVehicles[0];
    const displayPrice = data.price || 0;

    const badges = [
        data.isReturnTrip && 'Return',
        data.helpersCount > 0 && `${data.helpersCount} loader${data.helpersCount > 1 ? 's' : ''}`,
        data.isFragile && 'Fragile',
        data.isScheduled && data.pickupTime ? 'Scheduled' : 'Now',
    ].filter(Boolean);

    return (
        <div className="space-y-2">
            {/* Payment method — primary focus */}
            <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                    onClick={() => updateData({ paymentMethod: 'M-Pesa' })}
                    className={`rounded-xl border overflow-hidden relative flex items-center justify-center transition-all h-12 ${data.paymentMethod === 'M-Pesa' ? 'border-green-500 bg-green-50/50 ring-1 ring-green-500' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
                >
                    <img src={mpesaLogo} alt="M-Pesa" className={`h-full w-full object-cover mix-blend-multiply ${data.paymentMethod === 'M-Pesa' ? '' : 'grayscale opacity-50'}`} />
                </button>
                <button
                    onClick={() => updateData({ paymentMethod: 'Cash' })}
                    className={`rounded-xl border flex items-center justify-center gap-2 transition-all h-12 ${data.paymentMethod === 'Cash' ? 'border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-500' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'}`}
                >
                    <Banknote size={18} className={data.paymentMethod === 'Cash' ? 'text-brand-600' : ''} />
                    <span className="font-bold text-xs">Cash</span>
                </button>
            </div>

            <AnimatePresence mode="wait">
                {data.paymentMethod === 'M-Pesa' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                        <input
                            type="tel"
                            placeholder="M-Pesa phone number"
                            className="w-full px-3.5 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-green-500 text-sm font-bold transition-all text-gray-900"
                            value={data.paymentPhone} onChange={e => updateData({ paymentPhone: e.target.value })}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Price banner */}
            <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total</span>
                <span className="text-lg font-black text-gray-900">
                    {displayPrice > 0 ? `KES ${displayPrice.toLocaleString()}` : <span className="text-sm text-gray-400 animate-pulse">Calculating...</span>}
                </span>
            </div>

            {/* Compact summary rows */}
            <div className="space-y-1.5">
                {/* Route */}
                <button onClick={() => setStep(0)} className="w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-xl bg-emerald-50 border border-emerald-200/60 hover:bg-emerald-100/70 transition-colors">
                    <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                            <span className="text-xs font-bold text-gray-900 truncate">{data.pickup || 'Pickup'}</span>
                        </div>
                        {data.waypoints.length > 0 && (
                            <div className="flex items-center gap-1.5 pl-0.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                                <span className="text-[11px] text-emerald-700 truncate">{data.waypoints.length} stop{data.waypoints.length > 1 ? 's' : ''}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                            <span className="text-xs font-bold text-gray-900 truncate">{data.dropoff || 'Destination'}</span>
                        </div>
                    </div>
                    <ChevronRight size={14} className="text-emerald-400 flex-shrink-0" />
                </button>

                {/* Package + Vehicle row */}
                <div className="flex gap-1.5">
                    <button onClick={() => setStep(1)} className="flex-1 flex items-center justify-between px-3 py-2.5 rounded-xl bg-blue-50 border border-blue-200/60 hover:bg-blue-100/70 transition-colors">
                        <div className="min-w-0">
                            <div className="text-[9px] font-bold uppercase tracking-wider text-blue-400">Package</div>
                            <div className="text-xs font-bold text-gray-900 truncate">{data.subCategory || 'Not set'}</div>
                        </div>
                        <ChevronRight size={14} className="text-blue-300 flex-shrink-0" />
                    </button>
                    <button onClick={() => setStep(2)} className="flex-1 flex items-center justify-between px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200/60 hover:bg-amber-100/70 transition-colors">
                        <div className="min-w-0">
                            <div className="text-[9px] font-bold uppercase tracking-wider text-amber-500">Vehicle</div>
                            <div className="text-xs font-bold text-gray-900 truncate">{activeVehicle?.label || data.serviceType}</div>
                        </div>
                        <ChevronRight size={14} className="text-amber-300 flex-shrink-0" />
                    </button>
                </div>

                {/* Receiver row */}
                <button onClick={() => setStep(3)} className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-purple-50 border border-purple-200/60 hover:bg-purple-100/70 transition-colors">
                    <div className="min-w-0">
                        <div className="text-[9px] font-bold uppercase tracking-wider text-purple-400">Receiver</div>
                        <div className="text-xs font-bold text-gray-900">{data.receiverName || 'Not set'} <span className="font-normal text-gray-500">{data.receiverPhone}</span></div>
                    </div>
                    <ChevronRight size={14} className="text-purple-300 flex-shrink-0" />
                </button>
            </div>

            {/* Badges row */}
            {badges.length > 0 && (
                <div className="flex flex-wrap gap-1.5 px-0.5">
                    {badges.map((b, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-md bg-gray-100 text-[10px] font-bold text-gray-600">{b}</span>
                    ))}
                </div>
            )}

            <div className="flex gap-2 sticky bottom-0 bg-white z-10">
                <button onClick={() => prevStep()} className="w-12 h-[48px] bg-gray-100 text-gray-700 rounded-xl flex items-center justify-center hover:bg-gray-200"><ArrowLeft size={16} /></button>
                <button onClick={submit} className="flex-1 h-[48px] bg-gray-900 text-white rounded-xl text-sm font-bold flex items-center gap-1.5 justify-center transition-colors">
                    Confirm & Pay <Check size={16} />
                </button>
            </div>
        </div>
    );
};
