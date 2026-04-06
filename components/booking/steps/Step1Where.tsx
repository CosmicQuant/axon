import React, { useState, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Map, Check, Plus, LocateFixed, X, Zap, Clock, Star, RefreshCw, Bike, Box } from 'lucide-react';
import { useBooking } from '../BookingContext';
import { useMapState } from '@/context/MapContext';
import { useAuth } from '@/context/AuthContext';
import { useUserOrders } from '../../../hooks/useOrders';
import { mapService } from '../../../services/mapService';

export const Step1Where = () => {
    const { data, updateData, nextStep } = useBooking();
    const [pickupConfirmed, setPickupConfirmed] = useState(!!data.dropoff || data.waypoints.length > 0);
    const { user } = useAuth();
    const { data: orders } = useUserOrders(user?.id ?? '');

    const maxDropoffsReached = data.waypoints.length >= 5;

    const [pickupSuggestions, setPickupSuggestions] = useState<any[]>([]);
    const [dropoffSuggestions, setDropoffSuggestions] = useState<any[]>([]);

    const pickupInputRef = useRef<HTMLInputElement>(null);
    const dropoffInputRef = useRef<HTMLInputElement>(null);

    const {
        pickupCoords,
        dropoffCoords,
        setPickupCoords,
        setWaypointCoords,
        waypointCoords,
        setDropoffCoords,
        setIsMapSelecting,
        setActiveInput,
        isMapSelecting,
        activeInput,
        mapCenter,
        setMapCenter,
        fitBounds,
        requestUserLocation,
    } = useMapState();

    // Auto-locate if no pickup is set
    useEffect(() => {
        if (!data.pickup && !pickupCoords && !isMapSelecting) {
            updateData({ pickup: 'Locating...' });
            requestUserLocation().then(loc => {
                if (loc) {
                    setIsMapSelecting(true);
                    setActiveInput('pickup');
                    setMapCenter(loc.lat, loc.lng);
                    fitBounds([loc]);
                    mapService.reverseGeocode(loc.lat, loc.lng).then(addr => {
                        if (addr) updateData({ pickup: addr });
                    }).catch(() => updateData({ pickup: '' }));
                } else {
                    updateData({ pickup: '' });
                }
            }).catch(() => updateData({ pickup: '' }));
        }
    }, [data.pickup, pickupCoords, isMapSelecting, requestUserLocation, setPickupCoords, fitBounds, updateData]);

    const recentPickups = useMemo(() => {
        if (!orders) return [];
        const seen = new Set<string>();
        const results: Array<{ address: string; coords?: { lat: number; lng: number } }> = [];
        for (const order of orders) {
            if (order.pickup && !seen.has(order.pickup)) {
                seen.add(order.pickup);
                results.push({ address: order.pickup, coords: order.pickupCoords });
                if (results.length >= 5) break;
            }
        }
        return results;
    }, [orders]);

    const recentDropoffs = useMemo(() => {
        if (!orders) return [];
        const seen = new Set<string>();
        const results: Array<{ address: string; coords?: { lat: number; lng: number } }> = [];
        for (const order of orders) {
            if (order.dropoff && !seen.has(order.dropoff)) {
                seen.add(order.dropoff);
                results.push({ address: order.dropoff, coords: order.dropoffCoords });
                if (results.length >= 5) break;
            }
        }
        return results;
    }, [orders]);

    // -- Pickup -------------------------------------------------------------------

    const handlePickupChange = async (val: string) => {
        updateData({ pickup: val });
        if (val.length > 2) {
            const results = await mapService.getSuggestions(val);
            setPickupSuggestions(results);
        } else {
            setPickupSuggestions([]);
        }
    };

    const handlePickupSelect = async (sug: any) => {
        updateData({ pickup: sug.label });
        setPickupSuggestions([]);
        const resolved = await mapService.geocodeAddress(sug.label);
        if (resolved) {
            setPickupCoords({ lat: resolved.lat, lng: resolved.lng });
            fitBounds([{ lat: resolved.lat, lng: resolved.lng }]);
            requestAnimationFrame(() => dropoffInputRef.current?.focus());
        }
    };

    // -- Dropoff ------------------------------------------------------------------

    const handleDropoffChange = async (val: string) => {
        updateData({ dropoff: val });
        if (dropoffCoords) setDropoffCoords(null);
        if (val.length > 2) {
            const results = await mapService.getSuggestions(val);
            setDropoffSuggestions(results);
        } else {
            setDropoffSuggestions([]);
        }
    };

    const fitVisibleRoute = (
        nextDropoff: { lat: number; lng: number } | null = dropoffCoords,
        nextWaypoints: Array<{ lat: number; lng: number }> = waypointCoords,
    ) => {
        const pts = [pickupCoords, ...nextWaypoints, nextDropoff].filter(Boolean) as Array<{ lat: number; lng: number }>;
        if (pts.length > 0) fitBounds(pts);
    };

    const confirmDropoff = (address: string, coords: { lat: number; lng: number }) => {
        updateData({ dropoff: address });
        setDropoffCoords(coords);
        fitVisibleRoute(coords);
    };

    const clearDropoff = () => {
        updateData({ dropoff: '' });
        setDropoffCoords(null);
        setDropoffSuggestions([]);
        setTimeout(() => fitVisibleRoute(null, waypointCoords), 150);
    };

    const handleDropoffSelect = async (sug: any) => {
        setDropoffSuggestions([]);
        const resolved = await mapService.geocodeAddress(sug.label);
        if (resolved) confirmDropoff(sug.label, { lat: resolved.lat, lng: resolved.lng });
    };

    // -- Stops -------------------------------------------------------------------

    const addCurrentDestinationAsStop = async () => {
        if (maxDropoffsReached || !data.dropoff.trim()) return;
        let coords = dropoffCoords;
        if (!coords) {
            const resolved = await mapService.geocodeAddress(data.dropoff);
            if (!resolved) return;
            coords = { lat: resolved.lat, lng: resolved.lng };
        }
        const nextWaypoints = [...data.waypoints, data.dropoff.trim()];
        const nextWaypointCoords = [...waypointCoords, coords];
        updateData({ waypoints: nextWaypoints, dropoff: '' });
        setWaypointCoords(nextWaypointCoords);
        setDropoffCoords(null);
        fitVisibleRoute(null, nextWaypointCoords);
        requestAnimationFrame(() => dropoffInputRef.current?.focus());
    };

    const removeWaypoint = (index: number) => {
        const nextWaypoints = data.waypoints.filter((_, i) => i !== index);
        const nextCoords = waypointCoords.filter((_, i) => i !== index);
        updateData({ waypoints: nextWaypoints });
        setWaypointCoords(nextCoords);
        setTimeout(() => fitVisibleRoute(dropoffCoords, nextCoords), 150);
    };

    const editWaypoint = (index: number) => {
        const nextWaypoints = data.waypoints.filter((_, i) => i !== index);
        const nextCoords = waypointCoords.filter((_, i) => i !== index);
        const waypointAddress = data.waypoints[index] || '';
        const waypointCoord = waypointCoords[index] || null;
        updateData({ waypoints: nextWaypoints, dropoff: waypointAddress });
        setWaypointCoords(nextCoords);
        setDropoffCoords(waypointCoord);
        if (waypointCoord) setMapCenter(waypointCoord.lat, waypointCoord.lng);
        setTimeout(() => fitVisibleRoute(waypointCoord, nextCoords), 150);
        requestAnimationFrame(() => dropoffInputRef.current?.focus());
    };

    // -- Map-pin mode ------------------------------------------------------------

    const manualSelectMap = (type: 'pickup' | 'dropoff') => {
        setActiveInput(type);
        setIsMapSelecting(true);
        if (type === 'pickup' && pickupCoords) setMapCenter(pickupCoords.lat, pickupCoords.lng);
        else if (type === 'dropoff' && dropoffCoords) setMapCenter(dropoffCoords.lat, dropoffCoords.lng);
    };

    // -- Saved addresses ---------------------------------------------------------

    const handleSavedAddressSelect = async (entry: any) => {
        if (!pickupCoords) {
            updateData({ pickup: entry.address });
            setPickupCoords({ lat: entry.lat, lng: entry.lng });
            fitBounds([{ lat: entry.lat, lng: entry.lng }]);
            requestAnimationFrame(() => dropoffInputRef.current?.focus());
        } else {
            confirmDropoff(entry.address, { lat: entry.lat, lng: entry.lng });
        }
    };

    // -- Recent destinations (from order history) --------------------------------

    const handleRecentDestinationSelect = async (dest: { address: string; coords?: { lat: number; lng: number } }) => {
        if (!pickupConfirmed) {
            if (dest.coords) {
                updateData({ pickup: dest.address });
                setPickupCoords(dest.coords);
                fitBounds([dest.coords]);
                setPickupConfirmed(true);
                requestAnimationFrame(() => dropoffInputRef.current?.focus());
            } else {
                const resolved = await mapService.geocodeAddress(dest.address);
                if (resolved) {
                    updateData({ pickup: dest.address });
                    setPickupCoords({ lat: resolved.lat, lng: resolved.lng });
                    fitBounds([{ lat: resolved.lat, lng: resolved.lng }]);
                    setPickupConfirmed(true);
                    requestAnimationFrame(() => dropoffInputRef.current?.focus());
                }
            }
        } else {
            if (dest.coords) {
                confirmDropoff(dest.address, dest.coords);
            } else {
                const resolved = await mapService.geocodeAddress(dest.address);
                if (resolved) confirmDropoff(dest.address, { lat: resolved.lat, lng: resolved.lng });
            }
        }
    };

    // -- Continue / confirm ------------------------------------------------------

    const handleContinue = async () => {
        // Phase 1: Confirm Pickup BEFORE proceeding to Dropoff
        if (!pickupConfirmed) {
            // Map-pin mode: confirm the pinned location
            if (isMapSelecting && mapCenter) {
                const pinnedCoords = { lat: mapCenter.lat, lng: mapCenter.lng };
                setIsMapSelecting(false);
                let address = data.pickup;
                if (!address || address === 'Locating...') {
                    try {
                        const resolved = await mapService.reverseGeocode(pinnedCoords.lat, pinnedCoords.lng);
                        if (resolved) address = resolved;
                    } catch { /* keep existing */ }
                }
                updateData({ pickup: address });
                setPickupCoords(pinnedCoords);
                fitBounds([pinnedCoords]);
                setPickupConfirmed(true);
                requestAnimationFrame(() => dropoffInputRef.current?.focus());
                return;
            }

            if (pickupCoords) {
                setPickupConfirmed(true);
                requestAnimationFrame(() => dropoffInputRef.current?.focus());
                return;
            }
            return;
        }

        // Phase 2: Next step processing
        if (isMapSelecting && mapCenter) {
            const pinnedCoords = { lat: mapCenter.lat, lng: mapCenter.lng };
            setIsMapSelecting(false);
            let address = activeInput === 'pickup' ? data.pickup : data.dropoff;
            if (!address || address === 'Locating...') {
                try {
                    const resolved = await mapService.reverseGeocode(pinnedCoords.lat, pinnedCoords.lng);
                    if (resolved) address = resolved;
                } catch { /* keep existing */ }
            }
            if (activeInput === 'pickup') {
                updateData({ pickup: address });
                setPickupCoords(pinnedCoords);
                fitBounds([pinnedCoords]);
                setPickupConfirmed(true);
                requestAnimationFrame(() => dropoffInputRef.current?.focus());
            } else {
                if (address) confirmDropoff(address, pinnedCoords);
                if (pickupCoords) nextStep();
            }
            return;
        }

        // Try to resolve unconfirmed dropoff text before advancing
        if (!dropoffCoords && data.dropoff.trim()) {
            const resolved = await mapService.geocodeAddress(data.dropoff.trim());
            if (resolved) {
                confirmDropoff(data.dropoff.trim(), { lat: resolved.lat, lng: resolved.lng });
                nextStep();
            }
            return;
        }

        nextStep();
    };

    const isReadyToContinue =
        (!pickupConfirmed) ||
        (pickupConfirmed && !!(pickupCoords && (dropoffCoords || data.dropoff.trim())));

    const showRecentDestinations =
        (pickupConfirmed ? recentDropoffs.length > 0 : recentPickups.length > 0) &&
        (pickupConfirmed ? (!data.dropoff && !dropoffSuggestions.length && !isMapSelecting) : (!data.pickup && !pickupSuggestions.length && !isMapSelecting));

    // -- Sub-components ----------------------------------------------------------

    const SuggestionsList = ({
        suggestions,
        onSelect,
    }: {
        suggestions: any[];
        onSelect: (s: any) => void;
    }) => {
        if (!suggestions || suggestions.length === 0) return null;
        return (
            <div className="mt-1.5 w-full bg-white rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-gray-100 overflow-hidden max-h-[40vh] overflow-y-auto">
                {suggestions.map((sug: any, i: number) => (
                    <div
                        key={i}
                        onMouseDown={() => onSelect(sug)}
                        className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-none flex items-center gap-3 transition-colors"
                    >
                        <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <p className="text-sm font-semibold text-gray-700 truncate">{sug.label}</p>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="space-y-2.5 relative pb-2">

            {/* Route Builder Card */}
            <div className="rounded-2xl border border-gray-200 bg-gray-50 overflow-visible">

                {/* PICKUP ROW */}
                <div className="px-3 pt-3 pb-0">
                    <div className="relative">
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-emerald-200 z-10" />
                        <input
                            ref={pickupInputRef}
                            type="text"
                            placeholder="Pickup Location"
                            className="w-full pl-9 pr-20 py-3 rounded-xl bg-white border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:bg-white text-gray-900 text-sm font-bold transition-all"
                            value={data.pickup}
                            onFocus={() => {
                                setIsMapSelecting(false);
                                setActiveInput('pickup');
                                updateData({ isSearchingText: true });
                            }}
                            onBlur={() => setTimeout(() => updateData({ isSearchingText: false }), 200)}
                            onChange={e => {
                                handlePickupChange(e.target.value);
                                if (pickupConfirmed) setPickupConfirmed(false);
                            }}
                            onKeyDown={e => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    if (pickupSuggestions.length > 0) {
                                        handlePickupSelect(pickupSuggestions[0]);
                                        setPickupConfirmed(true);
                                    } else if (data.pickup.length > 2) {
                                        setPickupConfirmed(true);
                                        dropoffInputRef.current?.focus();
                                    }
                                }
                            }}
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                            <button
                                onMouseDown={async (e) => {
                                    e.preventDefault();
                                    updateData({ pickup: 'Locating...' });
                                    try {
                                        const loc = await requestUserLocation();
                                        if (loc) {
                                            setPickupCoords(loc);
                                            fitBounds([loc]);
                                            const address = await mapService.reverseGeocode(loc.lat, loc.lng);
                                            if (address) {
                                                updateData({ pickup: address });
                                                requestAnimationFrame(() => dropoffInputRef.current?.focus());
                                            }
                                        } else {
                                            updateData({ pickup: '' });
                                        }
                                    } catch {
                                        updateData({ pickup: '' });
                                    }
                                }}
                                title="Use Current Location"
                                className="p-1.5 bg-white rounded-md shadow-sm border border-gray-100 hover:bg-emerald-50"
                            >
                                <LocateFixed className="text-brand-600" size={14} />
                            </button>
                            <button
                                onMouseDown={() => manualSelectMap('pickup')}
                                title="Pin on Map"
                                className="p-1.5 bg-white rounded-md shadow-sm border border-gray-100 hover:bg-blue-50"
                            >
                                <Map className="text-blue-500" size={14} />
                            </button>
                        </div>
                    </div>
                    <SuggestionsList suggestions={pickupSuggestions} onSelect={sug => {
                        handlePickupSelect(sug);
                        setPickupConfirmed(true);
                    }} />
                </div>

                <AnimatePresence>
                    {pickupConfirmed && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            {/* Back arrow & Title */}
                            <div className="flex items-center gap-2 px-3 pt-4 pb-2 hidden">
                                <button
                                    onClick={() => setPickupConfirmed(false)}
                                    className="p-1.5 cursor-pointer hover:bg-gray-200 rounded-full transition-colors flex items-center justify-center bg-gray-100/80"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-700 hover:text-gray-900"><path d="m15 18-6-6 6-6" /></svg>
                                </button>
                                <span className="text-gray-900 font-bold text-sm">Drop-off details</span>
                            </div>

                            {/* Connector line + inline stops */}
                            <div className="flex items-stretch px-3 mt-0.5">
                                <div className="flex flex-col items-center w-[14px] flex-shrink-0 mr-2.5 pt-1 pb-1">
                                    <div className="w-px flex-1 bg-gray-300" style={{ minHeight: 12 }} />
                                </div>
                                {data.waypoints.length > 0 && (
                                    <div className="flex-1 py-1 space-y-1.5 min-w-0">
                                        {data.waypoints.map((stop, idx) => (
                                            <div
                                                key={`${stop}-${idx}`}
                                                className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-100 px-2 py-2 overflow-hidden min-w-0"
                                            >
                                                <div className="w-2 h-2 rounded-full bg-amber-400 ring-1 ring-amber-200 flex-shrink-0" />
                                                <span className="text-xs font-semibold text-gray-800 truncate flex-1" title={stop}>{stop}</span>
                                                <button
                                                    onMouseDown={() => editWaypoint(idx)}
                                                    className="text-[10px] font-bold text-brand-600 hover:text-brand-700 flex-shrink-0"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onMouseDown={() => removeWaypoint(idx)}
                                                    className="p-0.5 rounded-full text-red-400 hover:text-red-600 flex-shrink-0"
                                                >
                                                    <X size={10} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* DROPOFF ROW */}
                            <div className="px-3 pt-0 pb-3">
                                <div className="relative">
                                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-red-500 ring-2 ring-red-200 z-10" />
                                    <input
                                        ref={dropoffInputRef}
                                        type="text"
                                        placeholder={data.waypoints.length > 0 ? 'Final Destination' : '📍 Where are you sending to?'}
                                        className="w-full pl-9 pr-20 py-3 rounded-xl bg-white border border-gray-200 focus:ring-2 focus:ring-red-400 focus:bg-white text-gray-900 text-sm font-bold transition-all"
                                        value={data.dropoff}
                                        onFocus={() => {
                                            setIsMapSelecting(false);
                                            setActiveInput('dropoff');
                                            updateData({ isSearchingText: true });
                                        }}
                                        onBlur={() => setTimeout(() => updateData({ isSearchingText: false }), 200)}
                                        onChange={e => handleDropoffChange(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                if (dropoffSuggestions.length > 0) handleDropoffSelect(dropoffSuggestions[0]);
                                            }
                                        }}
                                    />
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                        {data.dropoff ? (
                                            <>
                                                <button
                                                    onMouseDown={async (e) => {
                                                        e.preventDefault();
                                                        await addCurrentDestinationAsStop();
                                                    }}
                                                    title="Add as intermediate stop"
                                                    disabled={maxDropoffsReached}
                                                    className="p-1.5 bg-white rounded-md shadow-sm border border-gray-100 hover:bg-brand-50 disabled:opacity-40"
                                                >
                                                    <Plus className="text-brand-600" size={14} />
                                                </button>
                                                <button
                                                    onMouseDown={clearDropoff}
                                                    className="p-1.5 bg-white rounded-md shadow-sm border border-gray-100 hover:bg-red-50"
                                                >
                                                    <X className="text-gray-400" size={14} />
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                onMouseDown={() => manualSelectMap('dropoff')}
                                                title="Pin on Map"
                                                className="p-1.5 bg-white rounded-md shadow-sm border border-gray-100 hover:bg-blue-50"
                                            >
                                                <Map className="text-blue-500" size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <SuggestionsList suggestions={dropoffSuggestions} onSelect={handleDropoffSelect} />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Horizontal Recent Destinations & Saved Addresses */}
            {((((user?.savedAddresses?.length || 0) > 0) || recentPickups.length > 0 || recentDropoffs.length > 0) && (pickupConfirmed ? (!data.dropoff && !dropoffSuggestions.length && !isMapSelecting) : (!data.pickup && !pickupSuggestions.length && !isMapSelecting))) && (
                <div className="flex gap-2 overflow-x-auto no-scrollbar py-1 -mx-1 px-1 mb-2">
                    {user?.savedAddresses?.map((entry) => (
                        <button
                            key={entry.id}
                            onMouseDown={() => handleSavedAddressSelect(entry)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-50 border border-brand-100 text-brand-700 text-[11px] font-bold whitespace-nowrap hover:bg-brand-100 transition-colors"
                        >
                            <Star size={12} className="fill-brand-500 text-brand-500 flex-shrink-0" />
                            <span className="truncate max-w-[120px]">{entry.label}</span>
                        </button>
                    ))}
                    {(pickupConfirmed ? recentDropoffs : recentPickups).map((dest, i) => (
                        <button
                            key={i}
                            onMouseDown={() => handleRecentDestinationSelect(dest)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-gray-700 text-[11px] font-bold whitespace-nowrap hover:bg-gray-50 transition-colors"
                        >
                            <Clock size={12} className="text-gray-400 flex-shrink-0" />
                            <span className="truncate max-w-[150px]">{dest.address.split(',')[0]}</span>
                        </button>
                    ))}
                </div>
            )}

            {/* Schedule & Return Toggle (shown once dropoff is confirmed) */}
            {dropoffCoords && !isMapSelecting && (
                <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                        <div className="flex bg-gray-100 p-1 rounded-xl">
                            <button
                                onClick={() => updateData({ isScheduled: false, pickupTime: '' })}
                                className={`flex-1 py-2 text-[10px] font-bold rounded-lg flex items-center justify-center gap-1 transition-all ${!data.isScheduled ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
                                    }`}
                            >
                                <Zap size={11} className={!data.isScheduled ? 'text-brand-600' : 'text-gray-400'} />
                                Now
                            </button>
                            <button
                                onClick={() => updateData({ isScheduled: true })}
                                className={`flex-1 py-2 text-[10px] font-bold rounded-lg flex items-center justify-center gap-1 transition-all ${data.isScheduled ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
                                    }`}
                            >
                                <Clock size={11} className={data.isScheduled ? 'text-brand-600' : 'text-gray-400'} />
                                Later
                            </button>
                        </div>
                        <button
                            onClick={() => updateData({ isReturnTrip: !data.isReturnTrip })}
                            className={`py-2 text-[10px] font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all border ${data.isReturnTrip
                                ? 'bg-brand-50 border-brand-200 text-brand-700'
                                : 'bg-gray-100 border-transparent text-gray-500'
                                }`}
                        >
                            <RefreshCw size={11} className={data.isReturnTrip ? 'text-brand-600' : ''} />
                            {data.isReturnTrip ? 'Return On' : 'Return Off'}
                        </button>
                    </div>
                    <AnimatePresence>
                        {data.isScheduled && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                            >
                                <input
                                    type="datetime-local"
                                    value={data.pickupTime}
                                    onChange={e => updateData({ pickupTime: e.target.value })}
                                    min={new Date().toISOString().slice(0, 16)}
                                    className="w-full px-3.5 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-brand-500 text-sm font-bold text-gray-900 transition-all"
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}


            {/* Continue Button */}
            <div className="flex items-stretch gap-2 w-full mt-2 h-[48px] sticky bottom-0 bg-white z-10">
                {pickupConfirmed && !isMapSelecting && (
                    <button
                        onClick={() => {
                            setPickupConfirmed(false);
                            setActiveInput('pickup');
                            if (pickupCoords) {
                                setMapCenter(pickupCoords.lat, pickupCoords.lng);
                            }
                        }}
                        className="w-12 flex-shrink-0 bg-white border border-gray-200 text-gray-900 rounded-xl flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all shadow-sm"
                        aria-label="Back to Pickup"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                    </button>
                )}
                <button
                    onClick={handleContinue}
                    disabled={!isReadyToContinue}
                    className="flex-1 h-[48px] bg-gray-900 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                >
                    {!pickupConfirmed ? 'Confirm Pickup' : (isMapSelecting ? 'Confirm Pin' : 'Confirm Route')}
                    <Check size={16} />
                </button>
            </div>
        </div>
    );
};
