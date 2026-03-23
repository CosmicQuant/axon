import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { mapService } from '../../services/mapService';
import { useMapState } from '@/context/MapContext';
import { MapPin, Map, Box, Truck, User, ArrowRight, ArrowLeft, Check, Camera, Zap, Clock, Bike, Car, Plus, Navigation, LocateFixed, Smartphone, Banknote, X, FileText, Package, PackageOpen, Archive, Ruler } from 'lucide-react';

// --- Types & Constants ---
type Category = 'A' | 'B' | 'C';
type ServiceType = 'Express' | 'Standard';
type PaymentMethod = 'M-Pesa' | 'Cash';

interface BookingState {
    activeTab?: "pickup" | "dropoff";
    pickup: string;
    dropoff: string;
    waypoints: string[];
    distanceKm: number;
    etaTime?: string;
    calculatingRoute?: boolean;
    category: Category;
    subCategory: string;
    dimensions: { length: string; width: string; height: string; weight: string };
    imageUploaded: boolean;
    vehicle: string;
    serviceType: ServiceType;
    receiverName: string;
    receiverPhone: string;
    receiverId: string;
    paymentMethod: PaymentMethod;
    paymentPhone: string;
    isSearchingText?: boolean;
}

const INITIAL_STATE: BookingState = {
    pickup: '', dropoff: '', waypoints: [], distanceKm: 0, activeTab: 'pickup',
    category: 'A', subCategory: '', dimensions: { length: '', width: '', height: '', weight: '' }, imageUploaded: false,
    vehicle: '', serviceType: 'Express',
    receiverName: '', receiverPhone: '', receiverId: '',
    paymentMethod: 'M-Pesa', paymentPhone: '0712345678'
};

const VEHICLES = [
    { id: 'boda', label: 'Motorbike', maxDist: 65, maxWeight: 100, allowedCats: ['A'], pricePerKm: 30, icon: Bike, color: 'text-orange-500', bgColor: 'bg-orange-500', bgLight: 'bg-orange-50' },
    { id: 'tuktuk', label: 'Tuk-Tuk', maxDist: 65, maxWeight: 500, allowedCats: ['A'], pricePerKm: 50, icon: Car, color: 'text-yellow-500', bgColor: 'bg-yellow-500', bgLight: 'bg-yellow-50' },
    { id: 'probox', label: 'Probox', maxDist: 9999, maxWeight: 800, allowedCats: ['A', 'B'], pricePerKm: 70, icon: Car, color: 'text-blue-500', bgColor: 'bg-blue-500', bgLight: 'bg-blue-50' },
    { id: 'van', label: 'Cargo Van', maxDist: 9999, maxWeight: 1500, allowedCats: ['B'], pricePerKm: 90, icon: Truck, color: 'text-indigo-500', bgColor: 'bg-indigo-500', bgLight: 'bg-indigo-50' },
    { id: 'pickup', label: 'Pick-up', maxDist: 9999, maxWeight: 2000, allowedCats: ['B', 'C'], pricePerKm: 100, icon: Truck, color: 'text-emerald-500', bgColor: 'bg-emerald-500', bgLight: 'bg-emerald-50' },
    { id: 'truck', label: 'Trucks', maxDist: 9999, maxWeight: 5000, allowedCats: ['C'], pricePerKm: 200, icon: Truck, color: 'text-slate-700', bgColor: 'bg-slate-700', bgLight: 'bg-slate-50' }
];

