import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUserOrders } from '../hooks/useOrders';
import { useMapState } from '../context/MapContext';
import { mapService } from '../services/mapService';
import { APP_CONFIG } from '../config';
import {
    Package, MapPin, Clock,
    ChevronRight, Truck, Navigation2, Container, Fuel, BadgePercent, Car, CarFront, Forklift, CarTaxiFront, ArrowRight, Bike, RefreshCw
} from 'lucide-react';
import { ServiceType } from '../types';

// Generate a Google Maps Static thumbnail URL for a lat/lng
const getMapThumbnail = (lat: number, lng: number, size = '80x80') =>
    `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=16&size=${size}&scale=2&maptype=roadmap&markers=size:small%7Ccolor:0x10b981%7C${lat},${lng}&key=${APP_CONFIG.GOOGLE_MAPS_API_KEY}`;

// Extract best available coords from an order (dropoffCoords → last stop → null)
const getOrderDropoffCoords = (order: any): { lat: number; lng: number } | null => {
    if (order.dropoffCoords?.lat && order.dropoffCoords?.lng) return order.dropoffCoords;
    if (order.stops?.length) {
        const last = order.stops[order.stops.length - 1];
        if (last?.lat && last?.lng) return { lat: last.lat, lng: last.lng };
    }
    return null;
};

// Small thumbnail component with fallback
const LocationThumb: React.FC<{ coords: { lat: number; lng: number } | null; size?: string; className?: string }> = ({ coords, size = '80x80', className = '' }) => {
    const [failed, setFailed] = useState(false);
    if (!coords || failed) {
        return (
            <div className={`bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 ${className}`}>
                <MapPin className="w-4 h-4 text-gray-300" />
            </div>
        );
    }
    return (
        <img
            src={getMapThumbnail(coords.lat, coords.lng, size)}
            alt="Location"
            onError={() => setFailed(true)}
            className={`rounded-lg object-cover flex-shrink-0 ${className}`}
        />
    );
};

const CYCLING_HINTS = [
    '📍 Where are you sending to?',
    '🏙️ Westlands, Nairobi',
    '🌊 Mombasa',
    '📦 Mombasa Road Warehouse',
    '🏜️ Garissa',
    '✈️ JKIA Airport',
    '🏞️ Kisumu',
    '🏠 Kilimani, Off Ngong Rd',
    '🏜️ Daadab',
    '🏢 Upper Hill Towers',
    '🛒 Garden City Mall',
    '📍 Thika Road, Ruiru',
];

