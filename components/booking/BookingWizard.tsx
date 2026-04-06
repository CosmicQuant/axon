import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { mapService } from '../../services/mapService';
import { useMapState } from '@/context/MapContext';
import { MapPin, Map, Box, Truck, User, ArrowRight, ArrowLeft, Check, Camera, Zap, Clock, Bike, Car, Plus, Navigation, LocateFixed, Smartphone, Banknote, X, FileText, Package, PackageOpen, Archive, Ruler } from 'lucide-react';
import mpesaLogo from '../../assets/mpesa.png';

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
    isScheduled: boolean;
    pickupTime: string;
    isSearchingText?: boolean;
}

const INITIAL_STATE: BookingState = {
    pickup: '', dropoff: '', waypoints: [], distanceKm: 0, activeTab: 'pickup',
    category: 'A', subCategory: '', dimensions: { length: '', width: '', height: '', weight: '' }, imageUploaded: false,
    vehicle: '', serviceType: 'Express',
    receiverName: '', receiverPhone: '', receiverId: '',
    paymentMethod: 'M-Pesa', paymentPhone: '0712345678',
    isScheduled: false, pickupTime: ''
};

const VEHICLES = [
    { id: 'boda', label: 'Motorbike', maxDist: 65, maxWeight: 100, allowedCats: ['A'], pricePerKm: 30, img: '/icons3d/motorcycle.png', color: 'text-orange-500', bgColor: 'bg-orange-500', bgLight: 'bg-orange-50' },
    { id: 'tuktuk', label: 'Cargo Tuk-Tuk', maxDist: 65, maxWeight: 500, allowedCats: ['A'], pricePerKm: 50, img: '/icons3d/auto_rickshaw.png', color: 'text-yellow-500', bgColor: 'bg-yellow-500', bgLight: 'bg-yellow-50' },
    { id: 'probox', label: 'Probox', maxDist: 9999, maxWeight: 800, allowedCats: ['A', 'B'], pricePerKm: 70, img: '/icons3d/automobile.png', color: 'text-blue-500', bgColor: 'bg-blue-500', bgLight: 'bg-blue-50' },
    { id: 'van', label: 'Cargo Van', maxDist: 9999, maxWeight: 1500, allowedCats: ['A', 'B'], pricePerKm: 90, img: '/icons3d/minibus.png', color: 'text-indigo-500', bgColor: 'bg-indigo-500', bgLight: 'bg-indigo-50' },
    { id: 'pickup', label: 'Pick-up', maxDist: 9999, maxWeight: 2000, allowedCats: ['A', 'B'], pricePerKm: 100, img: '/icons3d/pickup_truck.png', color: 'text-emerald-500', bgColor: 'bg-emerald-500', bgLight: 'bg-emerald-50' },
    { id: 'canter', label: 'Canter 3T', maxDist: 9999, maxWeight: 3000, allowedCats: ['B'], pricePerKm: 150, img: '/icons3d/delivery_truck.png', color: 'text-teal-600', bgColor: 'bg-teal-600', bgLight: 'bg-teal-50' },
    { id: 'lorry', label: 'Lorry 10T', maxDist: 9999, maxWeight: 10000, allowedCats: ['B'], pricePerKm: 200, img: '/icons3d/articulated_lorry.png', color: 'text-slate-700', bgColor: 'bg-slate-700', bgLight: 'bg-slate-50' },
    { id: 'tipper', label: 'Tipper', maxDist: 9999, maxWeight: 15000, allowedCats: ['B'], pricePerKm: 220, img: '/icons3d/tipper_truck.svg', color: 'text-amber-700', bgColor: 'bg-amber-700', bgLight: 'bg-amber-50' },
    { id: 'container', label: 'Container', maxDist: 9999, maxWeight: 20000, allowedCats: ['B'], pricePerKm: 280, img: '/icons3d/container_truck.svg', color: 'text-purple-600', bgColor: 'bg-purple-600', bgLight: 'bg-purple-50' },
    { id: 'tanker', label: 'Tanker', maxDist: 9999, maxWeight: 25000, allowedCats: ['B'], pricePerKm: 300, img: '/icons3d/tanker_truck.svg', color: 'text-red-600', bgColor: 'bg-red-600', bgLight: 'bg-red-50' }
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

    const nextStep = (skipTo?: number) => {
        const target = typeof skipTo === 'number' ? skipTo : step + 1;
        if (target <= 4) { setDirection(1); setStep(target); }
    };
    const prevStep = (skipTo?: number) => {
        const target = typeof skipTo === 'number' ? skipTo : step - 1;
        if (target >= 0) { setDirection(-1); setStep(target); }
    };

    const handleUpdate = (updates: Partial<BookingState>) => setData(prev => ({ ...prev, ...updates }));

    const { pickupCoords, dropoffCoords, waypointCoords, setRoutePolyline, setIsMapSelecting, setActiveInput, setPickupCoords, setWaypointCoords, setDropoffCoords, userLocation, requestUserLocation, isMapSelecting, activeInput, mapCenter, fitBounds } = useMapState();

    // Consume prefillData on mount
    useEffect(() => {
        if (prefillData) {
            const updates: Partial<BookingState> = {};
            if (prefillData.pickup) updates.pickup = prefillData.pickup;
            if (prefillData.dropoff) updates.dropoff = prefillData.dropoff;
            if (prefillData.serviceType) updates.serviceType = prefillData.serviceType;
            if (prefillData.vehicle) updates.vehicle = prefillData.vehicle;
            if (prefillData.activeTab) updates.activeTab = prefillData.activeTab;
            if (prefillData.category) updates.category = prefillData.category;
            if (Object.keys(updates).length > 0) handleUpdate(updates);

            if (prefillData.pickupCoords) setPickupCoords(prefillData.pickupCoords);
            if (prefillData.dropoffCoords) setDropoffCoords(prefillData.dropoffCoords);

            // Removed explicit fitBounds here if dropoffCoords exist to prevent map stutter,
            // as calculateRoute will run 800ms later and perform a symmetric fitBounds gracefully.
            if (prefillData.pickupCoords && !prefillData.dropoffCoords) {
                fitBounds([prefillData.pickupCoords]);
            }
        }
    }, []); // Run only once on mount

    useEffect(() => {
        // Request accurate user location on load (skip if prefill already has pickup)
        if (prefillData?.pickup || prefillData?.pickupCoords) return;
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

    const fitBoundsFromPickup = (pickup: any, destinations: any[]) => {
        if (!pickup) return;
        if (!destinations || destinations.length === 0) {
            if (typeof fitBounds === 'function') fitBounds([pickup]);
            return;
        }
        let maxLatDiff = 0;
        let maxLngDiff = 0;
        destinations.forEach(d => {
            if (!d) return;
            maxLatDiff = Math.max(maxLatDiff, Math.abs(d.lat - pickup.lat));
            maxLngDiff = Math.max(maxLngDiff, Math.abs(d.lng - pickup.lng));
        });
        const padding = 1.1; // 10% padding
        if (typeof fitBounds === 'function') {
            fitBounds([
                { lat: pickup.lat - (maxLatDiff * padding), lng: pickup.lng - (maxLngDiff * padding) },
                { lat: pickup.lat + (maxLatDiff * padding), lng: pickup.lng + (maxLngDiff * padding) }
            ]);
        }
    };

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
                        // Zoom out symmetrically from pickup
                        if (allStops.length > 0) {
                            fitBoundsFromPickup(pickupCoords, allStops);
                        }
                        const distKm = route.distance / 1000;
                        const now = new Date();
                        now.setSeconds(now.getSeconds() + route.duration);
                        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                        if (route.full_optimized_order && stopInfo.length === route.full_optimized_order.length) {
                            const optimizedStops = route.full_optimized_order.map((optimizedIndex: number) => stopInfo[optimizedIndex]);
                            if (optimizedStops.length > 0) {
                                // Last stop in optimized order becomes the dropoff, rest are waypoints
                                const newWaypoints = optimizedStops.slice(0, -1);
                                const newDropoff = optimizedStops[optimizedStops.length - 1];

                                handleUpdate({
                                    dropoff: newDropoff.name,
                                    waypoints: newWaypoints.map((info: any) => info.name),
                                    distanceKm: distKm,
                                    etaTime: timeStr,
                                    calculatingRoute: false
                                });

                                const newWpCoords = newWaypoints.map((info: any) => info.coord);
                                if (JSON.stringify(newWpCoords) !== JSON.stringify(waypointCoords)) {
                                    setWaypointCoords(newWpCoords);
                                }
                                const newDropCoord = newDropoff.coord;
                                if (!dropoffCoords || dropoffCoords.lat !== newDropCoord.lat || dropoffCoords.lng !== newDropCoord.lng) {
                                    setDropoffCoords(newDropCoord);
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
                // No stops left — zoom back in to pickup location
                if (pickupCoords) {
                    fitBounds([pickupCoords]);
                }
            }
        };
        const timer = setTimeout(calculateRoute, 800);
        return () => clearTimeout(timer);
    }, [pickupCoords, waypointCoords, dropoffCoords]);

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
        // Resolve the final destination: if dropoff is empty (all destinations pushed to waypoints),
        // use the last waypoint as the actual dropoff and the rest as intermediate stops
        let finalDropoffAddress = data.dropoff;
        let finalDropoffCoords = dropoffCoords;
        let intermediateWaypoints = [...data.waypoints];
        let intermediateCoords = [...waypointCoords];

        if (!finalDropoffAddress && intermediateWaypoints.length > 0) {
            finalDropoffAddress = intermediateWaypoints[intermediateWaypoints.length - 1];
            finalDropoffCoords = intermediateCoords[intermediateCoords.length - 1] || null;
            intermediateWaypoints = intermediateWaypoints.slice(0, -1);
            intermediateCoords = intermediateCoords.slice(0, -1);
        }

        const generateCode = () => Math.floor(1000 + Math.random() * 9000).toString();
        const dropoffCode = generateCode();

        const newOrder = {
            id: prefillData?.id || `ORD-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
            pickup: data.pickup,
            dropoff: finalDropoffAddress,
            pickupCoords: pickupCoords || { lat: 0, lng: 0 },
            dropoffCoords: finalDropoffCoords || { lat: 0, lng: 0 },
            pickupTime: data.isScheduled ? data.pickupTime : 'ASAP',
            vehicle: data.vehicle,
            items: {
                itemDesc: `${data.category} - ${data.subCategory}`,
                weightKg: parseInt(data.dimensions.weight) || 1,
                fragile: false,
                value: 0
            },
            price: (data as any).price || currentQuote,
            driverRate: Math.max(100, ((data as any).price || currentQuote) * 0.8),
            status: 'pending',
            estimatedDuration: '45 mins',
            date: new Date().toISOString(),
            sender: { name: 'Customer', phone: '' },
            recipient: { name: data.receiverName || 'Receiver', phone: data.receiverPhone || '', id: data.receiverId || '' },
            paymentMethod: data.paymentMethod || 'MPESA',
            verificationCode: dropoffCode,
            serviceType: data.serviceType || 'Standard (Same Day)',
            stops: [
                ...intermediateWaypoints.map((addr, idx) => ({
                    id: `wp-${idx}`,
                    address: addr,
                    lat: intermediateCoords[idx]?.lat || 0,
                    lng: intermediateCoords[idx]?.lng || 0,
                    type: 'waypoint' as const,
                    status: 'pending' as const,
                    verificationCode: generateCode(),
                    sequenceOrder: idx + 1
                })),
                {
                    id: 'dropoff-end',
                    address: finalDropoffAddress,
                    lat: finalDropoffCoords?.lat || 0,
                    lng: finalDropoffCoords?.lng || 0,
                    type: 'dropoff' as const,
                    status: 'pending' as const,
                    verificationCode: dropoffCode,
                    sequenceOrder: intermediateWaypoints.length + 1
                }
            ]
        };

        if (onOrderComplete) {
            onOrderComplete(newOrder);
        } else {
            alert('Booking Completed! Check console.');
            console.log('Final Payload:', newOrder);
        }
    };

    return (
        <div className="fixed bottom-0 inset-x-0 md:inset-x-auto md:right-4 md:top-4 md:bottom-4 md:w-[400px] pointer-events-none z-[100] flex flex-col justify-end mx-auto max-w-lg md:max-w-none md:mx-0">

            {/* Sheet Background adhering exactly to the bottom */}
            <motion.div
                layout
                className={`w-full bg-white shadow-[0_-15px_40px_rgba(0,0,0,0.12)] md:shadow-2xl rounded-t-[2.5rem] md:rounded-2xl overflow-hidden pointer-events-auto border-t border-gray-100 md:border flex flex-col pb-[env(safe-area-inset-bottom,0)] pb-1 transition-all duration-300 ${data.isSearchingText ? 'h-[90vh]' : 'max-h-[90vh] md:max-h-[calc(100vh-2rem)]'}`}
                transition={{ duration: 0.3, type: 'tween', ease: 'easeOut' }}
            >
                {/* Minimal Header Indicator */}
                <div className="px-5 pt-3 pb-1 flex flex-col items-center w-full z-10 bg-white flex-shrink-0">
                    <div className="w-12 h-1 bg-gray-200 rounded-full mb-2 md:hidden" />
                    <div className="w-full flex justify-between items-center">
                        <AnimatePresence>
                            {step >= 1 && (data.distanceKm > 0 || data.calculatingRoute) && (
                                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }} className="flex items-center gap-2 text-[11px] font-black text-gray-500">
                                    {data.calculatingRoute ? (
                                        <span className="text-[10px] font-bold text-brand-600 animate-pulse">Calculating...</span>
                                    ) : (
                                        <>
                                            <span className="text-brand-600">E.T.A {data.etaTime}</span>
                                            {(data as any).price > 0 && (<>
                                                <span className="w-1 h-1 rounded-full bg-gray-300" />
                                                <span className="text-gray-900">KES {(data as any).price.toLocaleString()}</span>
                                            </>)}
                                        </>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                        <div className="flex space-x-1.5 ml-auto">
                            {[0, 1, 2, 3, 4].map(i => (
                                <motion.div layout key={i} className={`h-1.5 rounded-full ${i === step ? 'w-5 bg-brand-600' : 'w-1.5 bg-gray-200'}`} />
                            ))}
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

    // Reference for Dropoff input to handle auto-focus optionally
    const dropoffInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (activeTab === 'dropoff' && !data.dropoff && data.waypoints.length === 0) {
            const timer = setTimeout(() => {
                update({ isSearchingText: true });
                dropoffInputRef.current?.focus();
            }, 250); // wait slightly longer than the 200ms onBlur timeout from Pickup to avoid race conditions
            return () => clearTimeout(timer);
        }
    }, [activeTab]);

    const { pickupCoords, dropoffCoords, setPickupCoords, setWaypointCoords, waypointCoords, setDropoffCoords, setIsMapSelecting, setActiveInput, isMapSelecting, activeInput, mapCenter, setMapCenter, fitBounds, requestUserLocation } = useMapState();

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
            // Removing fitBounds here so we don't have a jarring double-animation
            // when calculateRoute triggers its own fitBounds 800ms later.
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
                                                                    update({ dropoff: '' });
                                                                    setDropoffCoords(null);
                                                                    if (pickupCoords) {
                                                                        setTimeout(() => {
                                                                            const remaining = waypointCoords.filter(Boolean);
                                                                            if (remaining.length === 0) {
                                                                                if (typeof fitBounds === 'function') fitBounds([pickupCoords]);
                                                                            } else {
                                                                                let maxLatDiff = 0;
                                                                                let maxLngDiff = 0;
                                                                                remaining.forEach(d => {
                                                                                    maxLatDiff = Math.max(maxLatDiff, Math.abs(d.lat - pickupCoords.lat));
                                                                                    maxLngDiff = Math.max(maxLngDiff, Math.abs(d.lng - pickupCoords.lng));
                                                                                });
                                                                                const padding = 1.1;
                                                                                if (typeof fitBounds === 'function') fitBounds([
                                                                                    { lat: pickupCoords.lat - (maxLatDiff * padding), lng: pickupCoords.lng - (maxLngDiff * padding) },
                                                                                    { lat: pickupCoords.lat + (maxLatDiff * padding), lng: pickupCoords.lng + (maxLngDiff * padding) }
                                                                                ]);
                                                                            }
                                                                        }, 150);
                                                                    }
                                                                } else {
                                                                    const newWp = data.waypoints.filter((_: any, i: number) => i !== idx);
                                                                    const newCoords = waypointCoords.filter((_: any, i: number) => i !== idx);
                                                                    update({ waypoints: newWp });
                                                                    setWaypointCoords(newCoords);
                                                                    // Smoothly re-frame the map around remaining points
                                                                    if (pickupCoords) {
                                                                        const remaining = newCoords.filter(Boolean);
                                                                        if (remaining.length === 0 && !data.dropoff) {
                                                                            setTimeout(() => { if (typeof fitBounds === 'function') fitBounds([pickupCoords]); }, 150);
                                                                        } else {
                                                                            const allRemaining = [...remaining];
                                                                            if (data.dropoff && dropoffCoords) allRemaining.push(dropoffCoords);
                                                                            let maxLatDiff = 0;
                                                                            let maxLngDiff = 0;
                                                                            allRemaining.forEach(d => {
                                                                                maxLatDiff = Math.max(maxLatDiff, Math.abs(d.lat - pickupCoords.lat));
                                                                                maxLngDiff = Math.max(maxLngDiff, Math.abs(d.lng - pickupCoords.lng));
                                                                            });
                                                                            const padding = 1.1;
                                                                            setTimeout(() => {
                                                                                if (typeof fitBounds === 'function') fitBounds([
                                                                                    { lat: pickupCoords.lat - (maxLatDiff * padding), lng: pickupCoords.lng - (maxLngDiff * padding) },
                                                                                    { lat: pickupCoords.lat + (maxLatDiff * padding), lng: pickupCoords.lng + (maxLngDiff * padding) }
                                                                                ]);
                                                                            }, 150);
                                                                        }
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
                        {/* Schedule Delivery Toggle */}
                        {(data.waypoints.length > 0 || data.dropoff) && !isMapSelecting && (
                            <div className="space-y-2">
                                <div className="flex bg-gray-100 p-1 rounded-xl">
                                    <button
                                        onClick={() => update({ isScheduled: false, pickupTime: '' })}
                                        className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${!data.isScheduled ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
                                    >
                                        <Zap size={14} className={!data.isScheduled ? 'text-brand-600' : 'text-gray-400'} /> Send Now
                                    </button>
                                    <button
                                        onClick={() => update({ isScheduled: true })}
                                        className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${data.isScheduled ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
                                    >
                                        <Clock size={14} className={data.isScheduled ? 'text-brand-600' : 'text-gray-400'} /> Schedule
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
                                                onChange={e => update({ pickupTime: e.target.value })}
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
                                        // Capture the pin coordinates at click time
                                        const pinnedCoords = { lat: mapCenter.lat, lng: mapCenter.lng };
                                        setIsMapSelecting(false);
                                        // Resolve address from the pinned coordinates
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
                                            update({ waypoints: newWp, dropoff: '' });
                                            setWaypointCoords(newCoords);
                                            if (pickupCoords) {
                                                setTimeout(() => {
                                                    let maxLatDiff = 0;
                                                    let maxLngDiff = 0;
                                                    newCoords.filter(Boolean).forEach(d => {
                                                        maxLatDiff = Math.max(maxLatDiff, Math.abs(d.lat - pickupCoords.lat));
                                                        maxLngDiff = Math.max(maxLngDiff, Math.abs(d.lng - pickupCoords.lng));
                                                    });
                                                    const padding = 1.1;
                                                    if (typeof fitBounds === 'function') fitBounds([
                                                        { lat: pickupCoords.lat - (maxLatDiff * padding), lng: pickupCoords.lng - (maxLngDiff * padding) },
                                                        { lat: pickupCoords.lat + (maxLatDiff * padding), lng: pickupCoords.lng + (maxLngDiff * padding) }
                                                    ]);
                                                }, 150);
                                            }
                                        }
                                    } else {
                                        next();
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



const Step2What = ({ data, update, next, prev }: any) => {
    const tabs = [
        { id: 'A', label: '📦 Standard' },
        { id: 'B', label: '🏗️ Bulky / Heavy' }
    ];

    const subcategories = {
        'A': [
            { id: 'Document', label: 'Document', desc: 'Max 0.5kg', examples: 'e.g. passports, keys, envelopes', img: '/icons3d/page_facing_up.png' },
            { id: 'Small Box', label: 'Small Box', desc: 'Max 2kg', examples: 'e.g. phones, clothes, books', img: '/icons3d/package.png' },
            { id: 'Medium Box', label: 'Medium Box', desc: 'Max 5kg', examples: 'e.g. shoes, laptops, toasters', img: '/icons3d/package.png' },
            { id: 'Large Box', label: 'Large Box', desc: 'Max 15kg', examples: 'e.g. microwaves, desktop pcs', img: '/icons3d/package.png' },
            { id: 'Jumbo Box', label: 'Jumbo Box', desc: 'Max 30kg', examples: 'e.g. mini-fridges, seating', img: '/icons3d/package.png' },
            { id: 'Custom Dimensions', label: 'Custom', desc: 'Custom', examples: 'enter sizes below', img: '/icons3d/triangular_ruler.png' }
        ],
        'B': [
            { id: 'TVs', label: 'TVs (All Sizes)', desc: 'Secure transit', img: '/icons3d/television.png' },
            { id: 'Fridges & Freezers', label: 'Fridges & Freezers', desc: 'Upright handling', img: '/icons3d/ice.png' },
            { id: 'Washing Machines', label: 'Washing Machines', desc: 'Heavy appliances', img: '/icons3d/gear.png' },
            { id: 'Sofas & Seats', label: 'Sofas & Seats', desc: 'Furniture delivery', img: '/icons3d/couch_and_lamp.png' },
            { id: 'Beds & Mattresses', label: 'Beds & Mattresses', desc: 'Bedroom furniture', img: '/icons3d/bed.png' },
            { id: 'Hardware', label: 'Hardware/Construction', desc: 'Raw materials', img: '/icons3d/hammer.png' },
            { id: 'Agricultural Sacks', label: '90kg Ag Sacks', desc: 'Cereals & Produce', img: '/icons3d/sheaf_of_rice.png' },
            { id: 'LPG & Gas', label: 'LPG / Gas (Bulk)', desc: 'Tanker transport', img: '/icons3d/fuel_pump.png' },
            { id: 'Petroleum & Oil', label: 'Petroleum / Oil', desc: 'Liquid bulk', img: '/icons3d/oil_drum.png' },
            { id: 'Loose Aggregate', label: 'Loose Aggregate', desc: 'Sand, gravel, ballast', img: '/icons3d/rock.png' }
        ]
    };

    const activeItems = subcategories[data.category as keyof typeof subcategories];

    return (
        <div className="space-y-4">
            {/* Filter Tabs */}
            <div className="grid grid-cols-2 gap-1 pb-2 pt-2 px-0 text-center w-full">
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
                                    <img src={item.img} alt={item.label} className="w-5 h-5 object-contain" />

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
                    onClick={() => next()}
                    disabled={!data.subCategory}
                    className="flex-1 py-3 bg-brand-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 transition-all"
                >
                    Next: Service &amp; Vehicle <ArrowRight size={16} />
                </button>
            </div>
        </div>
    );
}

const Step3How = ({ data, update, next, prev }: any) => {
    const isStandard = data.serviceType === 'Standard';
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
        if (!isStandard && eligibleVehicles.length > 0 && !eligibleVehicles.find(v => v.id === data.vehicle)) {
            update({ vehicle: eligibleVehicles[0].id });
        }
    }, [isStandard, eligibleVehicles, data.vehicle, update]);

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
                        onClick={() => update({ serviceType: svc.id, ...(svc.id === 'Standard' ? { vehicle: '' } : {}) })}
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
                                        key={v.id} onClick={() => update({ vehicle: v.id })}
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

            <div className="flex items-center justify-end pt-2">
                <div className="flex gap-2 w-full">
                    <button onClick={prev} className="px-3 bg-gray-100 text-gray-700 rounded-xl flex items-center justify-center hover:bg-gray-200"><ArrowLeft size={16} /></button>
                    <button onClick={next} disabled={!isStandard && !data.vehicle} className="flex-1 py-3.5 bg-gray-900 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-gray-900/20 disabled:opacity-50">
                        Continue to Details <ArrowRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Step 4: WHO ---
const Step4Who = ({ data, update, next, prev }: any) => {
    const recentReceivers: any[] = [];

    return (
        <div className="space-y-3">
            <div className="mb-2">
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 px-1 snap-x">
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
                <button onClick={() => prev()} className="px-4 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200"><ArrowLeft size={16} /></button>
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
                onClick={() => update({ paymentMethod: 'Cash' })}
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