// --- Animation Variants ---
const slideVariants = {
    enter: (direction: number) => ({ x: direction > 0 ? '30%' : '-30%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (direction: number) => ({ x: direction < 0 ? '30%' : '-30%', opacity: 0 })
};

// --- Main Wizard Component ---
interface BookingWizardProps {
    prefillData?: any;
    onOrderComplete?: (order: any) => void;
    onCollapseChange?: (isCollapsed: boolean) => void;
    onRequireAuth?: (title?: string, desc?: string) => void;
}

export default function BookingWizard({ prefillData, onOrderComplete, onCollapseChange, onRequireAuth }: BookingWizardProps = {}) {
    const [step, setStep] = useState(0);
    const [direction, setDirection] = useState(0);
    const [data, setData] = useState<BookingState>(INITIAL_STATE);

    const nextStep = () => { if (step < 4) { setDirection(1); setStep(s => s + 1); } };
    const prevStep = () => { if (step > 0) { setDirection(-1); setStep(s => s - 1); } };

    const handleUpdate = (updates: Partial<BookingState>) => setData(prev => ({ ...prev, ...updates }));

    const { pickupCoords, dropoffCoords, waypointCoords, setRoutePolyline, setIsMapSelecting, setActiveInput, setPickupCoords, setWaypointCoords, setDropoffCoords, userLocation, requestUserLocation, isMapSelecting, activeInput, mapCenter, fitBounds } = useMapState();

    useEffect(() => {
        // Request accurate user location on load
        requestUserLocation().then(loc => {
            if (loc && !data.pickup && !pickupCoords && !isMapSelecting) {
                setActiveInput('pickup');
                setIsMapSelecting(true);
                fitBounds([loc]);
                mapService.reverseGeocode(loc.lat, loc.lng).then(address => {
                    if (address) handleUpdate({ pickup: address });
                }).catch(console.error);
            }
        });
    }, []); // Run only once on mount

    // Live Reverse Geocode when dragging the map (Debounced)
    useEffect(() => {
        if (isMapSelecting && mapCenter) {
            const timer = setTimeout(async () => {
                try {
                    const address = await mapService.reverseGeocode(mapCenter.lat, mapCenter.lng);
                    if (address) {
                        if (activeInput === 'pickup') {
                            handleUpdate({ pickup: address });
                        } else if (activeInput === 'dropoff') {
                            handleUpdate({ dropoff: address });
                        }
                    }
                } catch (e) { }
            }, 600); // 600ms debounce prevents spamming geocode API
            return () => clearTimeout(timer);
        }
    }, [mapCenter, isMapSelecting, activeInput]);

    useEffect(() => {
        const calculateRoute = async () => {
            const allStops = [];
            const stopInfo: any[] = [];

            if (waypointCoords && waypointCoords.length > 0) {
                waypointCoords.forEach((wp, idx) => {
                    allStops.push(wp);
                    stopInfo.push({ type: 'waypoint', index: idx, name: data.waypoints[idx], coord: wp });
                });
            }
            if (dropoffCoords) {
                allStops.push(dropoffCoords);
                stopInfo.push({ type: 'dropoff', name: data.dropoff, coord: dropoffCoords });
            }

            if (pickupCoords && allStops.length > 0) {
                handleUpdate({ calculatingRoute: true });
                try {
                    const route = await mapService.getFullyOptimizedRoute(pickupCoords, allStops, data.vehicle || 'Boda Boda');
                    if (route) {
                        setRoutePolyline(route.geometry);
                        fitBounds([pickupCoords, ...allStops]);
                        const distKm = route.distance / 1000;
                        const now = new Date();
                        now.setSeconds(now.getSeconds() + route.duration);
                        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                        if (route.full_optimized_order && stopInfo.length === route.full_optimized_order.length) {
                            const optimizedStops = route.full_optimized_order.map((optimizedIndex: number) => stopInfo[optimizedIndex]);
                            if (optimizedStops.length > 0) {
                                handleUpdate({
                                    waypoints: optimizedStops.map((info: any) => info.name),
                                    distanceKm: distKm,
                                    etaTime: timeStr,
                                    calculatingRoute: false
                                });

                                const newWpCoords = optimizedStops.map((info: any) => info.coord);

                                // Prevent infinite loops by only updating context if value really changed
                                if (JSON.stringify(newWpCoords) !== JSON.stringify(waypointCoords)) {
                                    setWaypointCoords(newWpCoords);
                                }
                                if (dropoffCoords) {
                                    setDropoffCoords(null);
                                }
                                return;
                            }
                        }
                        handleUpdate({ distanceKm: distKm, etaTime: timeStr, calculatingRoute: false });
                    } else {
                        handleUpdate({ calculatingRoute: false });
                    }
                } catch (e) {
                    handleUpdate({ calculatingRoute: false });
                }
            } else {
                setRoutePolyline(null);
                handleUpdate({ distanceKm: 0, etaTime: '' });
            }
        };
        const timer = setTimeout(calculateRoute, 800);
        return () => clearTimeout(timer);
    }, [pickupCoords, waypointCoords, dropoffCoords, data.vehicle]);

    const weightVal = parseFloat(data.dimensions.weight) || 0;
    const eligibleVehicles = VEHICLES.filter(v => {
        if (data.distanceKm > v.maxDist) return false;
        if (!v.allowedCats.includes(data.category)) return false;
        if (data.category === 'A' && weightVal > v.maxWeight) return false;
        return true;
    });
    const activeVehicle = VEHICLES.find(v => v.id === data.vehicle) || eligibleVehicles[0];
    const liveBasePrice = activeVehicle ? (activeVehicle.pricePerKm * data.distanceKm) : 0;
    const currentQuote = Math.round(Math.max(150, data.serviceType === 'Express' ? liveBasePrice * 1.5 : liveBasePrice) / 10) * 10;

    const submitBooking = () => {
        const newOrder = {
            id: `ORD-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
            pickup: data.pickup,
            dropoff: data.dropoff,
            pickupCoords: pickupCoords || { lat: 0, lng: 0 },
            dropoffCoords: dropoffCoords || { lat: 0, lng: 0 },
            vehicle: data.vehicle,
            items: {
                itemDesc: `${data.category} - ${data.subCategory}`,
                weightKg: parseInt(data.dimensions.weight) || 1,
                fragile: false,
                value: 0
            },
            price: currentQuote,
            driverRate: Math.max(100, currentQuote * 0.8),
            status: 'pending',
            estimatedDuration: '45 mins',
            date: new Date().toISOString(),
            sender: { name: 'Customer', phone: '' },
            recipient: { name: data.receiverName || 'Receiver', phone: data.receiverPhone || '' },
            paymentMethod: data.paymentMethod || 'MPESA',
            verificationCode: Math.floor(1000 + Math.random() * 9000).toString(),
            serviceType: data.serviceType || 'Standard (Same Day)',
            stops: data.waypoints.map((addr, idx) => ({
                id: `wp-${idx}`,
                address: addr,
                lat: waypointCoords[idx]?.lat || 0,
                lng: waypointCoords[idx]?.lng || 0,
                type: 'waypoint',
                status: 'pending',
                verificationCode: Math.floor(1000 + Math.random() * 9000).toString(),
                sequenceOrder: idx + 1
            }))
        };

        if (onOrderComplete) {
            onOrderComplete(newOrder);
        } else {
            alert('Booking Completed! Check console.');
            console.log('Final Payload:', newOrder);
        }
    };

    return (
        <div className="fixed bottom-0 inset-x-0 pointer-events-none z-[100] flex flex-col justify-end mx-auto max-w-lg">

            {/* Sheet Background adhering exactly to the bottom */}
            <motion.div
                layout
                className={`w-full bg-white shadow-[0_-15px_40px_rgba(0,0,0,0.12)] rounded-t-[2.5rem] overflow-hidden pointer-events-auto border-t border-gray-100 flex flex-col pb-[env(safe-area-inset-bottom,0)] pb-1 transition-all duration-300 ${data.isSearchingText ? 'h-[90vh]' : 'max-h-[90vh]'}`}
                transition={{ duration: 0.3, type: 'tween', ease: 'easeOut' }}
            >
                {/* Minimal Header Indicator */}
                <div className="px-5 pt-3 pb-2 flex flex-col items-center w-full z-10 bg-white flex-shrink-0">
                    <div className="w-12 h-1 bg-gray-200 rounded-full mb-3" />
                    <div className="w-full flex justify-between mt-1 items-end">
                        {(() => {
                            const STEP_INFO = [
                                { title: 'Route', icon: Navigation },
                                { title: 'Cargo Type', icon: Box },
                                { title: 'Choose Vehicle', icon: Truck },
                                { title: 'Receiver Details', icon: User },
                                { title: 'Payment Option', icon: Banknote }
                            ];
                            const ActiveStepIcon = STEP_INFO[step].icon;
                            return (
                                <span className="flex items-center gap-1.5 text-[10px] font-black text-brand-600 uppercase tracking-widest bg-brand-50/50 px-2 py-1 rounded-md mb-2 mt-[-4px]">
                                    <ActiveStepIcon size={12} strokeWidth={3} /> {step === 0 ? (data.activeTab === "pickup" ? "Pickup Point" : (data.waypoints.length > 0 ? "Drop offs" : "Drop off")) : STEP_INFO[step].title} ({step + 1}/5)
                                </span>
                            );
                        })()}
                        <div className="flex flex-col items-end gap-1.5 mt-[-4px]">
                            <AnimatePresence>
                                {(data.distanceKm > 0 || data.calculatingRoute) && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 5 }}
                                        className="flex items-center gap-2 bg-white px-2 py-0.5 rounded-lg border border-brand-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] mb-1"
                                    >
                                        {data.calculatingRoute ? (
                                            <span className="text-[10px] font-bold text-brand-600 animate-pulse w-full text-center px-2">Calculating Route...</span>
                                        ) : (
                                            <>
                                                <span className="text-[11px] font-black text-gray-900 leading-none">{data.distanceKm.toFixed(1)} <span className="text-[8px] text-gray-500 font-medium tracking-tighter">km</span></span>
                                                <div className="w-[3px] h-[3px] bg-brand-200 rounded-full" />
                                                <div className="flex items-center gap-1">
                                                    <div className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-pulse" />
                                                    <span className="text-[11px] font-black text-brand-600 leading-none">{data.etaTime}</span>
                                                </div>
                                                <div className="w-[3px] h-[3px] bg-brand-200 rounded-full ml-1" />
                                                <span className="text-[11px] font-black text-gray-900 leading-none ml-1">
                                                    KES {currentQuote.toLocaleString()}
                                                </span>
                                            </>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            <div className="flex space-x-1.5 opacity-80">
                                {[0, 1, 2, 3, 4].map(i => (
                                    <motion.div layout key={i} className={`h-1.5 rounded-full ${i === step ? 'w-5 bg-brand-600' : 'w-1.5 bg-gray-200'}`} />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Steps Container */}
                <div className="relative px-5 pb-1 w-full flex-1 overflow-y-auto no-scrollbar" style={{ paddingBottom: "0.25rem" }}>
                    <AnimatePresence mode="popLayout" custom={direction} initial={false}>
                        <motion.div
                            key={step} custom={direction} variants={slideVariants}
                            initial="enter" animate="center" exit="exit"
                            transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                            className="w-full h-full"
                        >
                            {step === 0 && <Step1Where data={data} update={handleUpdate} next={nextStep} />}
                            {step === 1 && <Step2What data={data} update={handleUpdate} next={nextStep} prev={prevStep} />}
                            {step === 2 && <Step3How data={data} update={handleUpdate} next={nextStep} prev={prevStep} />}
                            {step === 3 && <Step4Who data={data} update={handleUpdate} next={nextStep} prev={prevStep} />}
                            {step === 4 && <Step5Payment data={data} update={handleUpdate} submit={submitBooking} prev={prevStep} />}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
}

// --- Step 1: WHERE ---
const Step1Where = ({ data, update, next }: any) => {
    const activeTab = data.activeTab || 'pickup';
    const setActiveTab = (tab: 'pickup' | 'dropoff') => update({ activeTab: tab });
    const maxDropoffsReached = data.waypoints.length >= 5;

    const [pickupSuggestions, setPickupSuggestions] = useState<any[]>([]);
    const [dropoffSuggestions, setDropoffSuggestions] = useState<any[]>([]);

    const { setPickupCoords, setWaypointCoords, waypointCoords, setDropoffCoords, setIsMapSelecting, setActiveInput, isMapSelecting, activeInput, mapCenter, setMapCenter, fitBounds, requestUserLocation } = useMapState();

    const handlePickupChange = async (val: string) => {
        update({ pickup: val });
        if (val.length > 2) {
            const results = await mapService.getSuggestions(val);
            setPickupSuggestions(results);
        } else {
            setPickupSuggestions([]);
        }
    };

    const handlePickupSelect = async (sug: any) => {
        update({ pickup: sug.label });
        setPickupSuggestions([]);
        const resolved = await mapService.geocodeAddress(sug.label);
        if (resolved) {
            setPickupCoords({ lat: resolved.lat, lng: resolved.lng });
            fitBounds([{ lat: resolved.lat, lng: resolved.lng }]);
            setActiveTab('dropoff');
        }
    };

    const handleDropoffChange = async (val: string) => {
        update({ dropoff: val });
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
            update({ waypoints: newWp, dropoff: '' });
            setWaypointCoords(newCoords);
        }
    };

    const manualSelectMap = (type: 'pickup' | 'dropoff') => {
        setActiveInput(type);
        setIsMapSelecting(true);
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
                                    update({ isSearchingText: true });
                                }}
                                onBlur={() => {
                                    setTimeout(() => update({ isSearchingText: false }), 200);
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
                                        update({ pickup: 'Locating...' });
                                        try {
                                            const loc = await requestUserLocation();
                                            if (loc) {
                                                setMapCenter(loc.lat, loc.lng);
                                                fitBounds([loc]);
                                                setIsMapSelecting(true);
                                                setActiveInput('pickup');
                                                const address = await mapService.reverseGeocode(loc.lat, loc.lng);
                                                if (address) {
                                                    update({ pickup: address });
                                                }
                                            } else {
                                                update({ pickup: '' });
                                            }
                                        } catch (err) {
                                            update({ pickup: '' });
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
                        <button onClick={() => setActiveTab('pickup')} className="flex items-center gap-2 text-sm text-gray-500 font-bold hover:text-gray-900 mb-2 transition-colors">
                            <ArrowLeft size={16} /> Back to Pickup
                        </button>
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
                                                            <span className="text-[11px] font-bold text-gray-900 truncate w-full text-center px-1 mt-1" title={wp}>{wp.split(',')[0]}</span>
                                                            <button onClick={() => {
                                                                if (isFinalDropoff) {
                                                                    update({ dropoff: '' });
                                                                    setDropoffCoords(null);
                                                                } else {
                                                                    const newWp = data.waypoints.filter((_: any, i: number) => i !== idx);
                                                                    const newCoords = waypointCoords.filter((_: any, i: number) => i !== idx);
                                                                    update({ waypoints: newWp });
                                                                    setWaypointCoords(newCoords);
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
                            <input
                                autoFocus type="text" placeholder={maxDropoffsReached ? "Max dropoffs reached (5)" : (data.waypoints.length > 0 ? "Search another dropoff" : "Search Dropoff Location")}
                                className="w-full pl-12 pr-20 py-4 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-brand-500 focus:bg-white text-gray-900 text-base font-bold transition-all disabled:opacity-50 min-h-[56px]"
                                value={data.dropoff}
                                onFocus={() => {
                                    setIsMapSelecting(false);
                                    setActiveInput('dropoff');
                                    update({ isSearchingText: true });
                                }}
                                onBlur={() => {
                                    setTimeout(() => update({ isSearchingText: false }), 200);
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
                        <div className="flex gap-2 mt-4">
                            <button onClick={() => setActiveTab('pickup')} className="w-12 bg-gray-100 text-gray-700 rounded-xl flex items-center justify-center hover:bg-gray-200"><ArrowLeft size={16} /></button>
                            <button
                                onClick={() => {
                                    if (data.dropoff && isMapSelecting && mapCenter && activeInput === 'dropoff') {
                                        setIsMapSelecting(false);
                                        const address = data.dropoff;
                                        const newWp = [...data.waypoints, address];
                                        const newCoords = [...waypointCoords, { lat: mapCenter.lat, lng: mapCenter.lng }];
                                        update({ waypoints: newWp, dropoff: "" });
                                        setWaypointCoords(newCoords);
                                    } else {
                                        next();
                                    }
                                }}
                                disabled={(data.waypoints.length === 0 && !data.dropoff) || (isMapSelecting && !data.dropoff)}
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



const Step2What = ({ data, update, next, prev }: any) => {
    const tabs = [
        { id: 'A', label: '📦 Standard' },
        { id: 'B', label: '🛋️ Bulky' },
        { id: 'C', label: '🚛 Dedicated' }
    ];

    const subcategories = {
        'A': [
            { id: 'Document', label: 'Document', desc: 'Max 0.5kg', examples: 'e.g. passports, keys, envelopes', icon: FileText },
            { id: 'Small Box', label: 'Small Box', desc: 'Max 2kg', examples: 'e.g. phones, clothes, books', icon: Package },
            { id: 'Medium Box', label: 'Medium Box', desc: 'Max 5kg', examples: 'e.g. shoes, laptops, toasters', icon: Box },
            { id: 'Large Box', label: 'Large Box', desc: 'Max 15kg', examples: 'e.g. microwaves, desktop pcs', icon: PackageOpen },
            { id: 'Jumbo Box', label: 'Jumbo Box', desc: 'Max 30kg', examples: 'e.g. mini-fridges, seating', icon: Archive },
            { id: 'Custom Dimensions', label: 'Custom', desc: 'Custom', examples: 'enter sizes below', icon: Ruler }
        ],
        'B': [
            { id: 'TVs', label: 'TVs (All Sizes)', desc: 'Secure transit' },
            { id: 'Fridges & Freezers', label: 'Fridges & Freezers', desc: 'Upright handling' },
            { id: 'Washing Machines', label: 'Washing Machines', desc: 'Heavy appliances' },
            { id: 'Sofas & Seats', label: 'Sofas & Seats', desc: 'Furniture delivery' },
            { id: 'Beds & Mattresses', label: 'Beds & Mattresses', desc: 'Bedroom furniture' },
            { id: 'Hardware', label: 'Hardware/Construction', desc: 'Raw materials' },
            { id: 'Agricultural Sacks', label: '90kg Ag Sacks', desc: 'Cereals & Produce' }
        ],
        'C': [
            { id: 'Cargo Tuk-Tuk', label: 'Cargo Tuk-Tuk', desc: 'Max 500kg' },
            { id: 'Station Wagon', label: 'Station Wagon', desc: 'Max 500kg' },
            { id: '1-Ton Pick-up', label: '1-Ton Pick-up', desc: 'Farm & Hardware' },
            { id: '3-Ton Canter', label: '3-Ton Canter', desc: 'Mid-size loads' },
            { id: '10-Ton Lorry', label: '10-Ton Lorry', desc: 'Heavy freight' }
        ]
    };

    const activeItems = subcategories[data.category as keyof typeof subcategories];

    return (
        <div className="space-y-4">
            {/* Filter Tabs */}
            <div className="grid grid-cols-3 gap-1 pb-2 pt-2 px-0 text-center w-full">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => update({ category: tab.id, subCategory: '' })}
                        className={`flex-1 px-1 py-3 rounded-xl text-[11px] sm:text-sm font-bold whitespace-nowrap transition-all border ${data.category === tab.id
                            ? 'bg-brand-50 border-brand-500 text-brand-700 shadow-sm ring-1 ring-brand-500'
                            : 'bg-gray-100 border-gray-200 text-gray-500 hover:bg-gray-200'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Vertical Subcategory Grid */}
            <div className="min-h-[160px]">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={data.category}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="grid grid-cols-2 gap-3 max-h-[45vh] overflow-y-auto no-scrollbar p-1 pb-4"
                    >
                        {activeItems.map((item: any) => {
                            const isSelected = data.subCategory === item.id;
                            const isA = data.category === 'A';
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => update({ subCategory: item.id })}
                                    className={`relative text-left p-2.5 rounded-xl border transition-all flex flex-col ${isSelected
                                        ? 'border-brand-500 bg-brand-50 shadow-sm scale-[1.02] ring-1 ring-brand-500'
                                        : 'border-gray-200 bg-white hover:border-brand-200 hover:bg-gray-50'
                                        } ${isA ? 'min-h-[85px] justify-start gap-1' : ''}`}
                                >
                                    {isA && item.icon && <item.icon className={`w-5 h-5 ${isSelected ? 'text-brand-600' : 'text-gray-400'}`} />}

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

            {/* Conditional Inputs - Only for Standard (Category A) */}
            <AnimatePresence>
                {data.category === 'A' && data.subCategory !== '' && (
                    <motion.div
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="grid grid-cols-2 gap-3 pt-2 px-1">
                            {['Length', 'Width', 'Height', 'Weight'].map((dim) => {
                                const prop = dim.toLowerCase() as keyof typeof data.dimensions;
                                return (
                                    <div key={dim} className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase">{dim} {dim === 'Weight' ? '(kg)' : '(cm)'}</label>
                                        <input
                                            type="number"
                                            value={data.dimensions[prop]}
                                            onChange={e => update({ dimensions: { ...data.dimensions, [prop]: e.target.value } })}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex gap-2 pt-2">
                <button onClick={prev} className="w-12 bg-gray-100 text-gray-700 rounded-xl flex items-center justify-center hover:bg-gray-200"><ArrowLeft size={16} /></button>
                <button
                    onClick={next}
                    disabled={!data.subCategory}
                    className="flex-1 py-3 bg-brand-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 transition-all"
                >
                    Next: Select Vehicle <ArrowRight size={16} />
                </button>
            </div>
        </div>
    );
}

const Step3How = ({ data, update, next, prev }: any) => {
    const weightVal = parseFloat(data.dimensions.weight) || 0;

    const eligibleVehicles = VEHICLES.filter(v => {
        if (data.distanceKm > v.maxDist) return false;
        if (!v.allowedCats.includes(data.category)) return false;
        if (data.category === 'A' && weightVal > v.maxWeight) return false;
        return true;
    });

    const activeVehicle = VEHICLES.find(v => v.id === data.vehicle) || eligibleVehicles[0];
    const basePrice = activeVehicle ? (activeVehicle.pricePerKm * data.distanceKm) : 0;
    const finalPriceRaw = Math.max(150, data.serviceType === 'Express' ? basePrice * 1.5 : basePrice);
    const finalPrice = Math.round(finalPriceRaw / 10) * 10;

    useEffect(() => {
        if (eligibleVehicles.length > 0 && !eligibleVehicles.find(v => v.id === data.vehicle)) {
            update({ vehicle: eligibleVehicles[0].id });
        }
    }, [eligibleVehicles, data.vehicle, update]);

    return (
        <div className="space-y-4">
            <div className="flex gap-1 bg-gray-100/80 p-1 rounded-xl">
                {[
                    { id: 'Express', icon: Zap, label: 'Express', color: 'text-orange-500', bg: 'bg-orange-50' },
                    { id: 'Standard', icon: Clock, label: 'Standard', color: 'text-brand-500', bg: 'bg-brand-50' }
                ].map(type => {
                    const active = data.serviceType === type.id;
                    return (
                        <button
                            key={type.id} onClick={() => update({ serviceType: type.id as ServiceType })}
                            className={`flex-1 py-2 text-xs font-bold flex items-center justify-center gap-1.5 rounded-lg transition-all ${active ? `bg-white shadow-sm ring-1 ring-gray-200 text-gray-900` : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <div className={`p-1 rounded-full ${active ? type.bg : 'bg-transparent'}`}>
                                <type.icon size={14} className={active ? type.color : 'text-gray-400'} />
                            </div>
                            {type.label}
                        </button>
                    )
                })}
            </div>

            <div className="flex gap-2 pb-2 pt-0.5 px-0.5 justify-center w-full max-w-full overflow-x-auto no-scrollbar snap-x">
                {eligibleVehicles.length === 0 ? (
                    <div className="w-full p-3 bg-red-50 text-red-600 rounded-xl text-xs font-medium border border-red-100">No vehicles support these limits.</div>
                ) : (
                    eligibleVehicles.map(v => (
                        <button
                            key={v.id} onClick={() => update({ vehicle: v.id })}
                            className={`flex-shrink-0 w-[85px] snap-center p-2.5 rounded-[1rem] border flex flex-col items-center text-center transition-all duration-200 ${data.vehicle === v.id ? `border-gray-300 ${v.bgLight} shadow-sm ring-1 ring-gray-300 scale-[1.02]` : 'border-gray-200 bg-white hover:border-gray-300 scale-100'}`}
                        >
                            <div className={`p-1.5 rounded-full mb-2 ${data.vehicle === v.id ? 'bg-white shadow-sm' : 'bg-gray-50'}`}>
                                <v.icon size={18} className={data.vehicle === v.id ? v.color : 'text-gray-400'} />
                            </div>
                            <div className="font-bold text-[11px] leading-tight text-gray-900 line-clamp-1">{v.label}</div>
                            <div className="text-[9px] font-medium text-gray-500 mt-0.5">≤ {v.maxWeight}kg</div>
                        </button>
                    ))
                )}
            </div>

            <div className="flex items-center justify-end pt-2">
                <div className="flex gap-2 w-full">
                    <button onClick={prev} className="px-3 bg-gray-100 text-gray-700 rounded-xl flex items-center justify-center hover:bg-gray-200"><ArrowLeft size={16} /></button>
                    <button onClick={next} disabled={!data.vehicle} className="flex-1 py-3.5 bg-gray-900 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-gray-900/20 disabled:opacity-50">
                        Continue to Details <ArrowRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Step 4: WHO ---
const Step4Who = ({ data, update, next, prev }: any) => {
    const recentReceivers = [
        { name: 'Jane Doe', phone: '0712345678', id: '12345678' },
        { name: 'John Smith', phone: '0722000111', id: '87654321' }
    ];

    return (
        <div className="space-y-3">
            <div className="mb-3">
                <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Recent Receivers</label>
                <div className="flex gap-2 mt-1.5 overflow-x-auto no-scrollbar pb-1 px-1 snap-x">
                    {recentReceivers.map((r, i) => (
                        <button
                            key={i}
                            onClick={() => update({ receiverName: r.name, receiverPhone: r.phone, receiverId: r.id })}
                            className="flex-shrink-0 snap-start bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-xs font-bold text-gray-700 hover:border-brand-500 hover:text-brand-600 transition-colors shadow-sm"
                        >
                            {r.name}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-2">
                <input
                    type="text" placeholder="Receiver Name"
                    className="w-full px-3.5 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-brand-500 text-sm font-bold transition-all"
                    value={data.receiverName} onChange={e => update({ receiverName: e.target.value })}
                />
                <input
                    type="tel" placeholder="Phone Number"
                    className="w-full px-3.5 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-brand-500 text-sm font-bold transition-all"
                    value={data.receiverPhone} onChange={e => update({ receiverPhone: e.target.value })}
                />
                <input
                    type="text" placeholder="Recipient ID Number"
                    className="w-full px-3.5 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-brand-500 text-sm font-bold transition-all"
                    value={data.receiverId} onChange={e => update({ receiverId: e.target.value })}
                />
            </div>

            <div className="flex gap-2 pt-1">
                <button onClick={prev} className="px-4 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200"><ArrowLeft size={16} /></button>
                <button onClick={next} disabled={!data.receiverName || !data.receiverPhone || !data.receiverId} className="flex-1 py-3 bg-gray-900 text-white rounded-xl text-sm font-bold flex flex-center gap-1.5 justify-center disabled:opacity-50">
                    Payment <ArrowRight size={16} />
                </button>
            </div>
        </div>
    );
};

// --- Step 5: PAYMENT ---
const Step5Payment = ({ data, update, submit, prev }: any) => (
    <div className="space-y-4">


        <div className="grid grid-cols-2 gap-2 pt-2 pb-1 px-1">
            <button
                onClick={() => update({ paymentMethod: 'M-Pesa' })}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-all ${data.paymentMethod === 'M-Pesa' ? 'border-green-500 bg-green-50 text-green-700 ring-1 ring-green-500 scale-[1.02]' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'}`}
            >
                <div className="flex items-center justify-center h-8 mb-1">
                    <img src="/assets/mpesa.png" alt="M-Pesa" className={`h-8 w-auto object-contain ${data.paymentMethod === 'M-Pesa' ? '' : 'grayscale opacity-60'}`} />
                </div>
                <span className="font-bold text-xs uppercase tracking-wider">Digital</span>
            </button>
            <button
                onClick={() => update({ paymentMethod: 'Cash' })}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${data.paymentMethod === 'Cash' ? 'border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-500 scale-[1.02]' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'}`}
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
                        value={data.paymentPhone} onChange={e => update({ paymentPhone: e.target.value })}
                    />
                </motion.div>
            )}
        </AnimatePresence>

        <div className="flex gap-2 pt-1">
            <button onClick={prev} className="px-4 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200"><ArrowLeft size={16} /></button>
            <button onClick={submit} className="flex-1 py-3 bg-brand-600 text-white rounded-xl text-sm font-bold flex items-center gap-1.5 justify-center shadow-lg shadow-brand-600/30 hover:bg-brand-500 transition-colors">
                Confirm & Pay <Check size={16} />
            </button>
        </div>
    </div>
);
