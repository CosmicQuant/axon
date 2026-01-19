
import React, { useState, useEffect, useRef } from 'react';
import type { AIAnalysisResult, DeliveryOrder, PaymentMethod } from '../types';
import { VehicleType, ServiceType } from '../types';
import { analyzeDeliveryRequest } from '../services/geminiService';
import { orderService } from '../services/orderService';
import { paymentService } from '../services/paymentService';
import { mapService } from '../services/mapService';
import { useAuth } from '../context/AuthContext';
import { usePrompt } from '../context/PromptContext';
import { BookingSchema } from '../schemas';
import { useMapState } from '@/context/MapContext';
import { MapPin, Box, Truck, CreditCard, Info, User, Phone, Wallet, Check, ChevronLeft, ChevronRight, Banknote, Clock, Calendar, AlertTriangle, DollarSign, Bike, Car, Smartphone, GripVertical, Navigation, Map, ArrowRight, ChevronUp, Edit2, Home, Building2 as Building, Zap, Rocket, Shield, Plus, X, List, Scale } from 'lucide-react';

interface BookingFormProps {
    prefillData?: any;
    onOrderComplete: (order: DeliveryOrder) => void;
    onCollapseChange?: (isCollapsed: boolean) => void;
    onRequireAuth?: (title?: string, desc?: string) => void;
}

