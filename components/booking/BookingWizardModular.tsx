import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { mapService } from '../../services/mapService';
import { useMapState } from '@/context/MapContext';
import { Navigation, Box, Truck, User, Banknote } from 'lucide-react';
import { BookingProvider, useBooking } from './BookingContext';
import { VEHICLES } from './constants';

import { Step1Where } from './steps/Step1Where';
import { Step2What } from './steps/Step2What';
import { Step2_5PackageDetails } from './steps/Step2_5PackageDetails';
import { Step3How } from './steps/Step3How';
import { Step4Who } from './steps/Step4Who';
import { Step5Payment } from './steps/Step5Payment';

const slideVariants = {
    enter: (direction: number) => ({ x: direction > 0 ? '30%' : '-30%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (direction: number) => ({ x: direction < 0 ? '30%' : '-30%', opacity: 0 })
};

interface BookingWizardProps {
    prefillData?: any;
    onOrderComplete?: (order: any) => void;
    onCollapseChange?: (isCollapsed: boolean) => void;
    onRequireAuth?: (title?: string, desc?: string) => void;
}

const WizardContent: React.FC<BookingWizardProps> = ({ prefillData, onOrderComplete }) => {
    const { data, updateData, step, direction } = useBooking();
    const { pickupCoords, dropoffCoords, waypointCoords, setRoutePolyline, setIsMapSelecting, setActiveInput, setPickupCoords, setWaypointCoords, setDropoffCoords, userLocation, requestUserLocation, isMapSelecting, activeInput, mapCenter, fitBounds } = useMapState();

    useEffect(() => {
        if (prefillData) {
            const updates: any = {};
            if (prefillData.pickup) updates.pickup = prefillData.pickup;
            if (prefillData.dropoff) updates.dropoff = prefillData.dropoff;
            if (prefillData.serviceType) updates.serviceType = prefillData.serviceType;
            if (prefillData.vehicle) updates.vehicle = prefillData.vehicle;
            if (prefillData.activeTab) updates.activeTab = prefillData.activeTab;
            if (prefillData.category) updates.category = prefillData.category;
            if (Object.keys(updates).length > 0) updateData(updates);

            if (prefillData.pickupCoords) setPickupCoords(prefillData.pickupCoords);
            if (prefillData.dropoffCoords) setDropoffCoords(prefillData.dropoffCoords);

            if (prefillData.pickupCoords && prefillData.dropoffCoords) {
                fitBounds([prefillData.pickupCoords, prefillData.dropoffCoords]);
            }
        }
    }, []);

    useEffect(() => {
        if (prefillData?.pickup || prefillData?.pickupCoords) return;
        requestUserLocation().then(loc => {
            if (loc && !data.pickup && !pickupCoords && !isMapSelecting) {
                setActiveInput('pickup');
                setIsMapSelecting(true);
                fitBounds([loc]);
                mapService.reverseGeocode(loc.lat, loc.lng).then(address => {
                    if (address) updateData({ pickup: address });
                }).catch(console.error);
            }
        });
    }, []);

    useEffect(() => {
        if (isMapSelecting && mapCenter) {
            const timer = setTimeout(async () => {
                try {
                    const address = await mapService.reverseGeocode(mapCenter.lat, mapCenter.lng);
                    if (address) {
                        if (activeInput === 'pickup') updateData({ pickup: address });
                        else if (activeInput === 'dropoff') updateData({ dropoff: address });
                    }
                } catch (e) { }
            }, 600);
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
                updateData({ calculatingRoute: true });
                try {
                    const route = await mapService.getFullyOptimizedRoute(pickupCoords, allStops, data.vehicle || 'Boda Boda');
                    if (route) {
                        setRoutePolyline(route.geometry);
                        if (allStops.length > 0) {
                            fitBounds([pickupCoords, ...allStops]);
                        }
                        const distKm = route.distance / 1000;
                        const now = new Date();
                        now.setSeconds(now.getSeconds() + route.duration);
                        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                        if (route.full_optimized_order && stopInfo.length === route.full_optimized_order.length) {
                            const optimizedStops = route.full_optimized_order.map((optimizedIndex: number) => stopInfo[optimizedIndex]);
                            if (optimizedStops.length > 0) {
                                updateData({
                                    waypoints: optimizedStops.map((info: any) => info.name),
                                    distanceKm: distKm,
                                    etaTime: timeStr,
                                    calculatingRoute: false
                                });
                                const newWpCoords = optimizedStops.map((info: any) => info.coord);
                                if (JSON.stringify(newWpCoords) !== JSON.stringify(waypointCoords)) {
                                    setWaypointCoords(newWpCoords);
                                }
                                if (dropoffCoords) setDropoffCoords(null);
                                return;
                            }
                        }
                        updateData({ distanceKm: distKm, etaTime: timeStr, calculatingRoute: false });
                    } else {
                        updateData({ calculatingRoute: false });
                    }
                } catch (e) {
                    updateData({ calculatingRoute: false });
                }
            } else {
                setRoutePolyline(null);
                updateData({ distanceKm: 0, etaTime: '' });
                if (pickupCoords) fitBounds([pickupCoords]);
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

    // Enterprise Pricing Check
    const finalPrice = data.price || currentQuote;

    const submitBooking = () => {
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
            id: `ORD-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
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
            price: finalPrice,
            driverRate: Math.max(100, finalPrice * 0.8),
            status: 'pending',
            estimatedDuration: '45 mins',
            date: new Date().toISOString(),
            sender: { name: 'Customer', phone: '' },
            recipient: { name: data.receiverName || 'Receiver', phone: data.receiverPhone || '' },
            paymentMethod: data.paymentMethod || 'MPESA',
            verificationCode: dropoffCode,
            serviceType: data.serviceType || 'Standard (Same Day)',
            quoteId: data.quoteId || null,
            helpersCount: data.helpersCount || 0,
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

        if (onOrderComplete) onOrderComplete(newOrder);
        else console.log('Final Payload:', newOrder);
    };

    return (
        <div className="fixed bottom-0 inset-x-0 pointer-events-none z-[100] flex flex-col justify-end mx-auto max-w-lg">
            <motion.div
                layout
                className={`w-full bg-white shadow-[0_-15px_40px_rgba(0,0,0,0.12)] rounded-t-[2.5rem] overflow-hidden pointer-events-auto border-t border-gray-100 flex flex-col pb-[env(safe-area-inset-bottom,0)] pb-1 transition-all duration-300 ${data.isSearchingText ? 'h-[90vh]' : 'max-h-[90vh]'}`}
                transition={{ duration: 0.3, type: 'tween', ease: 'easeOut' }}
            >
                <div className="px-5 pt-3 pb-2 flex flex-col items-center w-full z-10 bg-white flex-shrink-0">
                    <div className="w-12 h-1 bg-gray-200 rounded-full mb-3" />
                    <div className="w-full flex justify-between mt-1 items-end">
                        {(() => {
                            const STEP_INFO = [
                                { title: 'Route', icon: Navigation },
                                { title: 'Cargo Type', icon: Box },
                                { title: 'Package Details', icon: Box }, // Reuse Box or find Package icon
                                { title: 'Choose Vehicle', icon: Truck },
                                { title: 'Receiver Details', icon: User },
                                { title: 'Payment Option', icon: Banknote }
                            ];
                            const ActiveStepIcon = STEP_INFO[step].icon;
                            return (
                                <span className="flex items-center gap-1.5 text-[10px] font-black text-brand-600 uppercase tracking-widest bg-brand-50/50 px-2 py-1 rounded-md mb-2 mt-[-4px]">
                                    <ActiveStepIcon size={12} strokeWidth={3} /> {step === 0 ? (data.activeTab === "pickup" ? "Pickup Point" : (data.waypoints.length > 0 ? "Drop offs" : "Drop off")) : STEP_INFO[step].title} ({step + 1}/6)
                                </span>
                            );
                        })()}
                        <div className="flex flex-col items-end gap-1.5 mt-[-4px]">
                            <AnimatePresence>
                                {step >= 3 && (data.distanceKm > 0 || data.calculatingRoute) && (
                                    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }} className="flex items-center gap-2 bg-white px-2 py-0.5 rounded-lg border border-brand-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] mb-1">
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
                                                <span className="text-[11px] font-black text-gray-900 leading-none ml-1">KES {finalPrice.toLocaleString()}</span>
                                            </>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            <div className="flex space-x-1.5 opacity-80">
                                {[0, 1, 2, 3, 4, 5].map(i => <motion.div layout key={i} className={`h-1.5 rounded-full ${i === step ? 'w-5 bg-brand-600' : 'w-1.5 bg-gray-200'}`} />)}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="relative px-5 pb-1 w-full flex-1 overflow-y-auto no-scrollbar" style={{ paddingBottom: "0.25rem" }}>
                    <AnimatePresence mode="popLayout" custom={direction} initial={false}>
                        <motion.div key={step} custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ type: 'spring', stiffness: 500, damping: 40 }} className="w-full h-full">
                            {step === 0 && <Step1Where />}
                            {step === 1 && <Step2What />}
                            {step === 2 && <Step2_5PackageDetails />}
                            {step === 3 && <Step3How />}
                            {step === 4 && <Step4Who />}
                            {step === 5 && <Step5Payment submit={submitBooking} />}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
};

export default function BookingWizardModular(props: BookingWizardProps) {
    return (
        <BookingProvider>
            <WizardContent {...props} />
        </BookingProvider>
    );
}