const CustomerHome: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { data: orders } = useUserOrders(user?.id || '');
    const { userLocation, locationAccuracy, ensureFreshLocation } = useMapState();

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState<Array<{ label: string }>>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [showLocationGate, setShowLocationGate] = useState(false);
    const [locating, setLocating] = useState(false);
    const [searchFocused, setSearchFocused] = useState(false);
    const [cyclingIndex, setCyclingIndex] = useState(0);

    // Cycle through placeholder hints
    useEffect(() => {
        if (searchQuery || searchFocused) return;
        const interval = setInterval(() => {
            setCyclingIndex(prev => (prev + 1) % CYCLING_HINTS.length);
        }, 3000);
        return () => clearInterval(interval);
    }, [searchQuery, searchFocused]);

    // Auto-trigger native location prompt on mount
    useEffect(() => {
        if (locationAccuracy === 'none') {
            ensureFreshLocation().catch(() => { });
        }
    }, []);
    const [permDenied, setPermDenied] = useState(false);
    const pendingNavRef = useRef<(() => void) | null>(null);

    // Check browser permission state for location
    useEffect(() => {
        if (typeof navigator === 'undefined' || !navigator.permissions) return;
        navigator.permissions.query({ name: 'geolocation' as PermissionName }).then(perm => {
            setPermDenied(perm.state === 'denied');
            perm.onchange = () => setPermDenied(perm.state === 'denied');
        }).catch(() => { });
    }, []);

    // Close suggestions on outside click
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    // Debounced Google Places search
    const handleSearchChange = useCallback((value: string) => {
        setSearchQuery(value);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (value.length < 2) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }
        setIsSearching(true);
        debounceRef.current = setTimeout(async () => {
            const results = await mapService.getSuggestions(value);
            setSuggestions(results);
            setShowSuggestions(results.length > 0);
            setIsSearching(false);
        }, 300);
    }, []);

    // Resolve current location for auto-pickup
    const getCurrentLocationData = useCallback(async () => {
        const cached = localStorage.getItem('axon_last_known_location');
        if (cached) {
            try {
                const { lat, lng } = JSON.parse(cached);
                const address = await mapService.reverseGeocode(lat, lng);
                return { address: address || 'Current Location', coords: { lat, lng } };
            } catch { /* fall through */ }
        }
        if (userLocation) {
            const address = await mapService.reverseGeocode(userLocation.lat, userLocation.lng);
            return { address: address || 'Current Location', coords: userLocation };
        }
        return { address: 'Current Location', coords: null };
    }, [userLocation]);

    // Location gate — ensures we have a real position before entering booking
    const gateLocation = useCallback(async (proceed: () => void) => {
        // Already have location — go ahead
        if (locationAccuracy !== 'none') { proceed(); return; }
        // Try to acquire location silently
        const coords = await ensureFreshLocation();
        if (coords) { proceed(); return; }
        // Still no location — show gate modal with a retry button
        pendingNavRef.current = proceed;
        setShowLocationGate(true);
    }, [locationAccuracy, ensureFreshLocation]);

    // Handle place selection from autocomplete
    const handlePlaceSelect = useCallback(async (placeLabel: string) => {
        setSearchQuery(placeLabel);
        setShowSuggestions(false);
        const doNavigate = async () => {
            // Get fresh coords directly from ensureFreshLocation to avoid stale closure
            const [geocoded, freshCoords] = await Promise.all([
                mapService.geocodeAddress(placeLabel).catch(() => null),
                ensureFreshLocation().catch(() => null),
            ]);
            let pickupAddress = 'Current Location';
            let pickupCoords: { lat: number; lng: number } | null = freshCoords;
            if (freshCoords) {
                try {
                    const addr = await mapService.reverseGeocode(freshCoords.lat, freshCoords.lng);
                    if (addr) pickupAddress = addr;
                } catch { /* keep default */ }
            }
            navigate('/book', {
                state: {
                    prefill: {
                        pickup: pickupAddress,
                        ...(pickupCoords && { pickupCoords }),
                        dropoff: geocoded?.formattedAddress || placeLabel,
                        ...(geocoded && { dropoffCoords: { lat: geocoded.lat, lng: geocoded.lng } })
                    }
                }
            });
        };
        gateLocation(doNavigate);
    }, [navigate, ensureFreshLocation, gateLocation]);

    // Handle "Send again" location click
    const handleSendAgain = useCallback(async (address: string, coords: { lat: number; lng: number } | null) => {
        const doNavigate = async () => {
            const currentLoc = await getCurrentLocationData();
            navigate('/book', {
                state: {
                    prefill: {
                        pickup: currentLoc.address,
                        ...(currentLoc.coords && { pickupCoords: currentLoc.coords }),
                        dropoff: address,
                        ...(coords && { dropoffCoords: coords })
                    }
                }
            });
        };
        gateLocation(doNavigate);
    }, [navigate, getCurrentLocationData, gateLocation]);

    // Handle quick action (Standard/Express/Boda) — resolve current location as pickup
    const handleQuickAction = useCallback(async (extra: Record<string, any>) => {
        const doNavigate = async () => {
            const currentLoc = await getCurrentLocationData();
            navigate('/book', {
                state: {
                    prefill: {
                        pickup: currentLoc.address,
                        ...(currentLoc.coords && { pickupCoords: currentLoc.coords }),
                        ...extra
                    }
                }
            });
        };
        gateLocation(doNavigate);
    }, [navigate, getCurrentLocationData, gateLocation]);

    // Active orders (in_transit, driver_assigned, pending) — sorted by urgency
    const activeOrders = useMemo(() => {
        if (!orders) return [];
        return orders
            .filter(o => ['in_transit', 'driver_assigned', 'pending'].includes(o.status))
            .sort((a, b) => {
                const priority: Record<string, number> = { in_transit: 0, driver_assigned: 1, pending: 2 };
                return (priority[a.status] ?? 3) - (priority[b.status] ?? 3);
            });
    }, [orders]);

    // Frequent dropoff destinations for quick re-booking
    const frequentLocations = useMemo(() => {
        if (!orders || orders.length === 0) return [];
        const locationMap = new Map<string, { address: string, coords: { lat: number; lng: number } | null, count: number }>();
        for (const order of orders) {
            if (order.dropoff) {
                const key = order.dropoff.split(',')[0].trim().toLowerCase();
                const existing = locationMap.get(key);
                if (existing) existing.count++;
                else locationMap.set(key, { address: order.dropoff, coords: getOrderDropoffCoords(order), count: 1 });
            }
        }
        return Array.from(locationMap.values()).sort((a, b) => b.count - a.count).slice(0, 5);
    }, [orders]);

    const getGreeting = () => {
        const h = new Date().getHours();
        if (h < 12) return 'Good morning';
        if (h < 17) return 'Good afternoon';
        return 'Good evening';
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'in_transit': return 'In Transit';
            case 'driver_assigned': return 'Driver Assigned';
            case 'pending': return 'Pending';
            default: return status.replace('_', ' ');
        }
    };

    const getStatusDot = (status: string) => {
        switch (status) {
            case 'in_transit': return 'bg-blue-500';
            case 'driver_assigned': return 'bg-indigo-500';
            case 'pending': return 'bg-amber-500';
            default: return 'bg-gray-400';
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-8">
            {/* Animated border keyframe injected once */}
            <style>{`
                @keyframes border-spin {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                .search-glow {
                    background: linear-gradient(90deg, #10b981, #06b6d4, #8b5cf6, #f59e0b, #10b981);
                    background-size: 300% 300%;
                    animation: border-spin 4s ease infinite;
                }
            `}</style>
            <div className="max-w-xl mx-auto px-4 pt-20 space-y-4">

                {/* Greeting */}
                <div>
                    <h1 className="text-2xl font-black text-slate-900">
                        {getGreeting()}, {user?.name?.split(' ')[0] || 'there'}
                    </h1>
                    <p className="text-sm text-gray-400 font-medium mt-0.5">Send anything, Fast &amp; Reliable.</p>
                </div>



                {/* ── Side-by-side: Standard (left) | Vehicles (right) ── */}
                <div className="flex gap-2.5 min-[360px]:flex-row flex-col">

                    {/* ── LEFT: Standard Consolidated — tall card with CTA ── */}
                    <button
                        onClick={() => handleQuickAction({ serviceType: ServiceType.STANDARD })}
                        className="relative overflow-hidden bg-gradient-to-b from-emerald-50 to-emerald-100 border-2 border-emerald-200 rounded-2xl p-3.5 text-left shadow-sm hover:shadow-lg hover:border-emerald-300 transition-all active:scale-[0.98] group min-[360px]:w-[36%] flex-shrink-0 flex flex-col"
                    >
                        <div className="absolute -right-3 -bottom-3 opacity-[0.08]">
                            <Package className="w-24 h-24 text-emerald-600" />
                        </div>
                        <div className="relative z-10 flex flex-col h-full">
                            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center mb-3 shadow-md shadow-emerald-200">
                                <Package className="w-5 h-5 text-white" />
                            </div>
                            <p className="text-slate-900 font-black text-sm leading-tight">Standard</p>
                            <p className="text-slate-900 font-black text-sm leading-tight">Consolidated</p>
                            <span className="inline-flex items-center gap-0.5 bg-emerald-500 text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded-md mt-2 w-fit">
                                <BadgePercent className="w-2.5 h-2.5" /> LOWEST PRICE
                            </span>
                            <p className="text-emerald-700/60 text-[10px] font-semibold mt-2 leading-relaxed">Intercounty,<br />countrywide<br />at the lowest price</p>
                            <div className="flex-1" />
                            <div className="mt-3 bg-emerald-500 group-hover:bg-emerald-600 text-white text-[10px] font-bold py-1.5 px-3 rounded-lg text-center transition-colors flex items-center justify-center gap-1">
                                Book Now <ArrowRight className="w-3 h-3" />
                            </div>
                        </div>
                    </button>

                    {/* ── RIGHT: Vehicle stacks ── */}
                    <div className="flex-1 flex flex-col gap-2">

                        {/* 2×2 heavy truck grid — 3D icons, layered depth */}
                        <div className="grid grid-cols-2 gap-1.5">
                            {[
                                { v: 'rigid-truck-3axle', label: 'Truck', img: '/icons3d/articulated_lorry.png', sub: '', from: 'from-slate-700', to: 'to-slate-900', txt: 'text-slate-200' },
                                { v: 'container-5axle', label: 'Container', img: '/icons3d/container_truck.svg', sub: '20ft & 40ft', from: 'from-blue-600', to: 'to-indigo-800', txt: 'text-blue-200' },
                                { v: 'tipper-3axle', label: 'Tipper', img: '/icons3d/tipper_truck.svg', sub: 'Sand, ballast', from: 'from-amber-500', to: 'to-orange-700', txt: 'text-amber-200' },
                                { v: 'fuel-tanker-6axle-30kl', label: 'Fuel Tanker', img: '/icons3d/tanker_truck.svg', sub: 'Petrol & Diesel', from: 'from-rose-600', to: 'to-red-800', txt: 'text-rose-200' },
                            ].map(t => (
                                <button key={t.v} onClick={() => handleQuickAction({ vehicle: t.v })} className={`group relative overflow-hidden bg-gradient-to-br ${t.from} ${t.to} rounded-2xl p-2.5 text-left shadow-lg ring-1 ring-white/10 hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-200`}>
                                    <img src={t.img} alt={t.label} className="w-10 h-10 object-contain mb-1 drop-shadow-[0_4px_6px_rgba(0,0,0,0.4)] group-hover:scale-110 group-hover:-rotate-2 transition-transform duration-300" />
                                    <p className="text-white font-black text-[11px] leading-tight tracking-tight">{t.label}</p>
                                    <p className={`${t.txt} text-[9px] font-semibold`}>{t.sub}</p>
                                </button>
                            ))}
                        </div>

                        {/* 4-column mid-tier vehicles — glass cards + 3D icons */}
                        <div className="grid grid-cols-4 gap-1.5">
                            {[
                                { v: 'pickup', label: 'Pickup', img: '/icons3d/pickup_truck.png', ring: 'ring-teal-200/70', bg: 'bg-teal-50/80' },
                                { v: 'probox', label: 'Probox', img: '/icons3d/automobile.png', ring: 'ring-violet-200/70', bg: 'bg-violet-50/80' },
                                { v: 'van', label: 'Van', img: '/icons3d/delivery_truck.png', ring: 'ring-sky-200/70', bg: 'bg-sky-50/80' },
                                { v: 'tuktuk', label: 'Tuk-Tuk', img: '/icons3d/auto_rickshaw.png', ring: 'ring-orange-200/70', bg: 'bg-orange-50/80' },
                            ].map(t => (
                                <button key={t.v} onClick={() => handleQuickAction({ vehicle: t.v })} className={`group ${t.bg} backdrop-blur-sm rounded-2xl p-1.5 pt-2 text-center shadow-sm ring-1 ${t.ring} hover:shadow-md hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-200`}>
                                    <img src={t.img} alt={t.label} className="w-7 h-7 object-contain mx-auto mb-0.5 drop-shadow-sm group-hover:scale-110 transition-transform duration-300" />
                                    <p className="text-gray-800 font-bold text-[9px] leading-tight">{t.label}</p>
                                </button>
                            ))}
                        </div>

                        {/* LPG Tanker — wide strip (hazmat, separate from Fuel) */}
                        <button onClick={() => handleQuickAction({ vehicle: 'lpg-tanker-6axle' })} className="group relative overflow-hidden flex items-center gap-2.5 bg-gradient-to-r from-sky-600 to-cyan-700 rounded-2xl px-3 py-2.5 shadow-lg shadow-sky-300/40 ring-1 ring-white/10 hover:shadow-xl transition-all text-left active:scale-[0.98]">
                            <img src="/icons3d/tanker_truck.svg" alt="LPG Tanker" className="w-9 h-9 object-contain flex-shrink-0 drop-shadow-[0_4px_6px_rgba(0,0,0,0.4)] group-hover:scale-110 transition-transform duration-300" />
                            <div className="flex-1 min-w-0">
                                <p className="text-[12px] font-black text-white tracking-tight">LPG Gas Tanker</p>
                                <p className="text-[9px] text-sky-200 font-medium">Pressurized gas · Tonnage</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-white/60 flex-shrink-0 group-hover:translate-x-1 transition-transform" />
                        </button>

                        {/* Boda — wide strip with 3D motorcycle */}
                        <button onClick={() => handleQuickAction({ vehicle: 'boda' })} className="group relative overflow-hidden flex items-center gap-2.5 bg-gradient-to-r from-indigo-600 to-purple-700 rounded-2xl px-3 py-2.5 shadow-lg shadow-indigo-300/40 ring-1 ring-white/10 hover:shadow-xl hover:shadow-indigo-400/50 transition-all text-left active:scale-[0.98]">
                            <img src="/icons3d/motorcycle.png" alt="Boda" className="w-9 h-9 object-contain flex-shrink-0 drop-shadow-[0_4px_6px_rgba(0,0,0,0.4)] group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300" />
                            <div className="flex-1 min-w-0">
                                <p className="text-[12px] font-black text-white tracking-tight">Boda Boda</p>
                                <p className="text-[9px] text-indigo-200 font-medium">Small parcels · Motorbike</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-white/60 flex-shrink-0 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>

                {/* ── SEARCH BAR — animated glowing border with cycling hints ── */}
                <div ref={searchRef} className="relative">
                    <div className="search-glow rounded-2xl p-[2.5px]">
                        <div className="relative flex items-center gap-2 bg-white rounded-[14px] shadow-xl p-1">
                            <div className="pl-4 self-center">
                                <MapPin className={`w-5 h-5 text-emerald-500 transition-transform duration-500 ${!searchQuery ? 'animate-bounce' : ''}`} style={!searchQuery ? { animationDuration: '2s' } : {}} />
                            </div>
                            <div className="relative flex-1 min-w-0">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => handleSearchChange(e.target.value)}
                                    onFocus={() => { setSearchFocused(true); if (searchQuery.length >= 2 && suggestions.length > 0) setShowSuggestions(true); }}
                                    onBlur={() => setSearchFocused(false)}
                                    placeholder="Where are you sending to?"
                                    autoComplete="off"
                                    className="w-full bg-transparent border-none focus:ring-0 text-gray-900 text-sm font-medium py-2.5 placeholder-transparent outline-none"
                                />
                                {!searchQuery && !searchFocused && (
                                    <div className="absolute inset-0 flex items-center pointer-events-none overflow-hidden">
                                        <span key={cyclingIndex} className="text-sm font-medium text-slate-400" style={{ animation: 'placeholder-fade-in 3s ease-in-out' }}>
                                            {CYCLING_HINTS[cyclingIndex]}
                                        </span>
                                    </div>
                                )}
                                {!searchQuery && searchFocused && (
                                    <div className="absolute inset-0 flex items-center pointer-events-none">
                                        <span className="text-sm font-medium text-slate-300">Type a destination...</span>
                                    </div>
                                )}
                            </div>
                            {isSearching && (
                                <div className="pr-4"><div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
                            )}
                        </div>
                    </div>

                    {/* Suggestions dropdown */}
                    {showSuggestions && suggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl border border-gray-200 shadow-xl z-50 overflow-hidden max-h-64 overflow-y-auto">
                            {suggestions.map((sug, idx) => (
                                <button
                                    key={idx}
                                    onMouseDown={() => handlePlaceSelect(sug.label)}
                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-emerald-50 transition-colors text-left border-b border-gray-50 last:border-b-0"
                                >
                                    <MapPin className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                    <span className="text-sm font-medium text-slate-800 truncate">{sug.label}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Location History — Send again (with map thumbnails) */}
                {frequentLocations.length > 0 && (
                    <div>
                        <h2 className="text-sm font-black text-slate-900 mb-2">Send again</h2>
                        <div className="space-y-1.5">
                            {frequentLocations.map((loc, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleSendAgain(loc.address, loc.coords)}
                                    className="w-full flex items-center gap-3 bg-white rounded-xl px-3 py-2.5 border border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all text-left active:scale-[0.98]"
                                >
                                    <LocationThumb coords={loc.coords} size="80x80" className="w-10 h-10" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-slate-900 truncate">{loc.address.split(',')[0]}</p>
                                        <p className="text-[11px] text-gray-400 font-medium truncate">{loc.address}</p>
                                    </div>
                                    {loc.count >= 2 && (
                                        <span className="text-[10px] font-bold text-gray-300 flex-shrink-0">{loc.count}x</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Active Orders — with map thumbnails */}
                {activeOrders.length > 0 && (
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-sm font-black text-slate-900">Your deliveries</h2>
                            <button
                                onClick={() => navigate('/customer-dashboard?view=DELIVERIES')}
                                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5"
                            >
                                All <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                        <div className="space-y-1.5">
                            {activeOrders.slice(0, 3).map(order => (
                                <button
                                    key={order.id}
                                    onClick={() => navigate(`/track?id=${order.id}`)}
                                    className="w-full flex items-center gap-3 bg-white rounded-xl px-3 py-2.5 border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all text-left active:scale-[0.98]"
                                >
                                    <LocationThumb coords={getOrderDropoffCoords(order)} size="80x80" className="w-10 h-10" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-slate-900 truncate">
                                            {order.dropoff?.split(',')[0] || 'Delivery'}
                                        </p>
                                        <p className="text-[11px] text-gray-400 font-medium">
                                            {getStatusLabel(order.status)}
                                            {order.driver?.name ? ` · ${order.driver.name}` : ''}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                        <div className={`w-2 h-2 rounded-full ${getStatusDot(order.status)} ${order.status === 'in_transit' ? 'animate-pulse' : ''}`} />
                                        <ChevronRight className="w-4 h-4 text-gray-300" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Empty state when no orders at all */}
                {(!orders || orders.length === 0) && (
                    <div className="text-center py-10 bg-white rounded-2xl border border-gray-100 shadow-sm">
                        <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Package className="w-7 h-7 text-emerald-300" />
                        </div>
                        <h3 className="text-base font-bold text-gray-900 mb-1">No deliveries yet</h3>
                        <p className="text-sm text-gray-400">Send your first package to get started</p>
                    </div>
                )}
            </div>

            {/* ── Location Gate Modal ── */}
            {showLocationGate && (
                <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-6">
                    <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl">
                        <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Navigation2 className="w-8 h-8 text-brand-600" />
                        </div>
                        <h3 className="text-lg font-black text-gray-900 mb-1">Location Required</h3>
                        <p className="text-sm text-gray-500 mb-4">We need your location to find the best pickup point for your delivery.</p>

                        {permDenied && (
                            <div className="mb-4 bg-amber-50 text-amber-700 p-3 rounded-xl text-xs font-medium border border-amber-200 text-left">
                                Location is <strong>blocked</strong> in your browser. Tap the <strong>lock icon</strong> in the URL bar &rarr; set Location to <strong>Allow</strong> &rarr; refresh the page.
                            </div>
                        )}

                        <button
                            onClick={async () => {
                                setLocating(true);
                                try {
                                    const coords = await ensureFreshLocation();
                                    if (coords) {
                                        setShowLocationGate(false);
                                        pendingNavRef.current?.();
                                        pendingNavRef.current = null;
                                    }
                                } finally {
                                    setLocating(false);
                                }
                            }}
                            disabled={locating}
                            className="w-full bg-brand-600 text-white font-bold py-3.5 rounded-2xl shadow-lg hover:bg-brand-700 active:scale-95 transition-all disabled:opacity-75 flex items-center justify-center gap-2"
                        >
                            {locating
                                ? <><RefreshCw className="w-5 h-5 animate-spin" /> Locating...</>
                                : 'Enable Location'}
                        </button>
                        <button
                            onClick={() => {
                                setShowLocationGate(false);
                                // Allow navigation without location — user can enter pickup manually
                                pendingNavRef.current?.();
                                pendingNavRef.current = null;
                            }}
                            className="mt-3 text-sm text-gray-400 font-medium hover:text-gray-600 transition-colors"
                        >
                            Enter pickup manually instead
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerHome;
