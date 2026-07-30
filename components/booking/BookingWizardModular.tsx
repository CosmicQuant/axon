import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { mapService } from '../../services/mapService';
import { useMapState } from '@/context/MapContext';
import { storageService } from '../../services/storageService';
import { BookingProvider, useBooking } from './BookingContext';
import { VEHICLES } from './constants';

import { Step1Where } from './steps/Step1Where';
import { Step0Dashboard } from './steps/Step0Dashboard';
import { Step2What } from './steps/Step2What';
import { Step3How } from './steps/Step3How';
import { Step4Who } from './steps/Step4Who';
import { Step5Payment } from './steps/Step5Payment';
import { useAuth } from '../../context/AuthContext';
import { generateSecureCode } from '../../utils/crypto';

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
    savedBookingData?: any;
    savedStep?: number;
}

const WizardContent: React.FC<BookingWizardProps> = ({ prefillData, onOrderComplete, onCollapseChange, startAtDashboard }) => {
    const { data, updateData, step, direction, nextStep } = useBooking();
    const { user } = useAuth();
    const { pickupCoords, dropoffCoords, waypointCoords, routePolyline, setRoutePolyline, setIsMapSelecting, setActiveInput, setPickupCoords, setWaypointCoords, setDropoffCoords, userLocation, requestUserLocation, ensureFreshLocation, isMapSelecting, activeInput, mapCenter, setMapCenter, fitBounds, setBottomSheetHeight, setOrderState } = useMapState();

    // Guard: skip mapCenter watcher until initial location is settled
    const initialSettled = useRef(false);

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

    // Effect 1: Apply prefill data on mount
    useEffect(() => {
        if (prefillData) {
            const updates: any = {};
            if (prefillData.pickup) updates.pickup = prefillData.pickup;
            if (prefillData.dropoff) updates.dropoff = prefillData.dropoff;
            if (prefillData.serviceType) {
                // Normalise to the BookingContext enum ('Standard' | 'Express').
                // Callers may pass the types.ts enum ('Standard (Same Day)' /
                // 'Express Instant') or free text — match by keyword so the
                // Standard quick-action on CustomerHome/Hero pre-selects correctly
                // instead of leaving the user to re-pick Express/Standard.
                const st = String(prefillData.serviceType).toLowerCase();
                updates.serviceType = st.includes('express') ? 'Express' : 'Standard';
                updates.serviceTypeLocked = prefillData.serviceTypeLocked === true;
            }
            if (prefillData.vehicle) {
                updates.vehicle = prefillData.vehicle;
                updates.vehicleLocked = prefillData.vehicleLocked === true;
            }
            if (prefillData.activeTab) updates.activeTab = prefillData.activeTab;
            if (prefillData.category) updates.category = prefillData.category;
            if (prefillData.subCategory) {
                // Preselecting a bulk subcategory (e.g. the cold-chain reefer
                // quick-action) implies category 'B' so Step2 shows the right
                // grid and the cargo preselect isn't dropped.
                updates.subCategory = prefillData.subCategory;
                updates.category = 'B';
            }
            if (Object.keys(updates).length > 0) updateData(updates);

            if (prefillData.pickupCoords) setPickupCoords(prefillData.pickupCoords);
            if (prefillData.dropoffCoords) setDropoffCoords(prefillData.dropoffCoords);

            if (prefillData.pickupCoords && prefillData.dropoffCoords) {
                fitBounds([prefillData.pickupCoords, prefillData.dropoffCoords]);
            } else if (prefillData.pickupCoords) {
                fitBounds([prefillData.pickupCoords]);
            }

            // When BOTH pickup and dropoff are fully prefilled, settle immediately
            // and do NOT enable map pin selecting — route should auto-calculate
            if (prefillData.pickupCoords && prefillData.dropoffCoords && prefillData.pickup) {
                initialSettled.current = true;
                // Explicitly disable map pin to avoid showing the draggable pin
                setIsMapSelecting(false);
            } else if (prefillData.pickup && !prefillData.pickupCoords && (prefillData.dropoff || prefillData.dropoffCoords)) {
                // Pickup text set but coords missing, dropoff IS set (e.g. search bar with GPS failure)
                // Auto-locate pickup coords in background WITHOUT showing map pin
                initialSettled.current = true;
                setIsMapSelecting(false);
                ensureFreshLocation().then(loc => {
                    if (loc) {
                        setPickupCoords(loc);
                        mapService.reverseGeocode(loc.lat, loc.lng).then(address => {
                            if (address) updateData({ pickup: address });
                        }).catch(() => { });
                        if (prefillData.dropoffCoords) {
                            fitBounds([loc, prefillData.dropoffCoords]);
                        }
                    }
                }).catch(() => { });
            } else if (prefillData.pickup || prefillData.pickupCoords) {
                setTimeout(() => {
                    initialSettled.current = true;
                    // Only enable map pin dragging when dropoff is NOT set
                    if (!prefillData.dropoff && !prefillData.dropoffCoords) {
                        setActiveInput('pickup');
                        setIsMapSelecting(true);
                    }
                }, 1500);
            }
        }
    }, []);

    // Effect 2: Auto-locate when no pickup was prefilled — uses warm-start cache with retry
    useEffect(() => {
        if (prefillData?.pickup || prefillData?.pickupCoords) return;

        let cancelled = false;

        const applyLocation = (loc: { lat: number; lng: number }) => {
            if (cancelled) return;
            setPickupCoords(loc);
            setActiveInput('pickup');
            setMapCenter(loc.lat, loc.lng);
            fitBounds([loc]);
            updateData({ pickup: 'Locating...' });
            mapService.reverseGeocode(loc.lat, loc.lng).then(address => {
                if (cancelled) return;
                if (address) updateData({ pickup: address });
                else updateData({ pickup: 'Current Location' });
            }).catch(console.error);
            setTimeout(() => {
                if (!cancelled) {
                    initialSettled.current = true;
                    setIsMapSelecting(true);
                }
            }, 1500);
        };

        const tryLocate = async (attempt: number) => {
            if (cancelled) return;
            try {
                // Use ensureFreshLocation for instant cache + background GPS refresh
                const loc = await ensureFreshLocation();
                if (loc && !cancelled && !pickupCoords && !isMapSelecting) {
                    applyLocation(loc);
                } else if (!loc && attempt < 2 && !cancelled) {
                    // Location may still be enabling — retry after delay
                    setTimeout(() => tryLocate(attempt + 1), 3000);
                } else if (!cancelled) {
                    initialSettled.current = true;
                }
            } catch {
                if (attempt < 2 && !cancelled) {
                    setTimeout(() => tryLocate(attempt + 1), 3000);
                } else if (!cancelled) {
                    initialSettled.current = true;
                }
            }
        };

        tryLocate(0);

        return () => { cancelled = true; };
    }, []);

    // Effect 3: Reverse-geocode when user drags the map pin (NOT during initial settle)
    useEffect(() => {
        if (!initialSettled.current) return;
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

    const weightVal = parseFloat(data.dimensions.weight) || 0;
    const eligibleVehicles = VEHICLES.filter(v => {
        if (data.distanceKm > v.constraints.maxDist) return false;
        if (!v.constraints.allowedCats.includes(data.category)) return false;
        if (data.category === 'A' && weightVal > v.constraints.maxWeight) return false;
        return true;
    });
    const activeVehicle = VEHICLES.find(v => v.id === data.vehicle) || eligibleVehicles[0];

    // Server-only pricing — no client-side fallback
    const finalPrice = data.price || 0;

    const submitBooking = async () => {
        if (!finalPrice) return; // Block submit until server quote received
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

        const generateCode = () => generateSecureCode(6);
        const dropoffCode = generateCode();

        // Upload item image to Storage if present (instead of base64 in Firestore)
        let itemImageUrl: string | undefined;
        if (data.itemImage && data.itemImage.startsWith('data:')) {
            try {
                const response = await fetch(data.itemImage);
                const blob = await response.blob();
                itemImageUrl = await storageService.uploadFile(blob, `items/${Date.now()}.jpg`);
            } catch (e) {
                console.error('Item image upload failed:', e);
            }
        }

        // Determine if intercity (longer expiry for intercity orders)
        const isIntercity = pickupCoords && dropoffCoords &&
            Math.abs(pickupCoords.lat - (finalDropoffCoords?.lat || 0)) > 0.5;
        const expiryMinutes = isIntercity ? 30 : 15;
        const expiresAt = new Date(Date.now() + expiryMinutes * 60000);

        const newOrder = {
            id: `ORD-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
            pickup: data.pickup,
            dropoff: finalDropoffAddress,
            pickupCoords: pickupCoords || { lat: 0, lng: 0 },
            dropoffCoords: finalDropoffCoords || { lat: 0, lng: 0 },
            pickupTime: data.isScheduled ? data.pickupTime : 'ASAP',
            vehicle: data.vehicle || activeVehicle?.id || 'boda',
            items: {
                itemDesc: `${data.category} - ${data.subCategory}`,
                category: data.category as any,
                subCategory: data.subCategory,
                weightKg: parseInt(data.dimensions.weight) || 1,
                fragile: data.isFragile || false,
                value: data.itemValue || 0
            },
            price: finalPrice,
            driverRate: data.driverRate || Math.max(100, Math.round(finalPrice * 0.8)),
            // Distance in meters — used by updateOrderStatus CF to increment
            // the driver's totalDistanceMeters on delivery. Source: quote distanceKm.
            distance: Math.round((data.distanceKm || 0) * 1000),
            distanceKm: Number((data.distanceKm || 0).toFixed(1)),
            durationMinutes: data.etaTime ? undefined : Math.round((data.distanceKm || 0) / 35 * 60),
            status: 'pending',
            estimatedDuration: '45 mins',
            date: new Date().toISOString(),
            sender: { name: user?.name || user?.email || 'Customer', phone: user?.phone || '' },
            recipient: { name: data.receiverName || 'Receiver', phone: data.receiverPhone || '', id: data.receiverId || '' },
            paymentMethod: data.paymentMethod || 'MPESA',
            verificationCode: dropoffCode,
            serviceType: data.serviceType || 'Standard (Same Day)',
            quoteId: data.quoteId || null,
            helpersCount: data.helpersCount || 0,
            routeGeometry: routePolyline || null,
            expiresAt: expiresAt.toISOString(),
            editHistory: [],
            itemImage: itemImageUrl,
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
                className={`w-full bg-white shadow-[0_-15px_40px_rgba(0,0,0,0.12)] md:shadow-2xl rounded-t-[2.5rem] md:rounded-2xl overflow-hidden pointer-events-auto border-t border-gray-100 md:border flex flex-col pb-[env(safe-area-inset-bottom,0)] pb-1 ${data.isSearchingText ? 'h-[90vh]' : 'max-h-[90vh] md:max-h-[calc(100vh-2rem)]'}`}
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
                            {[0, 1, 2, 3, 4].map(i => <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-5 bg-brand-600' : 'w-1.5 bg-gray-200'}`} />)}
                        </div>
                    </div>
                </div>

                <div className="relative px-5 pb-1 w-full flex-1 overflow-y-auto no-scrollbar" style={{ paddingBottom: "0.25rem" }}>
                    <AnimatePresence mode="wait" custom={direction} initial={false}>
                        <motion.div key={step} custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ type: 'tween', duration: 0.25, ease: 'easeInOut' }} className="w-full h-full">
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
        <BookingProvider initialStep={props.savedStep} initialData={props.savedBookingData}>
            <WizardContent {...props} />
        </BookingProvider>
    );
}
