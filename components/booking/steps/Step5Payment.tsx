import React from 'react';
import { Banknote, Check, ArrowLeft, ChevronRight } from 'lucide-react';
import { useBooking } from '../BookingContext';
import { VEHICLES } from '../constants';
import { getEligibleVehicles, getWeightUnitLabel, allowsReturnTrip } from '../../../services/vehicleCapabilities';
import mpesaLogo from '../../../assets/mpesa.png';

interface Step5Props {
    submit: () => void;
}

export const Step5Payment: React.FC<Step5Props> = ({ submit }) => {
    const { data, updateData, prevStep, setStep } = useBooking();
    const routeStops = [data.pickup, ...data.waypoints, data.dropoff].filter(Boolean);
    const weightVal = parseFloat(data.dimensions.weight) || 0;
    const eligibleVehicles = getEligibleVehicles({ category: data.category, weightKg: weightVal, distanceKm: data.distanceKm, subCategory: data.subCategory });
    const activeVehicle = eligibleVehicles.find(v => v.id === data.vehicle) || eligibleVehicles[0];
    const displayPrice = data.price || 0;
    const weightUnit = getWeightUnitLabel(data.vehicle);

    // Cash only available for Express (Standard = consolidated, M-Pesa only).
    const allowCash = data.serviceType !== 'Standard';
    const showReturn = data.serviceType !== 'Standard' && allowsReturnTrip(data.vehicle);

    const badges = [
        showReturn && data.isReturnTrip && 'Return',
        data.helpersCount > 0 && `${data.helpersCount} loader${data.helpersCount > 1 ? 's' : ''}`,
        data.isFragile && 'Fragile',
        data.isScheduled && data.pickupTime ? 'Scheduled' : 'Now',
    ].filter(Boolean);

    return (
        <div className="space-y-2">
            {/* Payment method — primary focus. Cash gated to Express only. */}
            <div className={`grid ${allowCash ? 'grid-cols-2' : 'grid-cols-1'} gap-2 pt-1`}>
                <button
                    onClick={() => updateData({ paymentMethod: 'M-Pesa' })}
                    className={`rounded-xl border overflow-hidden relative flex items-center justify-center transition-all h-12 ${data.paymentMethod === 'M-Pesa' ? 'border-green-500 bg-green-50/50 ring-1 ring-green-500' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
                >
                    <img src={mpesaLogo} alt="M-Pesa" className={`h-full w-full object-cover mix-blend-multiply ${data.paymentMethod === 'M-Pesa' ? '' : 'grayscale opacity-50'}`} />
                </button>
                {allowCash ? (
                    <button
                        onClick={() => updateData({ paymentMethod: 'Cash' })}
                        className={`rounded-xl border flex items-center justify-center gap-2 transition-all h-12 ${data.paymentMethod === 'Cash' ? 'border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-500' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'}`}
                    >
                        <Banknote size={18} className={data.paymentMethod === 'Cash' ? 'text-brand-600' : ''} />
                        <span className="font-bold text-xs">Cash</span>
                    </button>
                ) : (
                    <div className="rounded-xl border border-gray-100 bg-gray-50 flex items-center justify-center gap-2 h-12 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        M-Pesa only · Standard
                    </div>
                )}
            </div>

            {/* Price row — always same height */}
            <div className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-200 flex items-center justify-between gap-3">
                {data.paymentMethod === 'M-Pesa' ? (
                    <input
                        type="tel"
                        placeholder="M-Pesa number"
                        className="flex-1 min-w-0 px-0 py-0 bg-transparent border-none focus:ring-0 text-sm font-bold text-gray-900 placeholder-gray-400 outline-none"
                        value={data.paymentPhone} onChange={e => updateData({ paymentPhone: e.target.value })}
                    />
                ) : (
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total</span>
                )}
                <span className="text-lg font-black text-gray-900 whitespace-nowrap flex-shrink-0">
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
                    <button onClick={() => setStep(1)} className={`${data.serviceType === 'Standard' ? 'w-full' : 'flex-1'} flex items-center justify-between px-3 py-2.5 rounded-xl bg-blue-50 border border-blue-200/60 hover:bg-blue-100/70 transition-colors`}>
                        <div className="min-w-0">
                            <div className="text-[9px] font-bold uppercase tracking-wider text-blue-400">Package</div>
                            <div className="text-xs font-bold text-gray-900 truncate">
                                {data.subCategory || 'Not set'}{weightVal > 0 && <span className="text-gray-500 font-normal"> · {weightVal} {weightUnit}</span>}
                            </div>
                        </div>
                        <ChevronRight size={14} className="text-blue-300 flex-shrink-0" />
                    </button>
                    {data.serviceType !== 'Standard' && (
                        <button onClick={() => setStep(2)} className="flex-1 flex items-center justify-between px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200/60 hover:bg-amber-100/70 transition-colors">
                            <div className="min-w-0">
                                <div className="text-[9px] font-bold uppercase tracking-wider text-amber-500">Vehicle</div>
                                <div className="text-xs font-bold text-gray-900 truncate">{activeVehicle?.label || data.serviceType}</div>
                            </div>
                            <ChevronRight size={14} className="text-amber-300 flex-shrink-0" />
                        </button>
                    )}
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
