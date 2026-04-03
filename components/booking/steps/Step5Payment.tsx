import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Banknote, Check, ReceiptText, Shield, Truck, MapPin } from 'lucide-react';
import { useBooking } from '../BookingContext';
import mpesaLogo from '../../../assets/mpesa.png';

interface Step5Props {
    submit: () => void;
}

export const Step5Payment: React.FC<Step5Props> = ({ submit }) => {
    const { data, updateData, prevStep } = useBooking();

    return (
        <div className="space-y-4">
            {/* Booking Summary Card (The Receipt) */}
            <div className="bg-slate-900 rounded-[1.5rem] p-5 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                
                <div className="flex justify-between items-start mb-4 relative z-10">
                    <div>
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Order Summary</h4>
                        <div className="flex items-center gap-2 mt-1">
                            <Truck size={14} className="text-brand-400" />
                            <span className="text-sm font-bold">{data.vehicle || 'Standard'} • {data.serviceType}</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="text-2xl font-black text-white">
                            KES {(data.price || 0).toLocaleString()}
                        </span>
                    </div>
                </div>

                <div className="space-y-2 border-t border-slate-800 pt-4 relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        <p className="text-[11px] font-medium text-slate-300 truncate">{data.pickup}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        <p className="text-[11px] font-medium text-slate-300 truncate">{data.dropoff || data.waypoints[data.waypoints.length-1]}</p>
                    </div>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-2 mt-4 relative z-10">
                    {data.isReturnTrip && (
                        <div className="px-2 py-1 rounded-md bg-brand-500/20 text-brand-400 text-[9px] font-black uppercase border border-brand-500/30">
                            Return Leg Included
                        </div>
                    )}
                    {data.helpersCount > 0 && (
                        <div className="px-2 py-1 rounded-md bg-blue-500/20 text-blue-400 text-[9px] font-black uppercase border border-blue-500/30">
                            {data.helpersCount} Loaders
                        </div>
                    )}
                    {data.isFragile && (
                        <div className="px-2 py-1 rounded-md bg-amber-500/20 text-amber-400 text-[9px] font-black uppercase border border-amber-500/30">
                            Fragile Item
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 pb-1 px-1">
                <button
                    onClick={() => updateData({ paymentMethod: 'M-Pesa' })}
                    className={`p-0 rounded-xl border overflow-hidden relative flex flex-col items-center justify-center transition-all min-h-[5rem] ${data.paymentMethod === 'M-Pesa' ? 'border-green-500 bg-green-50/50 ring-1 ring-green-500 scale-[1.02] shadow-sm' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
                >
                    <div className="absolute inset-0 w-full h-full flex items-center justify-center overflow-hidden rounded-xl p-1">
                        <img
                            src={mpesaLogo}
                            alt="M-Pesa"
                            className={`w-full h-full object-contain mix-blend-multiply ${data.paymentMethod === 'M-Pesa' ? '' : 'grayscale opacity-60 hover:opacity-80'}`}
                        />
                    </div>
                </button>
                <button
                    onClick={() => updateData({ paymentMethod: 'Cash' })}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all min-h-[5rem] ${data.paymentMethod === 'Cash' ? 'border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-500 scale-[1.02] shadow-sm' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'}`}
                >
                    <Banknote size={24} className={data.paymentMethod === 'Cash' ? 'text-brand-600' : ''} />
                    <span className="font-bold text-sm">Cash on Delivery</span>
                </button>
            </div>

            <AnimatePresence mode="wait">
                {data.paymentMethod === 'M-Pesa' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-1">
                        <label className="text-xs font-bold text-gray-600 ml-1">M-Pesa Phone Number</label>
                        <input
                            type="tel"
                            className="w-full px-3.5 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-green-500 text-sm font-bold transition-all text-gray-900"
                            value={data.paymentPhone} onChange={e => updateData({ paymentPhone: e.target.value })}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex gap-2 pt-1">
                <button onClick={() => prevStep()} className="px-4 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200">Back</button>
                <button onClick={submit} className="flex-1 py-3 bg-brand-600 text-white rounded-xl text-sm font-bold flex items-center gap-1.5 justify-center shadow-lg shadow-brand-600/30 hover:bg-brand-500 transition-colors">
                    Confirm & Pay <Check size={16} />
                </button>
            </div>
        </div>
    );
};
