import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { SlideToAccept } from './SlideToAccept';
import { MapPin, Flag, Clock, Zap, X, TrendingUp, Package, Navigation } from 'lucide-react';
import type { DeliveryOrder } from '../../types';

interface TripRequestModalProps {
    order: DeliveryOrder;
    driverCoords: { lat: number; lng: number } | null;
    nearbyDemand: number;
    onAccept: () => void;
    onDecline: () => void;
    countdownSeconds?: number;
}

const haversineKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
    const R = 6371;
    const dLat = (b.lat - a.lat) * Math.PI / 180;
    const dLng = (b.lng - a.lng) * Math.PI / 180;
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
};

export const TripRequestModal: React.FC<TripRequestModalProps> = ({
    order,
    driverCoords,
    nearbyDemand,
    onAccept,
    onDecline,
    countdownSeconds = 15,
}) => {
    const [remaining, setRemaining] = useState(countdownSeconds);
    const [accepting, setAccepting] = useState(false);
    const firedRef = useRef(false);

    const fire = (kind: 'accept' | 'decline') => {
        if (firedRef.current) return;
        firedRef.current = true;
        if (kind === 'accept') { setAccepting(true); onAccept(); }
        else onDecline();
    };

    useEffect(() => {
        if (remaining <= 0) { fire('decline'); return; }
        const t = setTimeout(() => setRemaining(r => r - 1), 1000);
        return () => clearTimeout(t);
    }, [remaining]);

    const pickup = order.pickupCoords ?? (order as any).pickupCoordinates;
    const hasCoords = !!pickup && !!driverCoords && typeof pickup.lat === 'number';
    const distKm = hasCoords ? haversineKm(driverCoords!, pickup) : null;
    const etaMin = distKm != null ? Math.max(2, Math.ceil(distKm / 0.5)) : null; // ~30 km/h

    const fare = order.driverRate || Math.floor((order.price || 0) * 0.8);
    const surge = nearbyDemand >= 3;
    const surgeMultiplier = nearbyDemand >= 6 ? 1.5 : nearbyDemand >= 3 ? 1.25 : 1;

    // Countdown ring geometry
    const RING = 26;
    const CIRC = 2 * Math.PI * RING;
    const ringOffset = CIRC * (1 - remaining / countdownSeconds);

    const handleAccept = async () => fire('accept');

    return (
        <motion.div
            key={order.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center pointer-events-auto"
        >
            {/* Dark gradient backdrop */}
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950/95 via-slate-950/92 to-brand-950/95 backdrop-blur-md" />

            <motion.div
                initial={{ y: 60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                className="relative w-full max-w-md mx-3 mb-4 sm:mb-6 rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl bg-white"
            >
                {/* Top tint band */}
                <div className="relative h-28 bg-gradient-to-br from-brand-600 to-emerald-700 overflow-hidden">
                    <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
                    <div className="absolute left-6 bottom-4 flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center">
                            <Package className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/70">New Delivery Request</p>
                            <p className="text-white font-black text-lg leading-none tracking-tight">Axon Dispatch</p>
                        </div>
                    </div>
                    {/* Countdown ring */}
                    <div className="absolute right-6 bottom-4 flex flex-col items-center">
                        <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90">
                            <circle cx="32" cy="32" r={RING} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="6" />
                            <circle
                                cx="32" cy="32" r={RING} fill="none" stroke="white" strokeWidth="6" strokeLinecap="round"
                                strokeDasharray={CIRC} strokeDashoffset={ringOffset}
                                style={{ transition: 'stroke-dashoffset 1s linear' }}
                            />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-white font-black text-lg tabular-nums">
                            {remaining}
                        </span>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 pt-5">
                    {/* Fare + surge */}
                    <div className="flex items-end justify-between mb-5">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">Your Earnings</p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-4xl font-black tabular-nums text-gray-900 tracking-tight">
                                    KES {fare.toLocaleString()}
                                </span>
                            </div>
                        </div>
                        {surge ? (
                            <span className="flex items-center gap-1 bg-rose-50 text-rose-600 px-3 py-1.5 rounded-xl border border-rose-100 font-black text-xs uppercase tracking-wide">
                                <Zap className="w-3.5 h-3.5 fill-current" /> {surgeMultiplier}x Surge
                            </span>
                        ) : (
                            <span className="flex items-center gap-1 bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-xl border border-emerald-100 font-black text-xs uppercase tracking-wide">
                                <TrendingUp className="w-3.5 h-3.5" /> Steady
                            </span>
                        )}
                    </div>

                    {/* Trip chips */}
                    <div className="grid grid-cols-3 gap-2 mb-5">
                        <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100">
                            <Navigation className="w-4 h-4 text-brand-600 mb-1.5" />
                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">To Pickup</p>
                            <p className="text-sm font-black text-gray-900 tabular-nums">
                                {distKm != null ? `${distKm.toFixed(1)} km` : '—'}
                            </p>
                        </div>
                        <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100">
                            <Clock className="w-4 h-4 text-brand-600 mb-1.5" />
                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">ETA</p>
                            <p className="text-sm font-black text-gray-900 tabular-nums">
                                {etaMin != null ? `${etaMin} min` : '—'}
                            </p>
                        </div>
                        <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100">
                            <Flag className="w-4 h-4 text-brand-600 mb-1.5" />
                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Dropoff</p>
                            <p className="text-sm font-black text-gray-900 truncate" title={order.dropoff}>
                                {order.dropoff?.split(',')[0] || '—'}
                            </p>
                        </div>
                    </div>

                    {/* Pickup address */}
                    <div className="flex items-start gap-3 p-3 bg-white rounded-2xl border border-gray-100 mb-2">
                        <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
                            <MapPin className="w-4 h-4 text-brand-600" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Pickup</p>
                            <p className="text-sm font-bold text-gray-900 line-clamp-2 leading-tight">{order.pickup}</p>
                        </div>
                    </div>

                    {/* Secondary reject */}
                    <button
                        onClick={() => fire('decline')}
                        disabled={accepting}
                        className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white/80 active:scale-90 transition-all"
                        aria-label="Dismiss"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Slide to accept */}
                <div className="px-6 pb-6 pt-1">
                    <SlideToAccept onAccept={handleAccept} isLoading={accepting} />
                    <button
                        onClick={() => fire('decline')}
                        disabled={accepting}
                        className="w-full mt-3 py-2.5 text-xs font-black uppercase tracking-[0.2em] text-gray-400 hover:text-gray-700 transition-colors"
                    >
                        Decline
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};