import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { mapService } from '../../services/mapService';
import { useMapState } from '@/context/MapContext';
import { BookingProvider, useBooking } from './BookingContext';
import { VEHICLES } from './constants';

import { Step1Where } from './steps/Step1Where';
import { Step0Dashboard } from './steps/Step0Dashboard';
import { Step2What } from './steps/Step2What';
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
    startAtDashboard?: boolean;
}

const WizardContent: React.FC<BookingWizardProps> = ({ prefillData, onOrderComplete, onCollapseChange, startAtDashboard }) => {
    const { data, updateData, step, direction } = useBooking();
    const { pickupCoords, dropoffCoords, waypointCoords, setRoutePolyline, setIsMapSelecting, setActiveInput, setPickupCoords, setWaypointCoords, setDropoffCoords, userLocation, requestUserLocation, isMapSelecting, activeInput, mapCenter, setMapCenter, fitBounds, setBottomSheetHeight, setOrderState } = useMapState();

    // Only allow map marker dragging on route-editing step (Step 0)
    useEffect(() => {
        if (step === 0) {
            setOrderState('DRAFTING');
        } else {
            // Disable map marker interactions on non-route steps
            setOrderState('MATCHING');
            if (isMapSelecting) setIsMapSelecting(false);
        }
    }, [step]);

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
                // Set initial location and enable map selection mode immediately
                setIsMapSelecting(true);
                setActiveInput('pickup');
                setMapCenter(loc.lat, loc.lng);
                fitBounds([loc]);
                updateData({ pickup: 'Locating...' });
                mapService.reverseGeocode(loc.lat, loc.lng).then(address => {
                    if (address) updateData({ pickup: address });
                    else updateData({ pickup: 'Current Location' });
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
                                const hasDropoff = stopInfo.some((s: any) => s.type === 'dropoff');

                                if (hasDropoff) {
                                    // Last stop in optimized order becomes the dropoff, rest are waypoints
                                    const newWaypoints = optimizedStops.slice(0, -1);
                                    const newDropoff = optimizedStops[optimizedStops.length - 1];

                                    updateData({
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
                                } else {
                                    // No dropoff set — just reorder waypoints, don't promote any to dropoff
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
                                }
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

    // Invalidate cached price when route changes (so price recalculates)
    const prevCoordsRef = useRef<string>('');
    useEffect(() => {
        const coordsKey = JSON.stringify({ p: pickupCoords, w: waypointCoords, d: dropoffCoords });
        if (prevCoordsRef.current && prevCoordsRef.current !== coordsKey && data.price > 0) {
            // Route changed after price was set — clear stale price to force re-quote
            updateData({ price: 0, quoteId: null });
        }
        prevCoordsRef.current = coordsKey;
    }, [pickupCoords, waypointCoords, dropoffCoords]);

    // Re-fit map on final step so route is visible above the sheet
    useEffect(() => {
        if (step === 4 && pickupCoords && dropoffCoords) {
            const pts = [pickupCoords, ...waypointCoords, dropoffCoords];
            setTimeout(() => fitBounds(pts), 350);
        }
    }, [step]);

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
            recipient: { name: data.receiverName || 'Receiver', phone: data.receiverPhone || '', id: data.receiverId || '' },
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

    const bottomSheetRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!bottomSheetRef.current || !setBottomSheetHeight) return;
        const observer = new ResizeObserver((entries) => {
            const height = entries[0]?.borderBoxSize?.[0]?.blockSize ?? entries[0]?.contentRect.height;
            // Native platform offset padding + actual height
            if (height) setBottomSheetHeight(height + 10);
        });
        observer.observe(bottomSheetRef.current);
        return () => observer.disconnect();
    }, [step, data.isSearchingText, setBottomSheetHeight]);

    return (
        <div className="fixed bottom-0 inset-x-0 md:inset-x-auto md:right-4 md:top-4 md:bottom-4 md:w-[400px] pointer-events-none z-[100] flex flex-col justify-end mx-auto max-w-lg md:max-w-none md:mx-0">
            <motion.div
                ref={bottomSheetRef}
                layout
                className={`w-full bg-white shadow-[0_-15px_40px_rgba(0,0,0,0.12)] md:shadow-2xl rounded-t-[2.5rem] md:rounded-2xl overflow-hidden pointer-events-auto border-t border-gray-100 md:border flex flex-col pb-[env(safe-area-inset-bottom,0)] pb-1 transition-all duration-300 ${data.isSearchingText ? 'h-[90vh]' : 'max-h-[90vh] md:max-h-[calc(100vh-2rem)]'}`}
                transition={{ duration: 0.3, type: 'tween', ease: 'easeOut' }}
            >
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
                                            {data.price > 0 && (<>
                                                <span className="w-1 h-1 rounded-full bg-gray-300" />
                                                <span className="text-gray-900">KES {data.price.toLocaleString()}</span>
                                            </>)}
                                        </>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                        <div className="flex space-x-1.5 ml-auto">
                            {[0, 1, 2, 3, 4].map(i => <motion.div layout key={i} className={`h-1.5 rounded-full ${i === step ? 'w-5 bg-brand-600' : 'w-1.5 bg-gray-200'}`} />)}
                        </div>
                    </div>
                </div>

                <div className="relative px-5 pb-1 w-full flex-1 overflow-y-auto no-scrollbar" style={{ paddingBottom: "0.25rem" }}>
                    <AnimatePresence mode="popLayout" custom={direction} initial={false}>
                        <motion.div key={step} custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ type: 'spring', stiffness: 500, damping: 40 }} className="w-full h-full">
                            {step === -1 && <Step0Dashboard />}
                            {step === 0 && <Step1Where />}
                            {step === 1 && <Step2What />}
                            {step === 2 && <Step3How />}
                            {step === 3 && <Step4Who />}
                            {step === 4 && <Step5Payment submit={submitBooking} />}
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
