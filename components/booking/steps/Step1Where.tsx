import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Map, ArrowRight, ArrowLeft, Check, Plus, LocateFixed, X, Zap, Clock, Bookmark, Star, RefreshCw } from 'lucide-react';
import { useBooking } from '../BookingContext';
import { useMapState } from '@/context/MapContext';
import { useAuth } from '@/context/AuthContext';
import { mapService } from '../../../services/mapService';

export const Step1Where = () => {
    const { data, updateData, nextStep } = useBooking();
    const { user } = useAuth();
    const activeTab = data.activeTab || 'pickup';
    const setActiveTab = (tab: 'pickup' | 'dropoff') => updateData({ activeTab: tab });
    const maxDropoffsReached = data.waypoints.length >= 5;

    const [pickupSuggestions, setPickupSuggestions] = useState<any[]>([]);
    const [dropoffSuggestions, setDropoffSuggestions] = useState<any[]>([]);

    const dropoffInputRef = useRef<HTMLInputElement>(null);

    const { pickupCoords, dropoffCoords, setPickupCoords, setWaypointCoords, waypointCoords, setDropoffCoords, setIsMapSelecting, setActiveInput, isMapSelecting, activeInput, mapCenter, setMapCenter, fitBounds, requestUserLocation } = useMapState();

    useEffect(() => {
        if (activeTab === 'dropoff' && !data.dropoff && data.waypoints.length === 0) {
            const timer = setTimeout(() => {
                updateData({ isSearchingText: true });
                dropoffInputRef.current?.focus();
            }, 250);
            return () => clearTimeout(timer);
        }
    }, [activeTab, data.dropoff, data.waypoints.length, updateData]);

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
            setActiveTab('dropoff');
        }
    };

    const handleDropoffChange = async (val: string) => {
        updateData({ dropoff: val });
        if (val.length > 2) {
            const results = await mapService.getSuggestions(val);
            setDropoffSuggestions(results);
        } else {
            setDropoffSuggestions([]);
        }
    };

    const handleDropoffSelect = async (sug: any) => {
        const dropoffLabel = sug.label;
        setDropoffSuggestions([]);
        const resolved = await mapService.geocodeAddress(sug.label);
        if (resolved) {
            const newWp = [...data.waypoints, dropoffLabel];
            const newCoords = [...waypointCoords, { lat: resolved.lat, lng: resolved.lng }];
            updateData({ waypoints: newWp, dropoff: '' });
            setWaypointCoords(newCoords);
        }
    };

    const manualSelectMap = (type: 'pickup' | 'dropoff') => {
        setActiveInput(type);
        setIsMapSelecting(true);
    };

    const handleSavedAddressSelect = async (entry: any) => {
        if (activeTab === 'pickup') {
            updateData({ pickup: entry.address });
            setPickupCoords({ lat: entry.lat, lng: entry.lng });
            fitBounds([{ lat: entry.lat, lng: entry.lng }]);
            setActiveTab('dropoff');
        } else {
            const newWp = [...data.waypoints, entry.address];
            const newCoords = [...waypointCoords, { lat: entry.lat, lng: entry.lng }];
            updateData({ waypoints: newWp, dropoff: '' });
            setWaypointCoords(newCoords);
        }
    };

    const SuggestionsList = ({ suggestions, onSelect }: any) => {
        if (!suggestions || suggestions.length === 0) return null;
        return (
            <div className="mt-2 w-full bg-white rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-gray-100 overflow-hidden max-h-[60vh] overflow-y-auto">
                {suggestions.map((sug: any, i: number) => (
                    <div key={i} onClick={() => onSelect(sug)} className="p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-none flex items-center gap-3 transition-colors">
                        <MapPin className="w-5 h-5 text-gray-400" />
                        <p className="text-sm font-semibold text-gray-700 truncate">{sug.label}</p>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="space-y-3 relative">
            {/* Saved Addresses Quick Select */}
            {user?.savedAddresses && user.savedAddresses.length > 0 && (
                <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                    {user.savedAddresses.map((entry) => (
                        <button
                            key={entry.id}
                            onClick={() => handleSavedAddressSelect(entry)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-50 border border-brand-100 text-brand-700 text-xs font-bold whitespace-nowrap hover:bg-brand-100 transition-colors"
                        >
                            <Star size={12} className="fill-brand-500 text-brand-500" />
                            {entry.label}
                        </button>
                    ))}
                </div>
            )}

            <AnimatePresence mode="wait">
                {activeTab === 'pickup' ? (
                    <motion.div key="pickup" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.15 }} className="space-y-3">
                        <div className="relative">
                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-green-500" size={24} />
                            <input
                                type="text" placeholder="Search Pickup Location"
                                className="w-full pl-12 pr-20 py-4 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-green-500 focus:bg-white text-gray-900 text-base font-bold transition-all min-h-[56px]"
                                value={data.pickup}
                                onFocus={() => {
                                    setIsMapSelecting(false);
                                    setActiveInput('pickup');
                                    updateData({ isSearchingText: true });
                                }}
                                onBlur={() => {
                                    setTimeout(() => updateData({ isSearchingText: false }), 200);
                                }}
                                onChange={e => handlePickupChange(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        if (pickupSuggestions && pickupSuggestions.length > 0) {
                                            handlePickupSelect(pickupSuggestions[0]);
                                        } else if (data.pickup && data.pickup.length > 2) {
                                            setActiveTab('dropoff');
                                        }
                                    }
                                }}
                            />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                <button
                                    onClick={async () => {
                                        updateData({ pickup: 'Locating...' });
                                        try {
                                            const loc = await requestUserLocation();
                                            if (loc) {
                                                setMapCenter(loc.lat, loc.lng);
                                                fitBounds([loc]);
                                                setIsMapSelecting(true);
                                                setActiveInput('pickup');
                                                const address = await mapService.reverseGeocode(loc.lat, loc.lng);
                                                if (address) {
                                                    updateData({ pickup: address });
                                                }
                                            } else {
                                                updateData({ pickup: '' });
                                            }
                                        } catch (err) {
                                            updateData({ pickup: '' });
                                            console.error("Locating failed", err);
                                        }
                                    }}
                                    title="Current Location"
                                    className="p-1.5 bg-white rounded-md shadow-sm border border-gray-100 hover:bg-green-50"
                                >
                                    <LocateFixed className="text-brand-600" size={16} />
                                </button>
                                <button onClick={() => manualSelectMap('pickup')} title="Pin on Map" className="p-1.5 bg-white rounded-md shadow-sm border border-gray-100 hover:bg-blue-50">
                                    <Map className="text-blue-500" size={16} />
                                </button>
                            </div>
                            <SuggestionsList suggestions={pickupSuggestions} onSelect={handlePickupSelect} />
                        </div>
                        <div className="w-full mt-4">
                            <button
                                onClick={() => {
                                    if (data.pickup) {
                                        if (isMapSelecting && mapCenter) {
                                            setIsMapSelecting(false);
                                            setPickupCoords({ lat: mapCenter.lat, lng: mapCenter.lng });
                                            fitBounds([{ lat: mapCenter.lat, lng: mapCenter.lng }]);
                                        }
                                        setActiveTab('dropoff');
                                    }
                                }}
                                disabled={!data.pickup}
                                className={`w-full py-3 text-sm font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors ${data.pickup ? 'bg-gray-900 text-white hover:bg-gray-800 shadow-lg' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                            >
                                {isMapSelecting ? 'Confirm Pickup Here' : 'Confirm Pickup'} <ArrowRight size={16} />
                            </button>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div key="dropoff" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.15 }} className="space-y-3">
                        {(data.waypoints.length > 0 || data.dropoff) && (
                            <div className="py-1 mb-1 w-full">
                                <div className="flex items-start overflow-x-auto no-scrollbar pb-2 pt-2 px-1 snap-x mt-2">
                                    <div className="flex flex-col items-center flex-shrink-0 snap-start w-[80px]">
                                        <div className="w-4 h-4 bg-green-500 rounded-full border-[3px] border-white shadow-sm z-10" />
                                        <span className="text-[11px] font-bold text-gray-900 truncate w-full text-center px-1 mt-1" title={data.pickup || 'Locating...'}>{data.pickup || 'Locating...'}</span>
                                    </div>
                                    <AnimatePresence>
                                        {(data.waypoints.length > 0 || data.dropoff) && (() => {
                                            const allStops = [...data.waypoints];
                                            if (data.dropoff) allStops.push((data as any).dropoff);
                                            return allStops.map((wp: string, idx: number) => {
                                                const isFinalDropoff = idx === allStops.length - 1 && data.dropoff;
                                                const isLastStop = idx === allStops.length - 1;
                                                return (
                                                    <motion.div key={idx} initial={{ opacity: 0, width: 0, scale: 0.8 }} animate={{ opacity: 1, width: 'auto', scale: 1 }} exit={{ opacity: 0, width: 0, scale: 0.8 }} className="flex items-start flex-shrink-0 snap-start">
                                                        <div className="w-8 md:w-16 h-[2px] bg-gray-200 mt-[7px]" />
                                                        <div className="flex flex-col items-center relative group w-[80px]">
                                                            <div className={`w-4 h-4 ${isLastStop ? 'bg-red-500' : ['bg-orange-500', 'bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-teal-500'][idx % 5]} rounded-full border-[3px] border-white shadow-sm z-10`} />
                                                            <span className={`text-[11px] font-bold ${isLastStop ? 'text-red-500' : 'text-gray-900'} truncate w-full text-center px-1 mt-1`} title={wp}>
                                                                {wp.split(',')[0]}
                                                            </span>
                                                            <button onClick={() => {
                                                                if (isFinalDropoff) {
                                                                    updateData({ dropoff: '' });
                                                                    setDropoffCoords(null);
                                                                    if (pickupCoords) { setTimeout(() => { if (typeof fitBounds === 'function') fitBounds([pickupCoords, ...waypointCoords].filter(Boolean) as any); }, 150); }
                                                                } else {
                                                                    const newWp = data.waypoints.filter((_: any, i: number) => i !== idx);
                                                                    const newCoords = waypointCoords.filter((_: any, i: number) => i !== idx);
                                                                    updateData({ waypoints: newWp });
                                                                    setWaypointCoords(newCoords);
                                                                    if (pickupCoords) {
                                                                        const remaining = [pickupCoords, ...newCoords].filter(Boolean);
                                                                        setTimeout(() => fitBounds(remaining as any), 150);
                                                                    }
                                                                }
                                                            }} className="absolute -top-1 -right-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity bg-red-50 hover:bg-red-100 p-1 rounded-full z-20 shadow-sm border border-red-100 cursor-pointer">
                                                                <X size={10} className="text-red-500" />
                                                            </button>
                                                        </div>
                                                    </motion.div>
                                                )
                                            });
                                        })()}
                                    </AnimatePresence>
                                </div>
                            </div>
                        )}
                        <div className="relative">
                            <MapPin className={`absolute left-4 top-1/2 -translate-y-1/2 ${maxDropoffsReached ? 'text-gray-400' : 'text-brand-600'}`} size={24} />
                            <input ref={dropoffInputRef} type="text" placeholder={maxDropoffsReached ? "Max dropoffs reached (5)" : (data.waypoints.length > 0 ? "Search another dropoff" : "Search Dropoff Location")}
                                className="w-full pl-12 pr-20 py-4 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-brand-500 focus:bg-white text-gray-900 text-base font-bold transition-all disabled:opacity-50 min-h-[56px]"
                                value={data.dropoff}
                                onFocus={() => {
                                    setIsMapSelecting(false);
                                    setActiveInput('dropoff');
                                    updateData({ isSearchingText: true });
                                }}
                                onBlur={() => {
                                    setTimeout(() => updateData({ isSearchingText: false }), 200);
                                }}
                                onChange={e => handleDropoffChange(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        if (dropoffSuggestions && dropoffSuggestions.length > 0) {
                                            handleDropoffSelect(dropoffSuggestions[0]);
                                        }
                                    }
                                }}
                                disabled={maxDropoffsReached}
                            />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        if (dropoffSuggestions && dropoffSuggestions.length > 0) {
                                            handleDropoffSelect(dropoffSuggestions[0]);
                                        } else if (data.dropoff) {
                                            handleDropoffSelect({ label: data.dropoff });
                                        }
                                    }}
                                    title="Add down as stop"
                                    disabled={!data.dropoff || maxDropoffsReached}
                                    className="p-1.5 bg-white rounded-md shadow-sm border border-gray-100 hover:bg-brand-50 disabled:opacity-50"
                                >
                                    <Plus className="text-brand-600" size={16} />
                                </button>
                                <button onClick={() => manualSelectMap('dropoff')} title="Pin on Map" className="p-1.5 bg-white rounded-md shadow-sm border border-gray-100 hover:bg-blue-50">
                                    <Map className="text-blue-500" size={16} />
                                </button>
                            </div>
                            <SuggestionsList suggestions={dropoffSuggestions} onSelect={handleDropoffSelect} />
                        </div>
                        {/* Schedule & Return Toggle */}
                        {(data.waypoints.length > 0 || data.dropoff) && !isMapSelecting && (
                            <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="flex bg-gray-100 p-1 rounded-xl col-span-1">
                                        <button
                                            onClick={() => updateData({ isScheduled: false, pickupTime: '' })}
                                            className={`flex-1 py-2 text-[10px] font-bold rounded-lg flex items-center justify-center gap-1 transition-all ${!data.isScheduled ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
                                        >
                                            <Zap size={12} className={!data.isScheduled ? 'text-brand-600' : 'text-gray-400'} /> Now
                                        </button>
                                        <button
                                            onClick={() => updateData({ isScheduled: true })}
                                            className={`flex-1 py-2 text-[10px] font-bold rounded-lg flex items-center justify-center gap-1 transition-all ${data.isScheduled ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
                                        >
                                            <Clock size={12} className={data.isScheduled ? 'text-brand-600' : 'text-gray-400'} /> Later
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => updateData({ isReturnTrip: !data.isReturnTrip })}
                                        className={`flex-1 py-2 text-[10px] font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all border ${data.isReturnTrip ? 'bg-brand-50 border-brand-200 text-brand-700' : 'bg-gray-100 border-transparent text-gray-500'}`}
                                    >
                                        <RefreshCw size={12} className={data.isReturnTrip ? 'text-brand-600 animate-spin-slow' : ''} /> 
                                        {data.isReturnTrip ? "Return On" : "Return Off"}
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
                        <div className="flex gap-2 mt-4">
                            <button onClick={() => setActiveTab('pickup')} className="w-12 bg-gray-100 text-gray-700 rounded-xl flex items-center justify-center hover:bg-gray-200"><ArrowLeft size={16} /></button>
                            <button
                                onClick={async () => {
                                    if (isMapSelecting && mapCenter && activeInput === 'dropoff') {
                                        const pinnedCoords = { lat: mapCenter.lat, lng: mapCenter.lng };
                                        setIsMapSelecting(false);
                                        let address = data.dropoff;
                                        if (!address || address === 'Locating...') {
                                            try {
                                                const resolved = await mapService.reverseGeocode(pinnedCoords.lat, pinnedCoords.lng);
                                                if (resolved) address = resolved;
                                            } catch (e) { /* use existing */ }
                                        }
                                        if (address) {
                                            const newWp = [...data.waypoints, address];
                                            const newCoords = [...waypointCoords, pinnedCoords];
                                            updateData({ waypoints: newWp, dropoff: '' });
                                            setWaypointCoords(newCoords);
                                            if (pickupCoords) { setTimeout(() => { if (typeof fitBounds === 'function') fitBounds([pickupCoords, ...newCoords].filter(Boolean) as any); }, 150); }
                                        }
                                    } else {
                                        nextStep();
                                    }
                                }}
                                disabled={(data.waypoints.length === 0 && !data.dropoff) && !isMapSelecting}
                                className="flex-1 py-3 bg-gray-900 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
                            >
                                {isMapSelecting ? "Confirm Dropoff Here" : "Confirm Route"} <Check size={16} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