const BookingForm: React.FC<BookingFormProps> = ({ prefillData, onOrderComplete, onCollapseChange, onRequireAuth }) => {
    const { user } = useAuth();
    const { showAlert } = usePrompt();
    const {
        isLoaded,
        orderState, setOrderState,
        mapCenter, isPanning,
        pickupCoords, setPickupCoords,
        dropoffCoords, setDropoffCoords,
        fitBounds, requestUserLocation,
        userLocation, setRoutePolyline,
        isMapSelecting, setIsMapSelecting,
        setMapCenter, activeInput, setActiveInput,
        setAllowMarkerClick, waypointCoords, setWaypointCoords,
        setDriverVehicleType
    } = useMapState();

    const [step, setStep] = useState(() => {
        if (prefillData?.recipient?.name && prefillData?.pickup && prefillData?.dropoff) return 3;
        return 1;
    });
    const [loading, setLoading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const dragStartY = useRef<number | null>(null);
    const vehicleScrollRef = useRef<HTMLDivElement>(null);
    const quickDestScrollRef = useRef<HTMLDivElement>(null);
    const formContainerRef = useRef<HTMLDivElement>(null);
    const formBottomRef = useRef<HTMLDivElement>(null);


    // Sync onCollapseChange
    useEffect(() => {
        if (onCollapseChange) onCollapseChange(isCollapsed);
    }, [isCollapsed, onCollapseChange]);

    // Auto-scroll to bottom for reorders
    useEffect(() => {
        // If we have pickup and dropoff, and we're not collapsed, scroll to bottom
        // This is especially useful for reorders where everything is prepopulated
        // We only want this behavior for explicit reorders, not general prefilling
        if (prefillData?.isReorder && prefillData?.pickup && prefillData?.dropoff && !isCollapsed) {
            const scrollToBottom = () => {
                if (formContainerRef.current) {
                    const container = formContainerRef.current;
                    // Force scroll to the absolute bottom
                    container.scrollTop = container.scrollHeight;
                }
            };

            // Execute immediately
            scrollToBottom();

            // And repeatedly for the next second to catch any layout shifts/animations
            const interval = setInterval(scrollToBottom, 100);

            // Stop after 1.5 seconds
            const timeout = setTimeout(() => {
                clearInterval(interval);
            }, 1500);

            return () => {
                clearInterval(interval);
                clearTimeout(timeout);
            };
        }
    }, [prefillData, isCollapsed]);

    // Enable marker clicking for Booking
    useEffect(() => {
        setAllowMarkerClick(true);
        return () => setAllowMarkerClick(false);
    }, [setAllowMarkerClick]);

    // Step 1: Route & Item & Time
    const [pickup, setPickup] = useState(prefillData?.pickup || '');
    const [dropoff, setDropoff] = useState(prefillData?.dropoff || '');

    const [itemDesc, setItemDesc] = useState(prefillData?.items?.description || prefillData?.itemDescription || '');
    const [itemImage, setItemImage] = useState<string | null>(prefillData?.itemImage || null);
    const [isScheduled, setIsScheduled] = useState(!!prefillData?.pickupTime && prefillData?.pickupTime !== 'ASAP');
    const [pickupTime, setPickupTime] = useState(prefillData?.pickupTime || '');

    // Suggestions State
    const [pickupSuggestions, setPickupSuggestions] = useState<Array<{ label: string, lat: number, lng: number }>>([]);
    const [dropoffSuggestions, setDropoffSuggestions] = useState<Array<{ label: string, lat: number, lng: number }>>([]);
    const [showPickupSuggestions, setShowPickupSuggestions] = useState(false);
    const [showDropoffSuggestions, setShowDropoffSuggestions] = useState(false);

    // New Fields
    const [isFragile, setIsFragile] = useState(prefillData?.items?.fragile || false);
    const [handlingNotes, setHandlingNotes] = useState(prefillData?.items?.handlingNotes || '');
    const [itemWeight, setItemWeight] = useState(prefillData?.items?.weightKg?.toString() || '');
    const [orderValue, setOrderValue] = useState(prefillData?.items?.value?.toString() || '');
    const [serviceType, setServiceType] = useState<ServiceType>(prefillData?.serviceType || ServiceType.EXPRESS);
    const [waypoints, setWaypoints] = useState<Array<{
        id: string,
        address: string,
        coords: { lat: number, lng: number } | null,
        recipientName?: string,
        recipientPhone?: string,
        instructions?: string
    }>>(
        prefillData?.stops?.filter((s: any) => s.type === 'waypoint').map((s: any) => ({
            id: s.id,
            address: s.address,
            coords: { lat: s.lat, lng: s.lng },
            recipientName: s.recipient?.name || '',
            recipientPhone: s.recipient?.phone || '',
            instructions: s.instructions || ''
        })) || []
    );
    const [activeWaypointIndex, setActiveWaypointIndex] = useState<number | null>(null);

    // Step 2: Vehicle
    const [selectedVehicle, setSelectedVehicle] = useState<VehicleType>(prefillData?.vehicle || VehicleType.BODA);
    const [tonnage, setTonnage] = useState<string>(''); // New Tonnage State
    const [aiResult, setAiResult] = useState<AIAnalysisResult | null>(null);

    // Sync selected vehicle to map state
    useEffect(() => {
        setDriverVehicleType(selectedVehicle);
    }, [selectedVehicle, setDriverVehicleType]);

    // Price State
    const [priceQuote, setPriceQuote] = useState<number>(prefillData?.price || 0);
    const [calculatingPrice, setCalculatingPrice] = useState(false);
    const [distance, setDistance] = useState<number>(0);
    const [estArrival, setEstArrival] = useState<{ arrivalTime: string, arrivalDate: string } | null>(null);

    // Payment State
    const [paymentStatus, setPaymentStatus] = useState<'IDLE' | 'PROCESSING' | 'WAITING_FOR_PIN' | 'COMPLETED' | 'FAILED'>('IDLE');
    const [senderPhone, setSenderPhone] = useState(prefillData?.sender?.phone || user?.phone || '');
    const [senderName, setSenderName] = useState(prefillData?.sender?.name || user?.name || '');
    const [senderId, setSenderId] = useState(prefillData?.sender?.idNumber || user?.idNumber || '');
    const [recipientName, setRecipientName] = useState(prefillData?.recipient?.name || '');
    const [recipientPhone, setRecipientPhone] = useState(prefillData?.recipient?.phone || '');
    const [recipientId, setRecipientId] = useState(prefillData?.recipient?.idNumber || '');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(prefillData?.paymentMethod || 'MPESA');
    const [mpesaNumber, setMpesaNumber] = useState(prefillData?.sender?.phone || user?.phone || '');

    // History-based Quick Destinations
    const [historyDestinations, setHistoryDestinations] = useState<string[]>([]);
    const [historyItems, setHistoryItems] = useState<string[]>(['Documents', 'Electronics', 'Food/Groceries', 'Medicine', '50ft Container', 'Gunia (Sacks)']);
    const [savedContacts, setSavedContacts] = useState<{ name: string; phone: string; id: string }[]>([]);

    useEffect(() => {
        const fetchHistory = async () => {
            if (user) {
                try {
                    const orders = await orderService.getUserOrders(user.id);

                    // Destinations
                    const uniqueDest = Array.from(new Set(orders.map(o => o.dropoff))).slice(0, 4);
                    setHistoryDestinations(uniqueDest);

                    // Items
                    const itemCounts: Record<string, number> = {};
                    orders.forEach(o => {
                        const desc = o.items?.description;
                        if (desc) {
                            // Split by comma to handle multiple items if user typed "Box, Clothes"
                            const parts = desc.split(',').map(s => s.trim()).filter(s => s.length > 0);
                            parts.forEach(p => {
                                // Capitalize first letter for consistency
                                const normalized = p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
                                itemCounts[normalized] = (itemCounts[normalized] || 0) + 1;
                            });
                        }
                    });

                    const sortedItems = Object.entries(itemCounts)
                        .sort(([, a], [, b]) => b - a)
                        .map(([item]) => item);

                    const defaults = ['Documents', 'Medicine', 'Food/Groceries', '50ft Container', 'Electronics', 'Construction Materials', 'Home Moving', '20 90kg Sacks'];
                    const finalItems = Array.from(new Set([...sortedItems, ...defaults])).slice(0, 5);
                    setHistoryItems(finalItems);

                    // Recipients
                    const recipientsMap: Record<string, { name: string; phone: string; id: string }> = {};
                    orders.forEach(o => {
                        if (o.recipient?.phone && o.recipient?.name) {
                            recipientsMap[o.recipient.phone] = {
                                name: o.recipient.name,
                                phone: o.recipient.phone,
                                id: o.recipient.idNumber || ''
                            };
                        }
                    });
                    const uniqueRecipients = Object.values(recipientsMap).slice(0, 3);
                    setSavedContacts(uniqueRecipients);

                } catch (e) {
                    console.error("Error fetching history for quick taps:", e);
                }
            }
        };
        fetchHistory();
    }, [user]);

    // Restore Map State from Prefill
    useEffect(() => {
        if (!prefillData) return;

        if (prefillData.pickup) setPickup(prefillData.pickup);
        if (prefillData.dropoff) setDropoff(prefillData.dropoff);
        if (prefillData.items?.description || prefillData.itemDescription) {
            setItemDesc(prefillData.items?.description || prefillData.itemDescription);
        }
        if (prefillData.items?.weightKg) setItemWeight(prefillData.items.weightKg.toString());
        if (prefillData.items?.value) setOrderValue(prefillData.items.value.toString());
        if (prefillData.items?.fragile !== undefined) setIsFragile(prefillData.items.fragile);
        if (prefillData.items?.handlingNotes) setHandlingNotes(prefillData.items.handlingNotes);
        if (prefillData.vehicle) setSelectedVehicle(prefillData.vehicle);
        if (prefillData.serviceType) setServiceType(prefillData.serviceType);
        if (prefillData.paymentMethod) setPaymentMethod(prefillData.paymentMethod);
        if (prefillData.recipient?.name) setRecipientName(prefillData.recipient.name);
        if (prefillData.recipient?.phone) setRecipientPhone(prefillData.recipient.phone);
        if (prefillData.recipient?.idNumber) setRecipientId(prefillData.recipient.idNumber);
        if (prefillData.sender?.name) setSenderName(prefillData.sender.name);
        if (prefillData.sender?.phone) setSenderPhone(prefillData.sender.phone);
        if (prefillData.sender?.idNumber) setSenderId(prefillData.sender.idNumber);
        if (prefillData.pickupTime) {
            setPickupTime(prefillData.pickupTime);
            setIsScheduled(prefillData.pickupTime !== 'ASAP');
        }
        if (prefillData.itemImage) setItemImage(prefillData.itemImage);

        if (prefillData.pickupCoords) {
            setPickupCoords(prefillData.pickupCoords);
        }
        if (prefillData.dropoffCoords) {
            setDropoffCoords(prefillData.dropoffCoords);
        }
        if (prefillData.stops) {
            const waypointCoords = prefillData.stops
                .filter((s: any) => s.type === 'waypoint')
                .map((s: any) => ({ lat: s.lat, lng: s.lng }));
            setWaypointCoords(waypointCoords);

            const waypointList = prefillData.stops
                .filter((s: any) => s.type === 'waypoint')
                .map((s: any) => ({
                    id: s.id,
                    address: s.address,
                    coords: { lat: s.lat, lng: s.lng }
                }));
            setWaypoints(waypointList);
        }
        // Expand drawer if we have any prefill data (e.g. from Hero search)
        if (prefillData.pickup || prefillData.itemDescription || prefillData.dropoff) {
            setIsCollapsed(false);
        }
        // If we have both pickup and dropoff, we should probably show the vehicle selection step
        if (prefillData.pickup && prefillData.dropoff) {
            if (prefillData.recipient?.name || prefillData.paymentMethod) {
                setStep(3);
            } else {
                setStep(2);
            }
        }
    }, [prefillData, setPickupCoords, setDropoffCoords, setWaypointCoords]);

    // Effect to calculate estimated arrival
    useEffect(() => {
        if (distance > 0) {
            const estimation = orderService.estimateDeliveryTime(distance, serviceType, isScheduled ? pickupTime : 'ASAP');
            setEstArrival(estimation);
        } else {
            setEstArrival(null);
        }
    }, [distance, serviceType, pickupTime, isScheduled]);

    // Update sender details when user logs in (e.g. after auth prompt)
    useEffect(() => {
        if (user) {
            if (!senderName && user.name) setSenderName(user.name);
            if (!senderPhone && user.phone) setSenderPhone(user.phone);
            // Also update M-PESA number if empty
            if (!mpesaNumber && user.phone) setMpesaNumber(user.phone);
        }
    }, [user]);

    // Desktop Scroll & Drag Handler
    useEffect(() => {
        const setupDragScroll = (ref: React.RefObject<HTMLDivElement>) => {
            const el = ref.current;
            if (!el) return;

            let isDown = false;
            let startX: number;
            let scrollLeft: number;
            let hasMoved = false;

            const onWheel = (e: WheelEvent) => {
                if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                    e.preventDefault();
                    el.scrollLeft += e.deltaY;
                }
            };

            const onMouseDown = (e: MouseEvent) => {
                isDown = true;
                el.classList.add('cursor-grabbing');
                el.classList.remove('cursor-grab');
                startX = e.pageX - el.offsetLeft;
                scrollLeft = el.scrollLeft;
                hasMoved = false;
            };

            const onMouseLeave = () => {
                isDown = false;
                el.classList.remove('cursor-grabbing');
                el.classList.add('cursor-grab');
            };

            const onMouseUp = () => {
                isDown = false;
                el.classList.remove('cursor-grabbing');
                el.classList.add('cursor-grab');
            };

            const onMouseMove = (e: MouseEvent) => {
                if (!isDown) return;
                e.preventDefault();
                const x = e.pageX - el.offsetLeft;
                const walk = (x - startX) * 2; // scroll-fast
                if (Math.abs(walk) > 5) hasMoved = true;
                el.scrollLeft = scrollLeft - walk;
            };

            // Click interceptor to prevent selection if we're dragging
            const onClick = (e: MouseEvent) => {
                if (hasMoved) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            };

            el.addEventListener('wheel', onWheel, { passive: false });
            el.addEventListener('mousedown', onMouseDown);
            el.addEventListener('mouseleave', onMouseLeave);
            el.addEventListener('mouseup', onMouseUp);
            el.addEventListener('mousemove', onMouseMove);
            el.addEventListener('click', onClick, true); // Capture phase

            return () => {
                el.removeEventListener('wheel', onWheel);
                el.removeEventListener('mousedown', onMouseDown);
                el.removeEventListener('mouseleave', onMouseLeave);
                el.removeEventListener('mouseup', onMouseUp);
                el.removeEventListener('mousemove', onMouseMove);
                el.removeEventListener('click', onClick, true);
            };
        };

        const cleanupV = setupDragScroll(vehicleScrollRef);
        const cleanupQ = setupDragScroll(quickDestScrollRef);

        return () => {
            cleanupV?.();
            cleanupQ?.();
        };
    }, [pickupCoords, dropoffCoords, historyDestinations]);

    // Sync sender details if user logs in/changes
    useEffect(() => {
        if (user) {
            if (!senderName) setSenderName(user.name || '');
            if (!senderPhone) setSenderPhone(user.phone || '');
            if (!senderId) setSenderId(user.idNumber || '');
        }
    }, [user]);

    // Initial Location Setup - Only center map, don't auto-fill unless empty
    useEffect(() => {
        const initLocation = async () => {
            if (!isLoaded) return;

            let pCoords = null;
            let dCoords = null;

            if (prefillData?.pickupCoords) {
                pCoords = prefillData.pickupCoords;
                setPickupCoords(pCoords);
                if (prefillData.pickup) setPickup(prefillData.pickup);
                setMapCenter(pCoords.lat, pCoords.lng);
            } else if (prefillData?.pickup) {
                pCoords = await mapService.geocodeAddress(prefillData.pickup);
                if (pCoords) {
                    setPickupCoords(pCoords);
                    setPickup(prefillData.pickup);
                    setMapCenter(pCoords.lat, pCoords.lng);
                }
            } else {
                // Just request location to center map, don't fill input automatically
                const coords = await requestUserLocation();
                if (coords && !pickup) {
                    fitBounds([coords]);
                }
            }

            if (prefillData?.dropoffCoords) {
                dCoords = prefillData.dropoffCoords;
                setDropoffCoords(dCoords);
                if (prefillData.dropoff) setDropoff(prefillData.dropoff);
            } else if (prefillData?.dropoff) {
                dCoords = await mapService.geocodeAddress(prefillData.dropoff);
                if (dCoords) {
                    setDropoffCoords(dCoords);
                    setDropoff(prefillData.dropoff);
                }
            }

            if (pCoords && dCoords) {
                fitBounds([pCoords, dCoords]);
                const route = await mapService.getRoute(pCoords, dCoords);
                if (route) setRoutePolyline(route.geometry);
            } else if (pCoords) {
                fitBounds([pCoords]);
            } else if (dCoords) {
                fitBounds([dCoords]);
            }
        };
        initLocation();
    }, [isLoaded]);

    // Feature B: Reverse Geocoding on Map Idle (Only when explicitly selecting on map)
    useEffect(() => {
        if (!isPanning && activeInput && orderState === 'DRAFTING' && isMapSelecting && isLoaded) {
            const timer = setTimeout(async () => {
                // Check if map center has actually moved significantly from current coords to avoid loops
                let currentCoords = null;
                if (activeInput === 'pickup') currentCoords = pickupCoords;
                else if (activeInput === 'dropoff') currentCoords = dropoffCoords;
                else if (activeInput?.startsWith('waypoint-')) {
                    const idx = parseInt(activeInput.split('-')[1]);
                    currentCoords = waypoints[idx]?.coords;
                }

                if (currentCoords) {
                    const dist = Math.sqrt(Math.pow(mapCenter.lat - currentCoords.lat, 2) + Math.pow(mapCenter.lng - currentCoords.lng, 2));
                    if (dist < 0.00001) return; // Very small threshold
                }

                const address = await mapService.reverseGeocode(mapCenter.lat, mapCenter.lng);
                if (address) {
                    const newCoords = { lat: mapCenter.lat, lng: mapCenter.lng };
                    if (activeInput === 'pickup') {
                        setPickup(address);
                        setPickupCoords(newCoords);
                    } else if (activeInput === 'dropoff') {
                        setDropoff(address);
                        setDropoffCoords(newCoords);
                    } else if (activeInput?.startsWith('waypoint-')) {
                        const idx = parseInt(activeInput.split('-')[1]);
                        const newWaypoints = [...waypoints];
                        if (newWaypoints[idx]) {
                            newWaypoints[idx].address = address;
                            newWaypoints[idx].coords = newCoords;
                            setWaypoints(newWaypoints);
                        }
                    }
                }
            }, 500); // 500ms debounce
            return () => clearTimeout(timer);
        }
    }, [isPanning, activeInput, mapCenter, orderState, isMapSelecting, isLoaded]); // Removed pickupCoords/dropoffCoords from deps

    // Master Multi-Stop Routing Effect
    useEffect(() => {
        if (!isLoaded || isPanning) return;

        const updateRoute = async () => {
            // 1. Sync waypoint coordinates to Map Context for markers
            const validWaypointCoords = waypoints
                .map(wp => wp.coords)
                .filter((coords): coords is { lat: number, lng: number } => coords !== null);

            setWaypointCoords(validWaypointCoords);

            // 2. Calculate route if we have basic start/end
            if (pickupCoords && dropoffCoords) {
                setCalculatingPrice(true);
                try {
                    const route = await mapService.getRoute(
                        pickupCoords,
                        dropoffCoords,
                        validWaypointCoords
                    );

                    if (route) {
                        setRoutePolyline(route.geometry);
                        setDistance(route.distance);
                    }
                } catch (error) {
                    console.error("Routing error:", error);
                } finally {
                    setCalculatingPrice(false);
                }
            } else {
                setRoutePolyline(null);
                setDistance(0);
            }
        };

        const timer = setTimeout(updateRoute, 1000); // 1s debounce
        return () => clearTimeout(timer);
    }, [pickupCoords, dropoffCoords, waypoints, isLoaded, isPanning, setRoutePolyline, setWaypointCoords]);

    // Debounced Geocoding for typed addresses (Updates COORDS ONLY, doesn't overwrite text)
    useEffect(() => {
        if (isMapSelecting || isPanning || !isLoaded) return;

        const timer = setTimeout(async () => {
            if (activeInput === 'pickup' && pickup.length > 5) {
                const coords = await mapService.geocodeAddress(pickup);
                if (coords) setPickupCoords(coords);
            } else if (activeInput === 'dropoff' && dropoff.length > 5) {
                const coords = await mapService.geocodeAddress(dropoff);
                if (coords) setDropoffCoords(coords);
            }
        }, 1500);

        return () => clearTimeout(timer);
    }, [pickup, dropoff, activeInput, isMapSelecting, isPanning, setPickupCoords, setDropoffCoords, isLoaded]);

    // Effect to sync coordinate changes from Map Context (e.g. marker dragging) back to local waypoints
    useEffect(() => {
        if (orderState !== 'DRAFTING' || waypointCoords.length === 0) return;

        // Only update if marker drag happened (not if we are in map selection mode which is handled by syncAddresses)
        if (isMapSelecting) return;

        const syncBack = async () => {
            let changed = false;
            const newWaypoints = [...waypoints];

            for (let i = 0; i < waypointCoords.length; i++) {
                const ctxCoord = waypointCoords[i];
                const localWp = newWaypoints[i];

                if (localWp && (!localWp.coords || localWp.coords.lat !== ctxCoord.lat || localWp.coords.lng !== ctxCoord.lng)) {
                    const address = await mapService.reverseGeocode(ctxCoord.lat, ctxCoord.lng);
                    newWaypoints[i] = { ...localWp, coords: ctxCoord, address: address || localWp.address };
                    changed = true;
                }
            }

            if (changed) setWaypoints(newWaypoints);
        };

        const timer = setTimeout(syncBack, 500);
        return () => clearTimeout(timer);
    }, [waypointCoords, orderState, isMapSelecting]);

    const handleAnalyze = async () => {
        if (!pickup || !dropoff || !itemDesc) return;
        setAnalyzing(true);

        // Ensure we have coordinates (might need to geocode if typed manually)
        let pCoords = pickupCoords;
        let dCoords = dropoffCoords;

        if (!pCoords) pCoords = await mapService.geocodeAddress(pickup);
        if (!dCoords) dCoords = await mapService.geocodeAddress(dropoff);

        if (!pCoords || !dCoords) {
            setAnalyzing(false);
            showAlert('Location Error', 'We could not find one or both of the locations on the map. Please be more specific or select them directly on the map.', 'error');
            return;
        }

        setPickupCoords(pCoords);
        setDropoffCoords(dCoords);

        // Ensure distance is updated for price calculation (handled by master effect)

        const result = await analyzeDeliveryRequest(pickup, dropoff, itemDesc);
        setAnalyzing(false);

        if (result) {
            setAiResult(result);
            setSelectedVehicle(result.recommendedVehicle);
            fitBounds([pCoords, dCoords]);
        }
        setStep(2);
        setIsCollapsed(false); // Keep drawer expanded for Step 2
    };

    useEffect(() => {
        const fetchPrice = async () => {
            if (!pickupCoords || !dropoffCoords) return;
            if (distance > 0) {
                const p = await orderService.calculatePrice({
                    distance,
                    vehicleType: selectedVehicle,
                    serviceType,
                    stopCount: waypoints.length + 1 // + dropoff
                });
                setPriceQuote(p);
            }
        };
        fetchPrice();
    }, [selectedVehicle, distance, pickupCoords, dropoffCoords, serviceType, waypoints.length]);

    // Auto-select vehicle based on Item & Distance
    useEffect(() => {
        if (!itemDesc) return;

        const lowerDesc = itemDesc.toLowerCase();
        const distKm = distance / 1000; // distance is in meters

        let recommended = VehicleType.BODA;

        // 1. Heavy / Large / Construction / Cargo -> Lorry or Pickup
        if (
            lowerDesc.includes('cement') ||
            lowerDesc.includes('sand') ||
            lowerDesc.includes('ballast') ||
            lowerDesc.includes('construction') ||
            lowerDesc.includes('lorry') ||
            lowerDesc.includes('truck') ||
            lowerDesc.includes('tanks') ||
            lowerDesc.includes('timber') ||
            lowerDesc.includes('cargo') ||
            lowerDesc.includes('gunia') ||
            lowerDesc.includes('sack') ||
            lowerDesc.includes('heavy')
        ) {
            if (lowerDesc.includes('sack') && distKm < 50) {
                recommended = VehicleType.PICKUP;
            } else if (lowerDesc.includes('90kg') || lowerDesc.includes('ton')) {
                recommended = VehicleType.LORRY;
            } else {
                recommended = distKm > 100 ? VehicleType.LORRY : VehicleType.PICKUP;
            }
        }
        // 2. Furniture / Large Appliances -> Pickup or Van
        else if (
            lowerDesc.includes('furniture') ||
            lowerDesc.includes('bed') ||
            lowerDesc.includes('sofa') ||
            lowerDesc.includes('couch') ||
            lowerDesc.includes('fridge') ||
            lowerDesc.includes('refrigerator') ||
            lowerDesc.includes('washing machine') ||
            lowerDesc.includes('table') ||
            lowerDesc.includes('desk') ||
            lowerDesc.includes('wardrobe') ||
            lowerDesc.includes('moving')
        ) {
            recommended = VehicleType.PICKUP;
        }
        // 3. Ultra-Heavy / Container / Prime Mover Required
        else if (
            lowerDesc.includes('container') ||
            lowerDesc.includes('prime mover') ||
            lowerDesc.includes('trailer') ||
            lowerDesc.includes('shippin') ||
            lowerDesc.includes('20ft') ||
            lowerDesc.includes('40ft')
        ) {
            recommended = VehicleType.TRAILER;
        }
        // 4. Medium Items (Boxes, Electronics, Groceries) -> TukTuk or Pickup
        else if (
            lowerDesc.includes('box') ||
            lowerDesc.includes('carton') ||
            lowerDesc.includes('tv') ||
            lowerDesc.includes('television') ||
            lowerDesc.includes('microwave') ||
            lowerDesc.includes('groceries') ||
            lowerDesc.includes('shopping') ||
            lowerDesc.includes('bags') ||
            lowerDesc.includes('suitcase') ||
            lowerDesc.includes('luggage')
        ) {
            // TukTuk is good for medium items over short/medium distances
            if (distKm < 15) {
                recommended = VehicleType.TUKTUK;
            } else {
                recommended = VehicleType.PICKUP; // Faster/Safer for longer distances
            }
        }
        // 4. Small Items (Documents, Food, etc) -> Boda
        else {
            // Default to Boda for everything else unless it's a very specific case
            recommended = VehicleType.BODA;
        }

        // Distance Overrides
        if (distKm > 150 && (recommended === VehicleType.BODA || recommended === VehicleType.TUKTUK)) {
            recommended = VehicleType.PICKUP; // Force pickup for long distance
        }
    }, [selectedVehicle, distance, serviceType, waypoints.length]);

    useEffect(() => {
        // Sync order state for styling
        if (step < 4) setOrderState('DRAFTING');
    }, [step, setOrderState]);

    // Feature: Sync Address when Coords change (e.g. via Marker Drag)
    useEffect(() => {
        // ONLY sync if we are explicitly selecting on the map
        if (orderState !== 'DRAFTING' || !isMapSelecting) return;

        const syncAddresses = async () => {
            if (pickupCoords && activeInput === 'pickup') {
                const address = await mapService.reverseGeocode(pickupCoords.lat, pickupCoords.lng);
                if (address && address !== pickup) setPickup(address);
            } else if (dropoffCoords && activeInput === 'dropoff') {
                const address = await mapService.reverseGeocode(dropoffCoords.lat, dropoffCoords.lng);
                if (address && address !== dropoff) setDropoff(address);
            } else if (activeInput?.startsWith('waypoint-')) {
                const index = parseInt(activeInput.split('-')[1]);
                const wp = waypoints[index];
                if (wp && wp.coords) {
                    const address = await mapService.reverseGeocode(wp.coords.lat, wp.coords.lng);
                    if (address && address !== wp.address) {
                        updateWaypoint(index, address);
                    }
                }
            }
        };

        syncAddresses();
    }, [pickupCoords, dropoffCoords, waypointCoords, orderState, activeInput, waypoints, isMapSelecting]);

    const handleBook = async () => {
        const formatPhone = (p: string) => {
            let cleaned = p.replace(/[\s\-()]/g, '');
            if (cleaned.startsWith('0')) {
                cleaned = '254' + cleaned.substring(1);
            } else if (cleaned.startsWith('+')) {
                cleaned = cleaned.substring(1);
            }
            return cleaned;
        };

        const orderData = {
            userId: user?.id,
            userRole: user?.role,
            pickup,
            dropoff,
            pickupCoords: pickupCoords || undefined,
            dropoffCoords: dropoffCoords || undefined,
            pickupTime: isScheduled ? pickupTime : 'ASAP',
            vehicle: selectedVehicle,
            items: {
                description: itemDesc,
                fragile: isFragile,
                weightKg: itemWeight ? parseFloat(itemWeight) : 1,
                value: orderValue ? (parseInt(orderValue.replace(/,/g, '')) || 0) : 0,
                handlingNotes: handlingNotes
            },
            serviceType: serviceType,
            sender: {
                name: user?.name || senderName || 'Guest User',
                phone: formatPhone(user?.phone || senderPhone),
                idNumber: user?.idNumber || senderId || 'N/A'
            },
            recipient: {
                name: recipientName,
                phone: formatPhone(recipientPhone),
                idNumber: recipientId
            },
            paymentMethod,
            itemImage: itemImage || null,
            stops: waypoints.map((w, idx) => ({
                id: w.id,
                address: w.address,
                lat: w.coords?.lat || 0,
                lng: w.coords?.lng || 0,
                type: 'waypoint' as const,
                status: 'pending' as const,
                sequenceOrder: idx + 1,
                recipient: (w.recipientName && w.recipientPhone) ? {
                    name: w.recipientName,
                    phone: w.recipientPhone
                } : undefined,
                instructions: w.instructions
            }))
        };

        if (!user) {
            if (onRequireAuth) {
                onRequireAuth('Authentication Required', 'Please log in or sign up to complete your booking.');
            } else {
                showAlert('Authentication Required', 'Please sign in or create an account to book delivery.', 'info');
            }
            return;
        }

        setLoading(true);

        const validation = BookingSchema.safeParse(orderData);
        if (!validation.success) {
            setLoading(false);
            const errorMsg = validation.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join('. ');
            showAlert('Validation Error', errorMsg, 'error');
            return;
        }

        if (paymentMethod === 'MPESA') {
            setPaymentStatus('PROCESSING');
            try {
                const tempOrderId = `TUMA${Math.floor(Math.random() * 100000)}`;
                // Use the explicitly provided M-PESA number
                const paymentPhone = formatPhone(mpesaNumber || orderData.sender.phone);
                const response = await paymentService.initiateMpesaPayment(paymentPhone, priceQuote, tempOrderId);

                if (response.success && response.checkoutRequestId) {
                    setPaymentStatus('WAITING_FOR_PIN');
                    pollPaymentStatus(response.checkoutRequestId, orderData, tempOrderId);
                    return;
                }
            } catch (error: any) {
                setLoading(false);
                setPaymentStatus('FAILED');
                showAlert('Payment Error', error.message, 'error');
                return;
            }
        }

        completeOrder(orderData, `ORD-${Math.floor(Math.random() * 100000)}`);
    };

    const pollPaymentStatus = async (checkoutRequestId: string, orderData: any, tempOrderId: string, attempt = 0) => {
        if (attempt > 20) { // Timeout after ~40 seconds
            setPaymentStatus('FAILED');
            setLoading(false);
            showAlert('Payment Timeout', 'M-PESA request timed out. Please try again.', 'error');
            return;
        }

        try {
            const statusRes = await paymentService.checkPaymentStatus(checkoutRequestId);

            if (statusRes.status === 'COMPLETED') {
                setPaymentStatus('COMPLETED');
                completeOrder(orderData, tempOrderId);
            } else if (statusRes.status === 'FAILED') {
                setPaymentStatus('FAILED');
                setLoading(false);
                showAlert('Payment Failed', statusRes.message || 'The transaction was cancelled or declined.', 'error');
            } else {
                // Still pending
                setTimeout(() => pollPaymentStatus(checkoutRequestId, orderData, tempOrderId, attempt + 1), 2000);
            }
        } catch (error) {
            console.error("Polling error:", error);
            setTimeout(() => pollPaymentStatus(checkoutRequestId, orderData, tempOrderId, attempt + 1), 2000);
        }
    };

    const addWaypoint = () => {
        if (waypoints.length >= 5) {
            showAlert('Limit Reached', 'Maximum 5 intermediate stops allowed.', 'info');
            return;
        }
        const newId = `stop-${Date.now()}`;
        setWaypoints([...waypoints, {
            id: newId,
            address: '',
            coords: null,
            recipientName: '',
            recipientPhone: '',
            instructions: ''
        }]);
    };

    const removeWaypoint = (id: string) => {
        setWaypoints(waypoints.filter(w => w.id !== id));
    };

    const updateWaypoint = async (index: number, address: string) => {
        const newWaypoints = [...waypoints];
        newWaypoints[index].address = address;
        setWaypoints(newWaypoints);

        if (address.length > 2) {
            // Logic for suggestions can be added here if needed for each waypoint
        }
    };

    const completeOrder = async (orderData: any, id: string) => {
        // Optimize stops and generate verification codes
        let optimizedStops: any[] = [];

        if (pickupCoords && dropoffCoords) {
            const waypointData = waypoints
                .filter(w => w.coords)
                .map(w => ({
                    id: w.id,
                    lat: w.coords!.lat,
                    lng: w.coords!.lng,
                    address: w.address,
                    contact: (w.recipientName && w.recipientPhone) ? {
                        name: w.recipientName,
                        phone: w.recipientPhone
                    } : orderData.recipient,
                    instructions: w.instructions || ''
                }));

            const optimizationResult = await mapService.optimizeStops(
                { lat: pickupCoords.lat, lng: pickupCoords.lng, address: pickup },
                { lat: dropoffCoords.lat, lng: dropoffCoords.lng, address: dropoff },
                waypointData
            );

            // Keep all stops except the initial pickup (which is always first)
            // This includes waypoints and the final dropoff
            optimizedStops = optimizationResult.optimizedStops
                .filter(s => s.type !== 'pickup')
                .map(s => ({
                    id: s.id,
                    address: s.address,
                    lat: s.lat,
                    lng: s.lng,
                    type: s.type,
                    status: s.status,
                    verificationCode: s.verificationCode,
                    sequenceOrder: s.sequenceOrder,
                    recipient: s.contact, // Map back from generic contact to recipient
                    instructions: s.instructions
                }));

            // Use the final dropoff's code as the main order verification code for backward compatibility
            const finalDropoff = optimizationResult.optimizedStops.find(s => s.type === 'dropoff');
            if (finalDropoff) {
                orderData.verificationCode = finalDropoff.verificationCode;
            }
        } else {
            // Fallback: map waypoints AND the final dropoff with generated codes
            optimizedStops = [
                ...waypoints.map((w, idx) => ({
                    id: w.id,
                    address: w.address,
                    lat: w.coords?.lat || 0,
                    lng: w.coords?.lng || 0,
                    type: 'waypoint' as const,
                    status: 'pending' as const,
                    verificationCode: Math.floor(1000 + Math.random() * 9000).toString(),
                    sequenceOrder: idx + 1
                })),
                {
                    id: 'dropoff-end',
                    address: dropoff,
                    lat: dropoffCoords?.lat || 0,
                    lng: dropoffCoords?.lng || 0,
                    type: 'dropoff' as const,
                    status: 'pending' as const,
                    verificationCode: Math.floor(1000 + Math.random() * 9000).toString(),
                    sequenceOrder: waypoints.length + 1
                }
            ];

            // Set the main order verification code to the final dropoff's code
            orderData.verificationCode = optimizedStops[optimizedStops.length - 1].verificationCode;
        }

        const newOrder: any = {
            ...orderData,
            price: priceQuote,
            distance: distance, // Store distance in meters
            status: 'pending',
            serviceType: serviceType,
            tonnage: tonnage, // Add Tonnage
            estimatedDuration: estArrival ? `${estArrival.arrivalTime}, ${estArrival.arrivalDate}` : (aiResult?.estimatedDuration || '1 hour'),
            packagingAdvice: aiResult?.packagingAdvice || null,
            aiAnalysis: aiResult?.riskAssessment || null,
            itemImage: itemImage || null,
            stops: optimizedStops
        };
        // Pass the order data to the parent component to handle creation
        onOrderComplete(newOrder);
        setLoading(false);
    };

    const vehicleOptions = [
        { type: VehicleType.BODA, icon: Bike, label: 'Motorbike', desc: 'Small packages & docs', maxDist: 150, maxWeight: '10kg' },
        { type: VehicleType.TUKTUK, icon: Car, label: 'Tuk-Tuk', desc: 'Medium items & boxes', maxDist: 100, maxWeight: '100kg' },
        { type: VehicleType.PICKUP, icon: Truck, label: 'Pickup Truck', desc: 'Furniture & Appliances', maxDist: 1000, maxWeight: '1000kg' },
        { type: VehicleType.VAN, icon: Truck, label: 'Cargo Van', desc: 'Large item moves', maxDist: 1000, maxWeight: '2000kg' },
        { type: VehicleType.LORRY, icon: Truck, label: 'Truck / Lorry', desc: 'Commercial loads', maxDist: 2000, maxWeight: '3000kg+' },
        { type: VehicleType.TRAILER, icon: Truck, label: 'Container Trailer', desc: 'Containers & Heavy Freight', maxDist: 5000, maxWeight: '28000kg' },
    ];

    const handleWaypointDetailChange = (index: number, field: 'recipientName' | 'recipientPhone' | 'instructions', value: string) => {
        const newWaypoints = [...waypoints];
        newWaypoints[index] = { ...newWaypoints[index], [field]: value };
        setWaypoints(newWaypoints);
    };

    // Suggestion Handlers
    const handleInputChange = async (type: 'pickup' | 'dropoff' | 'waypoint', value: string, index?: number) => {
        if (type === 'pickup') {
            setPickup(value);
            if (value.length > 2) {
                const results = await mapService.getSuggestions(value);
                setPickupSuggestions(results);
                setShowPickupSuggestions(true);
            } else {
                setPickupSuggestions([]);
                setShowPickupSuggestions(false);
            }
        } else if (type === 'dropoff') {
            setDropoff(value);
            if (value.length > 2) {
                const results = await mapService.getSuggestions(value);
                setDropoffSuggestions(results);
                setShowDropoffSuggestions(true);
            } else {
                setDropoffSuggestions([]);
                setShowDropoffSuggestions(false);
            }
        } else if (type === 'waypoint' && index !== undefined) {
            updateWaypoint(index, value);
            if (value.length > 2) {
                const results = await mapService.getSuggestions(value);
                setDropoffSuggestions(results); // Share results bank
                setShowDropoffSuggestions(true);
                setActiveWaypointIndex(index);
            } else {
                setShowDropoffSuggestions(false);
            }
        }
    };

    const handleSuggestionSelect = async (type: 'pickup' | 'dropoff' | 'waypoint', suggestion: { label: string, lat: number, lng: number }) => {
        let coords = { lat: suggestion.lat, lng: suggestion.lng };
        if (coords.lat === 0 && coords.lng === 0) {
            const resolved = await mapService.geocodeAddress(suggestion.label);
            if (resolved) {
                coords = { lat: resolved.lat, lng: resolved.lng };
            }
        }

        if (type === 'pickup') {
            setPickup(suggestion.label);
            setPickupCoords(coords);
            setShowPickupSuggestions(false);
            if (dropoffCoords) {
                fitBounds([coords, dropoffCoords]);
            } else {
                fitBounds([coords]);
            }
        } else if (type === 'dropoff') {
            setDropoff(suggestion.label);
            setDropoffCoords(coords);
            setShowDropoffSuggestions(false);
            if (pickupCoords) {
                fitBounds([pickupCoords, coords]);
            } else {
                fitBounds([coords]);
            }
        } else if (type === 'waypoint' && activeWaypointIndex !== null) {
            const newWaypoints = [...waypoints];
            newWaypoints[activeWaypointIndex].address = suggestion.label;
            newWaypoints[activeWaypointIndex].coords = coords;
            setWaypoints(newWaypoints);
            setShowDropoffSuggestions(false);
            setActiveWaypointIndex(null);
        }
    };

    const toggleCollapse = (val: boolean) => {
        setIsCollapsed(val);
        onCollapseChange?.(val);
    };

    // Drawer Handle / Drag Zone
    const handleDragMove = (clientY: number) => {
        if (dragStartY.current !== null) {
            const diff = clientY - dragStartY.current;
            if (diff > 50 && !isCollapsed) toggleCollapse(true);
            if (diff < -50 && isCollapsed) toggleCollapse(false);
        }
    };

    return (
        <div className="w-full h-full flex flex-col justify-end pointer-events-none">
            <div className="pointer-events-auto w-full max-w-2xl mx-auto px-4 sm:px-6 pb-[env(safe-area-inset-bottom,0px)]">

                {/* Step Indicator - Removed for One-Click Flow */}
                {/* {!isCollapsed && (
          <div className="flex justify-center mb-4 animate-in fade-in slide-in-from-bottom-2">
            <div className="bg-white border border-gray-100 px-6 py-2 rounded-full shadow-2xl flex items-center space-x-3 transition-all">
              {[1, 2].map(s => (
                <div key={s} className={`w-2 h-2 rounded-full transition-all duration-500 ${step === s ? 'bg-gray-900 w-6' : 'bg-gray-300'}`} />
              ))}
            </div>
          </div>
        )} */}

                {/* Main Card - Professional Bottom Sheet (75% max when expanded) */}
                <div
                    className={`bg-white backdrop-blur-2xl rounded-t-[2rem] shadow-[0_-8px_30px_rgba(0,0,0,0.12)] border-t border-x border-gray-200 overflow-hidden transition-all duration-500 transform ${isCollapsed ? (isMapSelecting ? 'max-h-[200px]' : 'max-h-[150px]') : 'max-h-[75vh]'}`}
                >
                    {/* Drawer Handle / Drag Zone */}
                    <div
                        className="w-full flex justify-center py-4 cursor-grab active:cursor-grabbing group sticky top-0 bg-white/70 backdrop-blur-xl border-b border-white/20 z-20"
                        onClick={() => toggleCollapse(!isCollapsed)}
                        onMouseDown={(e) => dragStartY.current = e.clientY}
                        onMouseMove={(e) => handleDragMove(e.clientY)}
                        onMouseUp={() => dragStartY.current = null}
                        onMouseLeave={() => dragStartY.current = null}
                        onTouchStart={(e) => dragStartY.current = e.touches[0].clientY}
                        onTouchMove={(e) => handleDragMove(e.touches[0].clientY)}
                        onTouchEnd={() => dragStartY.current = null}
                    >
                        <div className="flex flex-col items-center w-full">
                            <div className="w-12 h-1.5 bg-gray-300/50 rounded-full group-hover:bg-gray-400/50 transition-colors mb-2" />
                            {!isCollapsed && priceQuote > 0 && (
                                <div className="absolute right-6 top-3 animate-in fade-in zoom-in-95 flex flex-col items-end">
                                    <div className="bg-brand-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter shadow-lg shadow-brand-200 border border-brand-500">
                                        KES {priceQuote.toLocaleString()}
                                    </div>
                                    {estArrival && (
                                        <span className="text-[8px] font-black text-brand-600 uppercase tracking-tighter mt-1 bg-brand-50 px-1.5 py-0.5 rounded border border-brand-100">
                                            ETA: {estArrival.arrivalTime}, {estArrival.arrivalDate}
                                        </span>
                                    )}
                                </div>
                            )}
                            {isCollapsed && (
                                <div className="w-full px-4 sm:px-6 pb-4 animate-in fade-in slide-in-from-bottom-2">
                                    {isMapSelecting ? (
                                        <div className="bg-brand-50 rounded-[2rem] shadow-2xl p-5 flex items-center justify-between animate-in slide-in-from-bottom-4 duration-500 border border-brand-100">
                                            <div className="flex-1 min-w-0 pr-4">
                                                <div className="flex items-center space-x-2 mb-1">
                                                    <div className={`w-2 h-2 rounded-full ${activeInput === 'pickup' ? 'bg-green-500' : activeInput === 'dropoff' ? 'bg-red-500' : 'bg-brand-500'}`}></div>
                                                    <p className="text-[10px] font-black text-brand-600 uppercase tracking-widest">
                                                        Confirm {activeInput === 'pickup' ? 'Pickup' : activeInput === 'dropoff' ? 'Delivery' : `Stop ${parseInt(activeInput?.split('-')[1] || '0') + 1}`}
                                                    </p>
                                                </div>
                                                <p className="text-gray-900 font-black truncate text-sm">
                                                    {activeInput === 'pickup' ? (pickup || "Locating...") :
                                                        activeInput === 'dropoff' ? (dropoff || "Locating...") :
                                                            (waypoints[parseInt(activeInput?.split('-')[1] || '0')]?.address || "Locating...")}
                                                </p>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setIsMapSelecting(false);
                                                    setIsCollapsed(false);
                                                }}
                                                className="bg-brand-600 text-white px-8 py-3 rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-all hover:bg-brand-700"
                                            >
                                                Confirm
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="bg-white/90 backdrop-blur-xl rounded-[2rem] shadow-2xl p-4 sm:p-6 border border-gray-100">
                                            {/* Compact View for Mobile/Collapsed State */}
                                            <div className="flex items-center justify-between w-full">
                                                <div className="flex items-center space-x-2 overflow-hidden flex-1 mr-2">
                                                    <div className="flex flex-col min-w-0 w-full">
                                                        <div className="flex items-center space-x-2 w-full overflow-hidden">
                                                            <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></div>
                                                            <span className="text-[10px] sm:text-xs font-bold text-gray-700 truncate max-w-[60px] sm:max-w-[120px]">{pickup || "Pickup"}</span>

                                                            {waypoints.length > 0 && (
                                                                <>
                                                                    <ArrowRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                                                    <div className="w-2 h-2 rounded-full bg-brand-400 flex-shrink-0"></div>
                                                                    <span className="text-[10px] sm:text-xs font-bold text-gray-700 truncate max-w-[60px] sm:max-w-[100px]">
                                                                        {waypoints[0].address || "Stop 1"}
                                                                    </span>
                                                                    {waypoints.length > 1 && (
                                                                        <span className="text-[10px] font-black text-gray-400 flex-shrink-0">...</span>
                                                                    )}
                                                                </>
                                                            )}

                                                            <ArrowRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                                            <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0"></div>
                                                            <span className="text-[10px] sm:text-xs font-bold text-gray-700 truncate max-w-[60px] sm:max-w-[120px]">{dropoff || "Dropoff"}</span>
                                                        </div>

                                                        <div className="flex items-center space-x-2 mt-1.5 w-full overflow-hidden">
                                                            <span className="text-xs font-black text-gray-900 truncate max-w-[100px] sm:max-w-[200px]">
                                                                {itemDesc || "New Delivery"}
                                                            </span>
                                                            <span className="text-gray-300">•</span>
                                                            <span className="text-[10px] font-black text-brand-600 whitespace-nowrap">KES {priceQuote.toLocaleString()}</span>
                                                        </div>

                                                        <div className="flex items-center space-x-2 mt-1 w-full overflow-hidden">
                                                            {selectedVehicle && (
                                                                <div className="flex items-center space-x-1 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 flex-shrink-0">
                                                                    {(() => {
                                                                        const VIcon = vehicleOptions.find(v => v.type === selectedVehicle)?.icon || Truck;
                                                                        return <VIcon className="w-2.5 h-2.5 text-gray-500" />;
                                                                    })()}
                                                                    <span className="text-[9px] font-bold text-gray-600 uppercase tracking-tighter">
                                                                        {vehicleOptions.find(v => v.type === selectedVehicle)?.label.split(' ')[0]}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            {estArrival && (
                                                                <div className="flex items-center space-x-1 flex-shrink-0">
                                                                    <Clock className="w-2.5 h-2.5 text-brand-500" />
                                                                    <span className="text-[9px] font-black text-brand-600 uppercase tracking-tighter whitespace-nowrap">
                                                                        {estArrival.arrivalTime}, {estArrival.arrivalDate}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Edit / Expand Button */}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleCollapse(false);
                                                    }}
                                                    className="flex-shrink-0 bg-brand-50 hover:bg-brand-100 p-2.5 rounded-2xl transition-all shadow-sm active:scale-90"
                                                >
                                                    <ChevronUp className="w-5 h-5 text-brand-600" />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div
                        ref={formContainerRef}
                        className={`px-6 sm:px-8 pb-6 transition-opacity duration-300 overflow-y-auto no-scrollbar ${isCollapsed ? 'opacity-0 pointer-events-none h-0' : 'opacity-100 flex-1'}`}
                        style={{ maxHeight: 'calc(75vh - 70px)' }}
                    >
                        <div className="space-y-6 animate-in fade-in duration-500">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center space-x-3">
                                    <div className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center">
                                        <MapPin className="w-6 h-6 text-brand-600" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Setup Delivery</h2>
                                    </div>
                                </div>
                                {pickupCoords && dropoffCoords && priceQuote > 0 ? (
                                    <div className="bg-brand-50 text-brand-700 px-4 py-2 rounded-full text-xs font-black uppercase tracking-tighter shadow-sm border border-brand-100 animate-in zoom-in-95 flex flex-col items-center">
                                        <span className="text-sm">Est. KES {priceQuote.toLocaleString()}</span>
                                        {estArrival && (
                                            <span className="text-[10px] text-brand-500 mt-0.5 whitespace-nowrap">ETA: {estArrival.arrivalTime}, {estArrival.arrivalDate}</span>
                                        )}
                                    </div>
                                ) : (
                                    <div className="bg-brand-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter shadow-lg shadow-brand-200">Quote: ...</div>
                                )}
                            </div>

                            {/* Professional Service Mode Selection */}
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { type: ServiceType.EXPRESS, label: 'Express Delivery', icon: Zap, color: 'green', desc: 'Instant Pickup' },
                                    { type: ServiceType.STANDARD, label: 'Standard Parcel', icon: Rocket, color: 'blue', desc: 'Same Day' },
                                    { type: ServiceType.ECONOMY, label: 'Economy', icon: Shield, color: 'slate', desc: 'Next Day' }
                                ].map((mode) => {
                                    const Icon = mode.icon;
                                    const isActive = serviceType === mode.type;
                                    const colorMap: any = {
                                        blue: isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-400',
                                        green: isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-400',
                                        slate: isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-400'
                                    };
                                    const borderMap: any = {
                                        blue: isActive ? 'border-blue-600 bg-blue-600 shadow-md' : 'border-gray-100 bg-white hover:border-blue-200',
                                        green: isActive ? 'border-brand-600 bg-brand-600 shadow-md' : 'border-gray-100 bg-white hover:border-brand-200',
                                        slate: isActive ? 'border-slate-800 bg-slate-900 shadow-md' : 'border-gray-100 bg-white hover:border-slate-200'
                                    };
                                    const textMap: any = {
                                        blue: isActive ? 'text-white' : 'text-gray-400',
                                        green: isActive ? 'text-white' : 'text-gray-400',
                                        slate: isActive ? 'text-white' : 'text-gray-400'
                                    };

                                    return (
                                        <button
                                            key={mode.type}
                                            onClick={() => setServiceType(mode.type)}
                                            className={`relative flex flex-col items-center p-4 rounded-3xl border-2 transition-all duration-300 ${borderMap[mode.color]} ${isActive ? '-translate-y-1' : 'shadow-sm'}`}
                                        >
                                            <div className={`p-2.5 rounded-2xl mb-1.5 transition-colors backdrop-blur-sm ${colorMap[mode.color]}`}>
                                                <Icon className="w-5 h-5" />
                                            </div>
                                            <span className={`text-[11px] font-black uppercase tracking-tight leading-tight ${textMap[mode.color]}`}>
                                                {mode.label}
                                            </span>
                                            <span className={`text-[8px] font-bold tracking-wider mt-0.5 ${isActive ? 'text-white/80' : 'text-gray-400'}`}>{mode.desc}</span>
                                            {isActive && (
                                                <div className="absolute top-2 right-2 flex space-x-0.5">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-white opacity-40 animate-ping" />
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="space-y-4">
                                <div className="group z-30">
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-2 ml-2">Pickup Location</label>
                                    <div className="relative">
                                        <div className="absolute left-4 inset-y-0 flex items-center pointer-events-none">
                                            <MapPin className="text-green-500 w-5 h-5 group-focus-within:scale-110 transition-transform" />
                                        </div>
                                        <input
                                            type="text"
                                            value={pickup}
                                            onFocus={() => {
                                                setActiveInput('pickup');
                                                setActiveWaypointIndex(null);
                                                setShowDropoffSuggestions(false);
                                                setIsMapSelecting(false); // Stop map selection if user starts typing
                                            }}
                                            onChange={(e) => handleInputChange('pickup', e.target.value)}
                                            className={`w-full bg-white border border-gray-200 shadow-sm rounded-[1.5rem] py-5 pl-12 pr-24 text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-brand-500/20 text-lg font-black transition-all ${isMapSelecting && activeInput === 'pickup' ? 'ring-2 ring-brand-500' : ''}`}
                                            placeholder="Pickup location"
                                        />
                                        <div className="absolute right-4 inset-y-0 flex items-center space-x-1">
                                            <button
                                                onClick={() => {
                                                    setActiveInput('pickup');
                                                    const nextState = !isMapSelecting;
                                                    setIsMapSelecting(nextState);
                                                    if (nextState) {
                                                        setIsCollapsed(true);
                                                        if (pickupCoords) {
                                                            setMapCenter(pickupCoords.lat, pickupCoords.lng);
                                                        }
                                                    }
                                                }}
                                                className={`p-2 rounded-xl transition-all shadow-sm active:scale-95 ${isMapSelecting && activeInput === 'pickup' ? 'bg-brand-600 text-white' : 'bg-white text-gray-400 hover:text-brand-600'}`}
                                                title="Set on Map"
                                            >
                                                <Map className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    const coords = await requestUserLocation();
                                                    if (coords) {
                                                        const address = await mapService.reverseGeocode(coords.lat, coords.lng);
                                                        if (address) {
                                                            setPickup(address);
                                                            setPickupCoords(coords);
                                                            if (dropoffCoords) fitBounds([coords, dropoffCoords]);
                                                        }
                                                    }
                                                }}
                                                className="p-2 bg-white hover:bg-gray-50 rounded-xl text-brand-600 transition-all shadow-sm active:scale-95"
                                                title="Use Current Location"
                                            >
                                                <Navigation className="w-5 h-5" />
                                            </button>
                                        </div>
                                        {isMapSelecting && activeInput === 'pickup' && (
                                            <div className="absolute right-14 top-10 text-[8px] font-extrabold text-green-500 animate-pulse uppercase tracking-tighter">Drag Map to adjust</div>
                                        )}

                                        {/* Pickup Suggestions Dropdown - Moved inside relative wrapper */}
                                        {showPickupSuggestions && pickupSuggestions.length > 0 && (
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-gray-100 overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2">
                                                {pickupSuggestions.map((suggestion, index) => (
                                                    <div
                                                        key={index}
                                                        onClick={() => handleSuggestionSelect('pickup', suggestion)}
                                                        className="p-4 hover:bg-brand-50 cursor-pointer border-b border-gray-50 last:border-none flex items-center gap-3 transition-colors group/item"
                                                    >
                                                        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0 group-hover/item:bg-white group-hover/item:text-brand-600 transition-colors">
                                                            <MapPin className="w-5 h-5 text-gray-400 group-hover/item:text-brand-600" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-gray-700 truncate">{suggestion.label.split(',')[0]}</p>
                                                            <p className="text-[10px] text-gray-400 font-medium truncate">{suggestion.label.split(',').slice(1).join(',').trim()}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Quick Places */}
                                    <div className="flex gap-2 mt-2 px-2">
                                        <button
                                            onClick={async () => {
                                                const coords = await requestUserLocation();
                                                if (coords) {
                                                    setPickupCoords(coords);
                                                    const address = await mapService.reverseGeocode(coords.lat, coords.lng);
                                                    if (address) setPickup(address);
                                                }
                                            }}
                                            className="flex items-center space-x-1 px-3 py-1 bg-white border border-gray-100 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-brand-600 hover:border-brand-200 transition-all shadow-sm"
                                        >
                                            <Navigation className="w-3 h-3" /> <span>Current Location</span>
                                        </button>
                                        <button
                                            onClick={async () => {
                                                const loc = "Nairobi, Kenya";
                                                setPickup(loc);
                                                const coords = await mapService.geocodeAddress(loc);
                                                if (coords) setPickupCoords(coords);
                                            }}
                                            className="flex items-center space-x-1 px-3 py-1 bg-white border border-gray-100 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-brand-600 hover:border-brand-200 transition-all shadow-sm"
                                        >
                                            <MapPin className="w-3 h-3" /> <span>Nairobi</span>
                                        </button>
                                    </div>

                                </div>

                                {/* --- Waypoints Section --- */}
                                <div className="relative ml-6 space-y-4 border-l-2 border-dashed border-gray-100 pl-6 py-2">
                                    {waypoints.map((wp, idx) => (
                                        <div key={wp.id} className="relative animate-in slide-in-from-left-4 duration-300 pb-2">
                                            <div className="absolute -left-[31px] top-6 w-4 h-4 rounded-full bg-white border-2 border-brand-400 z-10"></div>
                                            <div className="relative group/wp bg-gray-50/50 rounded-2xl p-2 border border-gray-100 hover:border-brand-200 transition-all">
                                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-2">Stop {idx + 1}</label>

                                                {/* LOCATION INPUT */}
                                                <div className="relative mb-2">
                                                    <input
                                                        type="text"
                                                        value={wp.address}
                                                        onChange={(e) => handleInputChange('waypoint', e.target.value, idx)}
                                                        onFocus={() => {
                                                            setActiveInput(`waypoint-${idx}`);
                                                            setActiveWaypointIndex(idx);
                                                            setShowPickupSuggestions(false);
                                                            setIsMapSelecting(false);
                                                        }}
                                                        className={`w-full bg-white border border-gray-100 rounded-xl py-3 pl-3 pr-24 text-sm font-bold text-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-brand-500/10 transition-all ${isMapSelecting && activeInput === `waypoint-${idx}` ? 'ring-2 ring-brand-500' : ''}`}
                                                        placeholder={`Stop Location...`}
                                                    />
                                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
                                                        <button
                                                            onClick={() => {
                                                                setActiveInput(`waypoint-${idx}`);
                                                                setActiveWaypointIndex(idx);
                                                                const nextState = !isMapSelecting;
                                                                setIsMapSelecting(nextState);
                                                                if (nextState) {
                                                                    setIsCollapsed(true);
                                                                    if (wp.coords) setMapCenter(wp.coords.lat, wp.coords.lng);
                                                                }
                                                            }}
                                                            className={`p-1.5 rounded-lg transition-all shadow-sm active:scale-95 ${isMapSelecting && activeInput === `waypoint-${idx}` ? 'bg-brand-600 text-white' : 'bg-white text-gray-400 hover:text-brand-600'}`}
                                                            title="Set on Map"
                                                        >
                                                            <Map className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => removeWaypoint(wp.id)}
                                                            className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* DETAILS INPUTS */}
                                                <div className="grid grid-cols-2 gap-2 px-1">
                                                    <input
                                                        type="text"
                                                        value={wp.recipientName || ''}
                                                        onChange={(e) => handleWaypointDetailChange(idx, 'recipientName', e.target.value)}
                                                        className="w-full bg-transparent border-b border-gray-200 py-1 text-xs font-medium text-gray-600 placeholder:text-gray-300 focus:border-brand-500 focus:ring-0 transition-colors"
                                                        placeholder="Contact Name (Optional)"
                                                    />
                                                    <input
                                                        type="tel"
                                                        value={wp.recipientPhone || ''}
                                                        onChange={(e) => handleWaypointDetailChange(idx, 'recipientPhone', e.target.value)}
                                                        className="w-full bg-transparent border-b border-gray-200 py-1 text-xs font-medium text-gray-600 placeholder:text-gray-300 focus:border-brand-500 focus:ring-0 transition-colors"
                                                        placeholder="Phone (Optional)"
                                                    />
                                                </div>

                                                {/* Waypoint Suggestions Dropdown */}
                                                {showDropoffSuggestions && activeWaypointIndex === idx && dropoffSuggestions.length > 0 && (
                                                    <div className="absolute top-[50px] left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-[60] animate-in fade-in slide-in-from-top-2">
                                                        {dropoffSuggestions.map((suggestion, sIdx) => (
                                                            <div
                                                                key={sIdx}
                                                                onClick={() => handleSuggestionSelect('waypoint', suggestion)}
                                                                className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-none flex items-center gap-3 transition-colors text-left"
                                                            >
                                                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                                                                    <MapPin className="w-4 h-4 text-gray-500" />
                                                                </div>
                                                                <p className="text-xs font-semibold text-gray-700 truncate">{suggestion.label}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    <button
                                        onClick={addWaypoint}
                                        className="flex items-center space-x-2 text-brand-600 font-black text-[10px] uppercase tracking-widest hover:text-brand-700 transition-colors pl-1"
                                    >
                                        <div className="w-6 h-6 rounded-full bg-brand-50 flex items-center justify-center">
                                            <Plus className="w-3 h-3" />
                                        </div>
                                        <span>Add Another Drop-off</span>
                                    </button>
                                </div>

                                <div className="group z-20">
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-2 ml-2">Dropoff Location</label>
                                    <div className="relative">
                                        <div className="absolute left-4 inset-y-0 flex items-center pointer-events-none">
                                            <MapPin className="text-red-500 w-5 h-5 group-focus-within:scale-110 transition-transform" />
                                        </div>
                                        <input
                                            type="text"
                                            value={dropoff}
                                            onFocus={() => {
                                                setActiveInput('dropoff');
                                                setActiveWaypointIndex(null);
                                                setShowPickupSuggestions(false);
                                                setIsMapSelecting(false); // Stop map selection if user starts typing
                                            }}
                                            onChange={(e) => handleInputChange('dropoff', e.target.value)}
                                            className={`w-full bg-white border border-gray-200 shadow-sm rounded-[1.5rem] py-5 pl-12 pr-24 text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-brand-500/20 text-lg font-black transition-all ${isMapSelecting && activeInput === 'dropoff' ? 'ring-2 ring-brand-500' : ''}`}
                                            placeholder="Where to?"
                                        />
                                        <div className="absolute right-4 inset-y-0 flex items-center space-x-1">
                                            <button
                                                onClick={() => {
                                                    setActiveInput('dropoff');
                                                    const nextState = !isMapSelecting;
                                                    setIsMapSelecting(nextState);
                                                    if (nextState) {
                                                        setIsCollapsed(true);
                                                        if (dropoffCoords) {
                                                            setMapCenter(dropoffCoords.lat, dropoffCoords.lng);
                                                        }
                                                    }
                                                }}
                                                className={`p-2 rounded-xl transition-all shadow-sm active:scale-95 ${isMapSelecting && activeInput === 'dropoff' ? 'bg-brand-600 text-white' : 'bg-white text-gray-400 hover:text-brand-600'}`}
                                                title="Set on Map"
                                            >
                                                <Map className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    const coords = await requestUserLocation();
                                                    if (coords) {
                                                        const address = await mapService.reverseGeocode(coords.lat, coords.lng);
                                                        if (address) {
                                                            setDropoff(address);
                                                            setDropoffCoords(coords);
                                                            if (pickupCoords) fitBounds([pickupCoords, coords]);
                                                        }
                                                    }
                                                }}
                                                className="p-2 bg-white hover:bg-gray-50 rounded-xl text-brand-600 transition-all shadow-sm active:scale-95"
                                                title="Use Current Location"
                                            >
                                                <Navigation className="w-5 h-5" />
                                            </button>
                                        </div>
                                        {isMapSelecting && activeInput === 'dropoff' && (
                                            <div className="absolute right-14 top-10 text-[8px] font-extrabold text-green-500 animate-pulse uppercase tracking-tighter">Drag Map to adjust</div>
                                        )}

                                        {/* Dropoff Suggestions Dropdown - Moved inside relative wrapper */}
                                        {showDropoffSuggestions && activeWaypointIndex === null && dropoffSuggestions.length > 0 && (
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-gray-100 overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2">
                                                {dropoffSuggestions.map((suggestion, index) => (
                                                    <div
                                                        key={index}
                                                        onClick={() => handleSuggestionSelect('dropoff', suggestion)}
                                                        className="p-4 hover:bg-brand-50 cursor-pointer border-b border-gray-50 last:border-none flex items-center gap-3 transition-colors group/item"
                                                    >
                                                        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0 group-hover/item:bg-white group-hover/item:text-brand-600 transition-colors">
                                                            <MapPin className="w-5 h-5 text-gray-400 group-hover/item:text-brand-600" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-gray-700 truncate">{suggestion.label.split(',')[0]}</p>
                                                            <p className="text-[10px] text-gray-400 font-medium truncate">{suggestion.label.split(',').slice(1).join(',').trim()}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Quick Places */}
                                    <div className="mt-2 -mx-8 px-8">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 px-2">Quick Destinations</p>
                                        <div
                                            ref={quickDestScrollRef}
                                            className="flex space-x-2 overflow-x-auto no-scrollbar pb-2 touch-pan-x cursor-grab"
                                        >
                                            {historyDestinations.length > 0 ? (
                                                historyDestinations.map((dest) => (
                                                    <button
                                                        key={dest}
                                                        onClick={async () => {
                                                            setDropoff(dest);
                                                            const coords = await mapService.geocodeAddress(dest);
                                                            if (coords) {
                                                                setDropoffCoords(coords);
                                                                fitBounds([coords]);
                                                            }
                                                        }}
                                                        className="flex-shrink-0 flex items-center space-x-1.5 px-4 py-2 bg-white border border-gray-100 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-brand-600 hover:border-brand-200 transition-all shadow-sm active:scale-95"
                                                    >
                                                        <MapPin className="w-3.5 h-3.5 text-brand-500" /> <span>{dest.split(',')[0]}</span>
                                                    </button>
                                                ))
                                            ) : (
                                                <>
                                                    {['Nairobi', 'Mombasa', 'Ruiru', 'Kisumu'].map((loc) => (
                                                        <button
                                                            key={loc}
                                                            onClick={async () => {
                                                                const fullLoc = `${loc}, Kenya`;
                                                                setDropoff(fullLoc);
                                                                const coords = await mapService.geocodeAddress(fullLoc);
                                                                if (coords) {
                                                                    setDropoffCoords(coords);
                                                                    fitBounds([coords]);
                                                                }
                                                            }}
                                                            className="flex-shrink-0 flex items-center space-x-1.5 px-4 py-2 bg-white border border-gray-100 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-brand-600 hover:border-brand-200 transition-all shadow-sm active:scale-95"
                                                        >
                                                            <MapPin className="w-3.5 h-3.5 text-brand-500" /> <span>{loc}</span>
                                                        </button>
                                                    ))}
                                                </>
                                            )}
                                        </div>
                                    </div>

                                </div>
                            </div>

                            <div className="space-y-4 pt-2">
                                <div className="flex bg-gray-100 p-1.5 rounded-[1.5rem]">
                                    <button
                                        onClick={() => setIsScheduled(false)}
                                        className={`flex-1 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${!isScheduled ? 'bg-white shadow-xl text-brand-600' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        Send Now
                                    </button>
                                    <button
                                        onClick={() => setIsScheduled(true)}
                                        className={`flex-1 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${isScheduled ? 'bg-white shadow-xl text-brand-600' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        Schedule
                                    </button>
                                </div>
                                {isScheduled && (
                                    <div className="relative animate-in fade-in slide-in-from-top-2">
                                        <div className="absolute left-4 inset-y-0 flex items-center pointer-events-none">
                                            <Calendar className="w-5 h-5 text-brand-600" />
                                        </div>
                                        <input type="datetime-local" value={pickupTime} onChange={e => setPickupTime(e.target.value)} className="w-full border-none bg-gray-50 rounded-[1.5rem] py-5 pl-12 pr-6 text-gray-900 font-black text-lg focus:ring-2 focus:ring-brand-500/20" />
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4">
                                <div className="relative group">
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-2 ml-2">Item Description</label>
                                    <Box className="absolute left-4 top-12 text-brand-600 w-5 h-5 pointer-events-none group-focus-within:scale-110 transition-transform" />
                                    <textarea
                                        value={itemDesc}
                                        onChange={(e) => setItemDesc(e.target.value)}
                                        className="w-full bg-gray-50 border-none rounded-[1.5rem] py-4 pl-12 pr-4 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-brand-500/20 min-h-[100px] text-lg font-black transition-all"
                                        placeholder="What are we moving? (e.g. 5 boxes of electronics)"
                                    />
                                </div>

                                {/* Quick Fill Items */}
                                <div className="flex flex-wrap gap-2 px-1">
                                    {historyItems.map(item => (
                                        <button
                                            key={item}
                                            onClick={() => setItemDesc(prev => prev ? `${prev}, ${item}` : item)}
                                            className="px-3 py-1.5 bg-white border border-gray-100 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-500 hover:border-brand-300 hover:text-brand-600 transition-all shadow-sm"
                                        >
                                            + {item}
                                        </button>
                                    ))}
                                </div>

                                {/* Weight Input */}
                                <div className="relative">
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-2 ml-2">Approx. Weight (kg)</label>
                                    <div className="absolute left-4 top-10 flex items-center pointer-events-none">
                                        <Scale className="w-5 h-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="number"
                                        value={itemWeight}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setItemWeight(val);

                                            const weight = parseFloat(val);
                                            if (!isNaN(weight) && weight > 0) {
                                                const suitable = vehicleOptions.find(v => {
                                                    const max = parseInt(v.maxWeight.replace('kg', ''));
                                                    return weight <= max;
                                                });

                                                if (suitable) {
                                                    setSelectedVehicle(suitable.type);
                                                } else {
                                                    // Allow the user to manually override if needed, but default to the largest
                                                    const largest = vehicleOptions[vehicleOptions.length - 1]; // Assuming sorted by capacity
                                                    setSelectedVehicle(largest.type);
                                                }
                                            }
                                        }}
                                        className="w-full bg-gray-50 border-none rounded-2xl py-3 pl-12 pr-4 text-gray-900 font-bold focus:ring-2 focus:ring-brand-500/20"
                                        placeholder="Approx. Weight (kg) - Optional"
                                    />
                                </div>

                                {/* Fragile & Handling Notes */}
                                <div className="bg-orange-50/50 rounded-2xl p-4 border border-orange-100 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                            <AlertTriangle className="w-5 h-5 text-orange-500" />
                                            <span className="text-sm font-black text-gray-900 uppercase tracking-wide">Fragile Item?</span>
                                        </div>
                                        <button
                                            onClick={() => setIsFragile(!isFragile)}
                                            className={`relative w-12 h-6 rounded-full transition-colors duration-200 ease-in-out ${isFragile ? 'bg-orange-500' : 'bg-gray-200'}`}
                                        >
                                            <span className={`block w-4 h-4 rounded-full bg-white shadow transform transition-transform duration-200 ease-in-out ${isFragile ? 'translate-x-7' : 'translate-x-1'}`} />
                                        </button>
                                    </div>

                                    {isFragile && (
                                        <div className="animate-in fade-in slide-in-from-top-2">
                                            <textarea
                                                value={handlingNotes}
                                                onChange={(e) => setHandlingNotes(e.target.value)}
                                                className="w-full bg-white border border-orange-200 rounded-xl py-3 px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all min-h-[80px]"
                                                placeholder="Add handling instructions (e.g. Do not stack, Keep upright)..."
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Smart Transport Selection - Moved below Fragile */}
                                {pickupCoords && dropoffCoords && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-4">
                                        <div className="flex items-center justify-between px-2">
                                            <div className="flex items-center space-x-2">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Select Vehicle</p>
                                                {distance > 50000 && (
                                                    <span className="flex items-center space-x-1 bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border border-blue-100">
                                                        <Map className="w-2.5 h-2.5" /> <span>Long Distance</span>
                                                    </span>
                                                )}
                                            </div>
                                            <div className="bg-brand-50 text-brand-700 px-2.5 py-1 rounded-xl font-black text-xs border border-brand-100 shadow-sm">
                                                {calculatingPrice ? '...' : `KES ${priceQuote.toLocaleString()}`}
                                            </div>
                                        </div>
                                        <div
                                            ref={vehicleScrollRef}
                                            className="flex space-x-3 overflow-x-auto pt-6 pb-6 no-scrollbar -mx-8 px-8 snap-x touch-pan-x cursor-grab"
                                        >
                                            {vehicleOptions
                                                .filter(v => {
                                                    const distKm = distance / 1000;
                                                    const lowerDesc = itemDesc.toLowerCase();

                                                    // Force bigger vehicles for intercity if they select Lorry/Van/Pickup
                                                    if (v.maxDist && distKm > v.maxDist) return false;

                                                    // Logistics Rule: Heavy items don't go on Bodas
                                                    if ((lowerDesc.includes('cargo') || lowerDesc.includes('gunia') || lowerDesc.includes('sack') || lowerDesc.includes('heavy') || lowerDesc.includes('furniture') || lowerDesc.includes('container') || lowerDesc.includes('90kg')) &&
                                                        (v.type === VehicleType.BODA || v.type === VehicleType.TUKTUK)) {
                                                        return false;
                                                    }

                                                    return true;
                                                })
                                                .map((v) => {
                                                    const Icon = v.icon;
                                                    const isSelected = selectedVehicle === v.type;
                                                    const isIntercityFriendly = v.type === VehicleType.PICKUP || v.type === VehicleType.VAN || v.type === VehicleType.LORRY;

                                                    return (
                                                        <div
                                                            key={v.type}
                                                            onClick={() => setSelectedVehicle(v.type)}
                                                            className={`flex-shrink-0 w-40 p-5 rounded-[2.2rem] border-2 transition-all cursor-pointer relative snap-start ${isSelected
                                                                ? 'bg-white border-brand-600 shadow-[0_15px_40px_rgba(37,99,235,0.18)] scale-105 z-10'
                                                                : 'bg-gray-50/50 border-gray-100 hover:border-gray-200'
                                                                }`}
                                                        >
                                                            <div className={`p-2 rounded-xl w-fit mb-3 ${isSelected ? 'bg-brand-600 text-white' : 'bg-white text-gray-400 border border-gray-100'}`}>
                                                                <Icon className="w-5 h-5" />
                                                            </div>
                                                            <p className={`text-[11px] font-black uppercase tracking-tight leading-none ${isSelected ? 'text-gray-900' : 'text-gray-500'}`}>{v.label}</p>
                                                            <div className="mt-1 flex flex-col space-y-0.5">
                                                                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">{v.maxWeight} Capacity</span>
                                                                {isIntercityFriendly && distance > 100000 && (
                                                                    <span className="text-[8px] text-brand-600 font-black uppercase tracking-tighter">Intercity Mode</span>
                                                                )}
                                                            </div>

                                                            {isSelected && (
                                                                <div className="absolute -top-1.5 -right-1.5 bg-brand-600 text-white p-1 rounded-full shadow-lg">
                                                                    <Check className="w-3 h-3" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    </div>
                                )}

                                {/* Tonnage Selector for Truck/Lorry/Trailer */}
                                {(selectedVehicle === VehicleType.LORRY || selectedVehicle === VehicleType.TRAILER) && (
                                    <div className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-lg mb-4 animate-in slide-in-from-top-4 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-4 opacity-10">
                                            <Truck className="w-24 h-24 text-gray-500" />
                                        </div>
                                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4 relative z-10">
                                            Select Load Capacity
                                        </label>
                                        <div className="grid grid-cols-3 gap-3 relative z-10">
                                            {['3 Ton', '4 Ton', '5 Ton', '8 Ton', '12 Ton', '15 Ton', '20ft', '40ft'].map((t) => (
                                                <button
                                                    key={t}
                                                    onClick={() => setTonnage(t)}
                                                    className={`py-3 px-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-tight transition-all border flex items-center justify-center ${tonnage === t
                                                        ? 'bg-brand-600 text-white border-brand-600 shadow-md transform scale-105'
                                                        : 'bg-gray-50 text-gray-600 border-gray-100 hover:border-brand-200 hover:bg-white'
                                                        }`}
                                                >
                                                    {t.includes('ft') ? <span className='mr-1'>🚢</span> : <span className='mr-1'>⚖️</span>} {t}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Smart Logic Badge / Summary */}
                                {pickupCoords && dropoffCoords && (
                                    <div className="bg-brand-50/50 rounded-2xl p-5 border border-brand-100 flex items-start space-x-4 animate-in fade-in duration-700">
                                        <div className={`p-3 rounded-xl ${serviceType === ServiceType.EXPRESS ? 'bg-brand-600 text-white' : 'bg-white text-brand-600 border border-brand-100 shadow-sm'}`}>
                                            {serviceType === ServiceType.EXPRESS ? <Zap className="w-5 h-5" /> : serviceType === ServiceType.STANDARD ? <Rocket className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-black text-gray-900 uppercase tracking-tighter">
                                                {serviceType === ServiceType.EXPRESS ? 'Express Instant' : serviceType === ServiceType.STANDARD ? 'Standard Delivery' : 'Economy Delivery'}
                                            </h4>
                                            <p className="text-[11px] text-gray-600 font-bold leading-tight mt-1 uppercase tracking-tight">
                                                {serviceType === ServiceType.EXPRESS
                                                    ? `🚀 Direct dispatch. Ideal for urgent documents, forgotten keys, or hot meals. Used primarily by Individuals and E-commerce sellers.`
                                                    : serviceType === ServiceType.STANDARD
                                                        ? `✅ Reliability meets value. Best for wholesale orders, corporate supplies, and scheduled stock. Preferred by Retailers and Offices.`
                                                        : `💰 Our most affordable rate. Tailored for moving bulky construction materials or non-urgent freight. Perfect for Contractors and Heavy Cargo.`}
                                            </p>
                                            {estArrival && (
                                                <div className="mt-2 flex items-center space-x-2">
                                                    <div className="px-2 py-0.5 bg-brand-600 text-white text-[9px] font-black rounded-md uppercase tracking-widest">
                                                        Est. Arrival
                                                    </div>
                                                    <span className="text-[10px] font-black text-gray-900 uppercase tracking-tighter">
                                                        {estArrival.arrivalTime} • {estArrival.arrivalDate}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Image Upload - Moved below Vehicle Selection */}
                                <div className="relative pt-2">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">Item Photo (Optional)</label>
                                    <div className="flex items-center gap-4">
                                        <div
                                            onClick={() => document.getElementById('item-image-upload')?.click()}
                                            className="w-24 h-24 rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-brand-500 hover:bg-brand-50 transition-all overflow-hidden bg-gray-50 shadow-inner"
                                        >
                                            {itemImage ? (
                                                <img src={itemImage} alt="Item" className="w-full h-full object-cover" />
                                            ) : (
                                                <>
                                                    <Smartphone className="w-6 h-6 text-gray-400 mb-1" />
                                                    <span className="text-[10px] font-black text-gray-500 uppercase">Upload</span>
                                                </>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs text-gray-500 font-black uppercase tracking-widest leading-relaxed">
                                                Adding a photo helps the driver identify your items and ensures safe handling.
                                            </p>
                                            {itemImage && (
                                                <button
                                                    onClick={() => setItemImage(null)}
                                                    className="text-xs font-black text-red-500 mt-1 hover:underline uppercase tracking-wider"
                                                >
                                                    Remove Photo
                                                </button>
                                            )}
                                        </div>
                                        <input
                                            id="item-image-upload"
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    const reader = new FileReader();
                                                    reader.onloadend = () => {
                                                        setItemImage(reader.result as string);
                                                    };
                                                    reader.readAsDataURL(file);
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Sender Section (For Guests) - HIDDEN to force login at end */
                            /* !user && (
                                <div className="bg-white rounded-[2rem] p-6 border border-gray-100 space-y-4 shadow-sm">
                                    <div className="flex items-center space-x-2 px-2">
                                        <div className="w-1.5 h-4 bg-gray-400 rounded-full"></div>
                                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Your Details (Sender)</p>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="relative">
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-2">Sender Name</label>
                                            <div className="absolute left-4 top-9 flex items-center pointer-events-none">
                                                <User className="w-4 h-4 text-gray-400" />
                                            </div>
                                            <input type="text" placeholder="Your Name" value={senderName} onChange={e => setSenderName(e.target.value)} className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-10 pr-4 text-gray-900 focus:ring-brand-500 text-sm font-black uppercase tracking-widest placeholder:text-gray-300" />
                                        </div>
                                        <div className="relative">
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-2">Sender Phone</label>
                                            <div className="absolute left-4 top-9 flex items-center pointer-events-none">
                                                <Phone className="w-4 h-4 text-gray-400" />
                                            </div>
                                            <input type="tel" placeholder="Your Phone Number" value={senderPhone} onChange={e => setSenderPhone(e.target.value)} className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-10 pr-4 text-gray-900 focus:ring-brand-500 text-sm font-black uppercase tracking-widest placeholder:text-gray-300" />
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-gray-400 font-bold px-2 italic">We need this to contact you regarding the pickup.</p>
                                </div>
                            ) */}

                            {/* Recipient Section */}
                            <div className="bg-brand-50/30 rounded-[2rem] p-6 border border-brand-100/50 space-y-4">
                                <div className="flex items-center justify-between px-2">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-1.5 h-4 bg-brand-600 rounded-full"></div>
                                        <p className="text-xs font-black text-brand-600 uppercase tracking-widest">Recipient Details</p>
                                    </div>
                                    {(!recipientName || !recipientPhone || !recipientId) && <span className="text-[10px] text-red-500 font-bold animate-pulse">Missing Details</span>}
                                </div>

                                {/* Saved Contacts Quick Select */}
                                {savedContacts.length > 0 && (
                                    <div className="flex flex-wrap gap-2 px-2">
                                        {savedContacts.map(contact => (
                                            <button
                                                key={contact.phone}
                                                onClick={() => {
                                                    setRecipientName(contact.name);
                                                    setRecipientPhone(contact.phone);
                                                    setRecipientId(contact.id);
                                                }}
                                                className="px-3 py-1.5 bg-white border border-brand-100 rounded-full text-[10px] font-black uppercase tracking-widest text-brand-600 hover:bg-brand-600 hover:text-white transition-all shadow-sm"
                                            >
                                                {contact.name.split(' ')[0]}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <div className="space-y-3">
                                    <div className="relative">
                                        <label className="block text-[10px] font-bold text-brand-400 uppercase mb-1 ml-2">Recipient Name</label>
                                        <div className="absolute left-4 top-9 flex items-center pointer-events-none">
                                            <User className="w-4 h-4 text-brand-500" />
                                        </div>
                                        <input type="text" placeholder="Recipient Name" value={recipientName} onChange={e => setRecipientName(e.target.value)} className="w-full bg-white border-none rounded-2xl py-4 pl-10 pr-4 text-gray-900 focus:ring-brand-500 text-sm shadow-sm font-black uppercase tracking-widest placeholder:text-gray-300" />
                                    </div>
                                    <div className="relative">
                                        <label className="block text-[10px] font-bold text-brand-400 uppercase mb-1 ml-2">Recipient Phone</label>
                                        <div className="absolute left-4 top-9 flex items-center pointer-events-none">
                                            <Phone className="w-4 h-4 text-brand-500" />
                                        </div>
                                        <input type="tel" placeholder="Recipient Phone Number" value={recipientPhone} onChange={e => setRecipientPhone(e.target.value)} className="w-full bg-white border-none rounded-2xl py-4 pl-10 pr-4 text-gray-900 focus:ring-brand-500 text-sm shadow-sm font-black uppercase tracking-widest placeholder:text-gray-300" />
                                    </div>
                                    <div className="relative">
                                        <label className="block text-[10px] font-bold text-brand-400 uppercase mb-1 ml-2">Recipient ID / PIN</label>
                                        <div className="absolute left-4 top-9 flex items-center pointer-events-none">
                                            <CreditCard className="w-4 h-4 text-brand-500" />
                                        </div>
                                        <input type="text" placeholder="Recipient ID Number" value={recipientId} onChange={e => setRecipientId(e.target.value)} className="w-full bg-white border-none rounded-2xl py-4 pl-10 pr-4 text-gray-900 focus:ring-brand-500 text-sm shadow-sm font-black uppercase tracking-widest placeholder:text-gray-300" />
                                    </div>
                                </div>
                            </div>

                            {/* Payment Section */}
                            <div className="space-y-4">
                                <div className="bg-brand-50/50 p-6 rounded-[2rem] border border-brand-100 text-center">
                                    <p className="text-[10px] font-black text-brand-600 uppercase tracking-[0.2em] mb-1">Total Payable</p>
                                    <div className="flex items-center justify-center space-x-2">
                                        <span className="text-xl font-bold text-brand-400">KES</span>
                                        <span className="text-4xl font-black text-gray-900 tracking-tighter">{priceQuote.toLocaleString()}</span>
                                    </div>
                                </div>

                                {paymentStatus === 'PROCESSING' || paymentStatus === 'WAITING_FOR_PIN' ? (
                                    <div className="space-y-6 py-4 text-center animate-pulse">
                                        <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-2 shadow-inner">
                                            <Truck className="w-8 h-8 text-brand-600 animate-bounce" />
                                        </div>
                                        <h3 className="text-lg font-black text-gray-900 uppercase tracking-tighter">{paymentStatus === 'PROCESSING' ? 'Initiating M-PESA' : 'Check your phone'}</h3>
                                    </div>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                onClick={() => setPaymentMethod('MPESA')}
                                                className={`group relative p-4 rounded-2xl border-2 transition-all ${paymentMethod === 'MPESA' ? 'bg-green-600 border-green-600 text-white shadow-lg' : 'bg-white border-gray-100 text-gray-400'}`}
                                            >
                                                <div className="flex flex-col items-center space-y-1">
                                                    <Smartphone className={`w-5 h-5 ${paymentMethod === 'MPESA' ? 'text-white' : 'text-green-500'}`} />
                                                    <span className="font-black text-[10px] uppercase tracking-wider">M-PESA</span>
                                                </div>
                                            </button>
                                            <button
                                                onClick={() => setPaymentMethod('CASH')}
                                                className={`group relative p-4 rounded-2xl border-2 transition-all ${paymentMethod === 'CASH' ? 'bg-brand-600 border-brand-600 text-white shadow-lg' : 'bg-white border-gray-100 text-gray-400'}`}
                                            >
                                                <div className="flex flex-col items-center space-y-1">
                                                    <Banknote className={`w-5 h-5 ${paymentMethod === 'CASH' ? 'text-white' : 'text-brand-500'}`} />
                                                    <span className="font-black text-[10px] uppercase tracking-wider">CASH</span>
                                                </div>
                                            </button>
                                        </div>

                                        {paymentMethod === 'MPESA' && (
                                            <div className="relative animate-in fade-in slide-in-from-top-2">
                                                <label className="block text-[10px] font-bold text-brand-400 uppercase mb-1 ml-2">M-PESA Number</label>
                                                <div className="absolute left-4 top-9 flex items-center pointer-events-none">
                                                    <Smartphone className="w-4 h-4 text-brand-500" />
                                                </div>
                                                <input
                                                    type="tel"
                                                    placeholder="M-PESA Number (+254...)"
                                                    value={mpesaNumber}
                                                    onChange={e => setMpesaNumber(e.target.value)}
                                                    className="w-full bg-white border-none rounded-2xl py-4 pl-10 pr-4 text-gray-900 focus:ring-brand-500 text-sm shadow-sm font-black uppercase tracking-widest placeholder:text-gray-300"
                                                />
                                            </div>
                                        )}

                                        <button
                                            onClick={() => {
                                                if (!user) {
                                                    // Trigger Auth Prompt from BookingPage
                                                    onRequireAuth?.('Authentication Required', 'Please log in or sign up to complete your booking.');
                                                    return;
                                                }
                                                handleBook();
                                            }}
                                            disabled={loading || !recipientName || !recipientPhone || !recipientId || (paymentMethod === 'MPESA' && !mpesaNumber) /* || (!user && (!senderName || !senderPhone)) */}
                                            className="w-full bg-gray-900 text-white py-6 rounded-[2rem] font-black text-xl shadow-2xl hover:bg-black disabled:opacity-50 transition-all flex items-center justify-center space-x-3"
                                        >
                                            {loading ? (
                                                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            ) : (
                                                <>
                                                    <span>Book Order</span>
                                                    <ArrowRight className="w-6 h-6" />
                                                </>
                                            )}
                                        </button>
                                    </>
                                )}
                            </div>
                            <div ref={formBottomRef} className="h-4" />
                        </div>



                    </div>
                </div>
            </div>
        </div>
    );
};

export default BookingForm;
