
import React, { useEffect, useRef, useState } from 'react';
import type { DeliveryOrder, Driver } from '../types';
import { VehicleType, ServiceType } from '../types';
import { Phone, MessageSquare, Star, CheckCircle, Circle, Truck, Package, User, CreditCard, ArrowLeft, ArrowRight, Bike, Car, Shield, Navigation, Loader, XCircle, AlertTriangle, Map, MapPin, Building2 as Building, Clock, Box, Plus, X, Calendar, Zap, Rocket, Scale, ChevronUp, ChevronDown, Copy, Check, RefreshCw } from 'lucide-react';
import { useMapState } from '@/context/MapContext';
import { mapService } from '@/services/mapService';
import { orderService } from '@/services/orderService';
import { useAuth } from '@/context/AuthContext';

interface TrackingProps {
  order: DeliveryOrder;
  onUpdateStatus: (orderId: string, status: DeliveryOrder['status'], driverDetails?: Driver) => void;
  onUpdateOrder: (orderId: string, updates: Partial<DeliveryOrder>) => void;
  onBack: () => void;
}

const Tracking: React.FC<TrackingProps> = ({ order, onUpdateStatus, onUpdateOrder, onBack }) => {
  const { user } = useAuth();
  const {
    setDriverCoords, setDriverBearing, pickupCoords, dropoffCoords,
    fitBounds, setRoutePolyline, setOrderState, isMapSelecting,
    setIsMapSelecting, activeInput, setActiveInput, setMapCenter,
    isPanning, requestUserLocation, setPickupCoords, setDropoffCoords,
    mapCenter, setAllowMarkerClick, waypointCoords, setWaypointCoords
  } = useMapState();
  const animationRef = useRef<number | null>(null);
  const vehicleScrollRef = useRef<HTMLDivElement>(null);
  const serviceScrollRef = useRef<HTMLDivElement>(null);

  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // History-based Quick Destinations & Items
  const [historyDestinations, setHistoryDestinations] = useState<string[]>([]);
  const [historyItems, setHistoryItems] = useState<string[]>(['Documents', 'Electronics', 'Food/Groceries', 'Medicine', '50ft Container', 'Gunia (Sacks)']);

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
              const parts = desc.split(',').map(s => s.trim()).filter(s => s.length > 0);
              parts.forEach(p => {
                const normalized = p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
                itemCounts[normalized] = (itemCounts[normalized] || 0) + 1;
              });
            }
          });

          const sortedItems = Object.entries(itemCounts)
            .sort(([, a], [, b]) => b - a)
            .map(([item]) => item);

          const defaults = ['Documents', 'Medicine', 'Food/Groceries', '50ft Container', 'Electronics', 'Construction Materials', 'Home Moving', '20 90kg Sacks'];
          const finalItems = Array.from(new Set([...sortedItems, ...defaults])).slice(0, 8);
          setHistoryItems(finalItems);
        } catch (e) {
          console.error("Error fetching history in Tracking:", e);
        }
      }
    };
    fetchHistory();
  }, [user]);

  // Sync allowMarkerClick with isEditing
  useEffect(() => {
    setAllowMarkerClick(isEditing);
  }, [isEditing, setAllowMarkerClick]);

  // Set Order State to IN_TRANSIT when tracking
  useEffect(() => {
    setOrderState('IN_TRANSIT');
    return () => setOrderState('IDLE');
  }, [setOrderState]);

  const dragStartY = useRef<number | null>(null);


  // Form State for editing
  const [editForm, setEditForm] = useState({
    recipientName: order?.recipient?.name || '',
    recipientPhone: order?.recipient?.phone || '',
    recipientId: order?.recipient?.idNumber || '',
    itemDesc: order?.items?.description || '',
    fragile: order?.items?.fragile || false,
    weightKg: order?.items?.weightKg || 1,
    handlingNotes: order?.items?.handlingNotes || '',
    pickup: order?.pickup || '',
    dropoff: order?.dropoff || '',
    vehicle: order?.vehicle || VehicleType.BODA,
    serviceType: order?.serviceType || ServiceType.EXPRESS,
    waypoints: (order?.stops || [])
      .filter(s => s.type === 'waypoint')
      .map(s => ({
        id: s.id,
        address: s.address,
        coords: { lat: s.lat, lng: s.lng },
        status: s.status,
        type: s.type,
        verificationCode: s.verificationCode
      })),
    isScheduled: order?.pickupTime !== 'ASAP' && !!order?.pickupTime,
    pickupTime: order?.pickupTime === 'ASAP' ? '' : (order?.pickupTime || '')
  });

  const [activeWaypointIndex, setActiveWaypointIndex] = useState<number | null>(null);
  const [distance, setDistance] = useState<number>(order.remainingDistance || 0);
  const [priceQuote, setPriceQuote] = useState<number>(order.price || 0);

  // Debounced Distance calculation for vehicle eligibility
  useEffect(() => {
    if (!isEditing) return;

    const updateDistance = async () => {
      if (pickupCoords && dropoffCoords) {
        const validWaypointCoords = editForm.waypoints
          .map(w => w.coords!)
          .filter(c => !!c && c.lat !== 0);

        try {
          const route = await mapService.getRoute(
            pickupCoords,
            dropoffCoords,
            validWaypointCoords
          );
          if (route) {
            setDistance(route.distance);
          }
        } catch (error) {
          console.error("Routing error in Tracking edit:", error);
        }
      }
    };

    const timer = setTimeout(updateDistance, 1000);
    return () => clearTimeout(timer);
  }, [isEditing, pickupCoords, dropoffCoords, editForm.waypoints]);

  useEffect(() => {
    if (!isEditing) return;
    const fetchPrice = async () => {
      if (distance > 0) {
        const p = await orderService.calculatePrice({
          distance,
          vehicleType: editForm.vehicle,
          serviceType: editForm.serviceType,
          stopCount: editForm.waypoints.length + 1
        });
        setPriceQuote(p);
      }
    };
    fetchPrice();
  }, [isEditing, editForm.vehicle, editForm.serviceType, editForm.waypoints.length, distance]);

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
      el.addEventListener('click', onClick, true);

      return () => {
        el.removeEventListener('wheel', onWheel);
        el.removeEventListener('mousedown', onMouseDown);
        el.removeEventListener('mouseleave', onMouseLeave);
        el.removeEventListener('mouseup', onMouseUp);
        el.removeEventListener('mousemove', onMouseMove);
        el.removeEventListener('click', onClick, true);
      };
    };

    const vCleanup = setupDragScroll(vehicleScrollRef);
    const sCleanup = setupDragScroll(serviceScrollRef);

    return () => {
      if (vCleanup) vCleanup();
      if (sCleanup) sCleanup();
    };
  }, [isEditing, distance, editForm.itemDesc]);

  // Suggestions State
  const [pickupSuggestions, setPickupSuggestions] = useState<Array<{ label: string, lat: number, lng: number }>>([]);
  const [dropoffSuggestions, setDropoffSuggestions] = useState<Array<{ label: string, lat: number, lng: number }>>([]);
  const [showPickupSuggestions, setShowPickupSuggestions] = useState(false);
  const [showDropoffSuggestions, setShowDropoffSuggestions] = useState(false);

  // Feature: Reverse Geocoding on Map Idle (Only when explicitly selecting on map)
  useEffect(() => {
    if (!isPanning && activeInput && isMapSelecting && isEditing) {
      const timer = setTimeout(async () => {
        const address = await mapService.reverseGeocode(mapCenter.lat, mapCenter.lng);
        if (address) {
          if (activeInput === 'pickup') {
            setEditForm(prev => ({ ...prev, pickup: address }));
            setPickupCoords({ lat: mapCenter.lat, lng: mapCenter.lng });
          } else if (activeInput === 'dropoff') {
            setEditForm(prev => ({ ...prev, dropoff: address }));
            setDropoffCoords({ lat: mapCenter.lat, lng: mapCenter.lng });
          } else if (activeInput?.startsWith('waypoint-')) {
            const idx = parseInt(activeInput.split('-')[1]);
            const newWaypoints = [...editForm.waypoints];
            if (newWaypoints[idx]) {
              newWaypoints[idx] = {
                ...newWaypoints[idx],
                address,
                coords: { lat: mapCenter.lat, lng: mapCenter.lng }
              };
              setEditForm(prev => ({ ...prev, waypoints: newWaypoints }));
              setWaypointCoords(newWaypoints.map(w => w.coords!).filter(c => !!c));
            }
          }
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isPanning, activeInput, mapCenter, isMapSelecting, isEditing, editForm.waypoints, setPickupCoords, setDropoffCoords, setWaypointCoords]);

  const handleInputChange = async (type: 'pickup' | 'dropoff' | 'waypoint', value: string, index?: number) => {
    if (type === 'pickup') {
      setEditForm(prev => ({ ...prev, pickup: value }));
      if (value.length > 2) {
        const results = await mapService.getSuggestions(value);
        setPickupSuggestions(results);
        setShowPickupSuggestions(true);
      } else {
        setPickupSuggestions([]);
        setShowPickupSuggestions(false);
      }
    } else if (type === 'dropoff') {
      setEditForm(prev => ({ ...prev, dropoff: value }));
      if (value.length > 2) {
        const results = await mapService.getSuggestions(value);
        setDropoffSuggestions(results);
        setShowDropoffSuggestions(true);
      } else {
        setDropoffSuggestions([]);
        setShowDropoffSuggestions(false);
      }
    } else if (type === 'waypoint' && index !== undefined) {
      const newWps = [...editForm.waypoints];
      if (newWps[index]) {
        newWps[index].address = value;
        setEditForm(prev => ({ ...prev, waypoints: newWps }));
        if (value.length > 2) {
          const results = await mapService.getSuggestions(value);
          setDropoffSuggestions(results); // Reuse results bank
          setShowDropoffSuggestions(true);
          setActiveWaypointIndex(index);
        } else {
          setShowDropoffSuggestions(false);
        }
      }
    }
  };

  const addWaypoint = () => {
    if (editForm.waypoints.length >= 5) {
      return;
    }
    const id = Math.random().toString(36).substr(2, 9);
    const verificationCode = Math.floor(1000 + Math.random() * 9000).toString();
    setEditForm(prev => ({
      ...prev,
      waypoints: [...prev.waypoints, { id, address: '', coords: null, verificationCode }]
    }));
  };

  const removeWaypoint = (id: string) => {
    setEditForm(prev => ({
      ...prev,
      waypoints: prev.waypoints.filter(w => w.id !== id)
    }));
  };

  const handleSuggestionSelect = async (type: 'pickup' | 'dropoff' | 'waypoint', suggestion: { label: string, lat: number, lng: number }) => {
    let coords = { lat: suggestion.lat, lng: suggestion.lng };
    if (coords.lat === 0 && coords.lng === 0) {
      const resolved = await mapService.geocodeAddress(suggestion.label);
      if (resolved) coords = { lat: resolved.lat, lng: resolved.lng };
    }

    if (type === 'pickup') {
      setEditForm(prev => ({ ...prev, pickup: suggestion.label }));
      setPickupCoords(coords);
      setShowPickupSuggestions(false);
    } else if (type === 'dropoff') {
      setEditForm(prev => ({ ...prev, dropoff: suggestion.label }));
      setDropoffCoords(coords);
      setShowDropoffSuggestions(false);
    } else if (type === 'waypoint' && activeWaypointIndex !== null) {
      const newWps = [...editForm.waypoints];
      if (newWps[activeWaypointIndex]) {
        newWps[activeWaypointIndex] = { ...newWps[activeWaypointIndex], address: suggestion.label, coords };
        setEditForm(prev => ({ ...prev, waypoints: newWps }));
        setWaypointCoords(newWps.map(w => w.coords!).filter(c => !!c));
      }
      setShowDropoffSuggestions(false);
      setActiveWaypointIndex(null);
    }
  };

  const isComplete = (stepStatus: string) => {
    const statuses = ['pending', 'driver_assigned', 'in_transit', 'delivered'];
    const currentIndex = statuses.indexOf(order.status);
    const stepIndex = statuses.indexOf(stepStatus);
    return currentIndex >= stepIndex;
  };

  // Determine if delivery has started (Driver has picked up)
  const isDeliveryStarted = order.status === 'in_transit' || order.status === 'delivered';
  const isDropoffCompleted = order.stops?.find(s => s.type === 'dropoff')?.status === 'completed';

  // Interpolation logic...
  useEffect(() => {
    if (!pickupCoords || !dropoffCoords) return;

    // Skip simulated animation if we have real driver location
    if (order.driverLocation) return;

    const shouldAnimate = order.status === 'in_transit';
    if (shouldAnimate) {
      let startTime: number | null = null;
      const duration = 30000;
      const animate = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        const lat = pickupCoords.lat + (dropoffCoords.lat - pickupCoords.lat) * progress;
        const lng = pickupCoords.lng + (dropoffCoords.lng - pickupCoords.lng) * progress;
        setDriverCoords({ lat, lng });
        const dy = dropoffCoords.lat - pickupCoords.lat;
        const dx = dropoffCoords.lng - pickupCoords.lng;
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        setDriverBearing(90 - angle);
        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          onUpdateStatus(order.id, 'delivered');
        }
      };
      animationRef.current = requestAnimationFrame(animate);
    } else if (order.status === 'driver_assigned') {
      setDriverCoords(pickupCoords);
    } else if (order.status === 'delivered') {
      setDriverCoords(dropoffCoords);
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [order.status, pickupCoords, dropoffCoords, setDriverCoords, setDriverBearing, onUpdateStatus, order.id]);

  const handleSaveEdits = async () => {
    // 1. Map waypoints from editForm, preserving codes and status
    const updatedWaypoints = editForm.waypoints.map((w, idx) => {
      const existingStop = order.stops?.find(s => s.id === w.id);
      return {
        id: w.id,
        address: w.address,
        lat: w.coords?.lat || 0,
        lng: w.coords?.lng || 0,
        type: 'waypoint' as const,
        status: existingStop?.status || 'pending',
        verificationCode: w.verificationCode || existingStop?.verificationCode || Math.floor(1000 + Math.random() * 9000).toString(),
        sequenceOrder: idx + 1
      };
    });

    // 2. Find or create the final dropoff stop
    const existingDropoff = order.stops?.find(s => s.type === 'dropoff');
    const finalDropoff = {
      id: existingDropoff?.id || 'dropoff-end',
      address: editForm.dropoff,
      lat: dropoffCoords?.lat || 0,
      lng: dropoffCoords?.lng || 0,
      type: 'dropoff' as const,
      status: existingDropoff?.status || 'pending',
      verificationCode: existingDropoff?.verificationCode || order.verificationCode || Math.floor(1000 + Math.random() * 9000).toString(),
      sequenceOrder: updatedWaypoints.length + 1
    };

    // 3. Combine them
    const allStops = [...updatedWaypoints, finalDropoff];

    await onUpdateOrder(order.id, {
      recipient: {
        ...order.recipient,
        name: editForm.recipientName,
        phone: editForm.recipientPhone,
        idNumber: editForm.recipientId
      },
      items: {
        ...order.items,
        description: editForm.itemDesc,
        weightKg: editForm.weightKg,
        fragile: editForm.fragile,
        handlingNotes: editForm.handlingNotes
      },
      pickup: editForm.pickup,
      dropoff: editForm.dropoff,
      pickupCoords: pickupCoords || undefined,
      dropoffCoords: dropoffCoords || undefined,
      vehicle: editForm.vehicle,
      serviceType: editForm.serviceType,
      price: priceQuote,
      pickupTime: editForm.isScheduled ? editForm.pickupTime : 'ASAP',
      stops: allStops,
      verificationCode: finalDropoff.verificationCode
    });
    setIsEditing(false);
  };

  const getVehicleIcon = (type: string) => {
    if (type === VehicleType.BODA) return Bike;
    if (type === VehicleType.TUKTUK) return Car;
    return Truck;
  };

  const vehicleOptions = [
    { type: VehicleType.BODA, icon: Bike, label: 'Motorbike', desc: 'Small packages & docs', maxWeight: '10kg', maxDist: 150 },
    { type: VehicleType.TUKTUK, icon: Car, label: 'Tuk-Tuk', desc: 'Medium items & boxes', maxWeight: '100kg', maxDist: 100 },
    { type: VehicleType.PICKUP, icon: Truck, label: 'Pickup Truck', desc: 'Furniture & Appliances', maxWeight: '1000kg', maxDist: 1000 },
    { type: VehicleType.VAN, icon: Truck, label: 'Cargo Van', desc: 'Large item moves', maxWeight: '2000kg', maxDist: 1000 },
    { type: VehicleType.LORRY, icon: Truck, label: '3T Lorry', desc: 'Commercial loads', maxWeight: '3000kg', maxDist: 2000 },
    { type: VehicleType.TRAILER, icon: Truck, label: 'Container', desc: 'Heavy Freight', maxWeight: '28000kg', maxDist: 5000 },
  ];

  const serviceOptions = [
    { type: ServiceType.EXPRESS, icon: Zap, label: 'Express', desc: 'Direct Dispatch', color: 'text-brand-600', bg: 'bg-brand-50' },
    { type: ServiceType.STANDARD, icon: Rocket, label: 'Standard', desc: 'Same Day Delivery', color: 'text-blue-600', bg: 'bg-blue-50' },
    { type: ServiceType.ECONOMY, icon: Shield, label: 'Economy', desc: 'Next Day Delivery', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  const VehicleIcon = getVehicleIcon(order.vehicle);

  return (
    <div className="flex-grow flex flex-col justify-end pointer-events-none p-4 pb-0 overflow-hidden h-full">

      <div className="pointer-events-auto w-full max-w-2xl mx-auto pb-[env(safe-area-inset-bottom,0px)]">

        {/* Main Collapsible Card - Professional Bottom Sheet (75% max when expanded) */}
        <div
          className={`bg-white backdrop-blur-2xl rounded-t-[2rem] shadow-[0_-8px_30px_rgba(0,0,0,0.12)] border-t border-x border-gray-200 overflow-hidden transition-all duration-500 transform ${isCollapsed ? (isMapSelecting ? 'max-h-[200px]' : 'max-h-[140px]') : 'max-h-[75vh] overflow-y-auto no-scrollbar'}`}
        >
          {/* Drawer Handle / Drag Zone */}
          <div
            className="w-full flex justify-center py-4 cursor-grab active:cursor-grabbing group sticky top-0 bg-white/70 backdrop-blur-xl border-b border-white/20 z-20"
            onClick={() => setIsCollapsed(!isCollapsed)}
            onMouseDown={(e) => dragStartY.current = e.clientY}
            onMouseMove={(e) => {
              if (dragStartY.current !== null) {
                const diff = e.clientY - dragStartY.current;
                if (diff > 50 && !isCollapsed) setIsCollapsed(true);
                if (diff < -50 && isCollapsed) setIsCollapsed(false);
              }
            }}
            onMouseUp={() => dragStartY.current = null}
            onTouchStart={(e) => dragStartY.current = e.touches[0].clientY}
            onTouchMove={(e) => {
              if (dragStartY.current !== null) {
                const diff = e.touches[0].clientY - dragStartY.current;
                if (diff > 50 && !isCollapsed) setIsCollapsed(true);
                if (diff < -50 && isCollapsed) setIsCollapsed(false);
              }
            }}
            onTouchEnd={() => dragStartY.current = null}
          >
            <div className="flex flex-col items-center w-full px-6">
              <div className="w-12 h-1.5 bg-gray-300/50 rounded-full group-hover:bg-gray-400/50 transition-colors mb-2" />
              {!isCollapsed && (
                <div className="absolute right-6 top-3 animate-in fade-in zoom-in-95 flex flex-col items-end">
                  <div className="bg-brand-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter shadow-lg shadow-brand-200 border border-brand-500">
                    KES {(isEditing ? priceQuote : order.price).toLocaleString()}
                  </div>
                  <span className="text-[8px] font-black text-brand-600 uppercase tracking-tighter mt-1 bg-brand-50 px-1.5 py-0.5 rounded border border-brand-100">
                    {order.status === 'delivered' ? 'Delivered' :
                      (() => {
                        const now = new Date();
                        let arrival: Date;
                        if (order.remainingDuration) {
                          arrival = new Date(now.getTime() + order.remainingDuration * 1000);
                        } else {
                          const mins = parseInt(order.estimatedDuration?.split(' ')[0] || '30');
                          arrival = new Date(now.getTime() + mins * 60 * 1000);
                        }
                        const timeOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
                        const dateOptions: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
                        return `ETA: ${arrival.toLocaleTimeString([], timeOptions)}, ${arrival.toLocaleDateString([], dateOptions)}`;
                      })()}
                  </span>
                </div>
              )}
              {isCollapsed && (
                isMapSelecting ? (
                  <div className="bg-brand-50 rounded-[2rem] shadow-2xl p-5 flex items-center justify-between w-full animate-in slide-in-from-bottom-4 duration-500 border border-brand-100">
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center space-x-2 mb-1">
                        <div className={`w-2 h-2 rounded-full ${activeInput === 'pickup' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <p className="text-[10px] font-black text-brand-600 uppercase tracking-widest">
                          Confirm {activeInput === 'pickup' ? 'Pickup' : 'Delivery'}
                        </p>
                      </div>
                      <p className="text-gray-900 font-black truncate text-sm">
                        {activeInput === 'pickup' ? (editForm.pickup || "Locating...") : (editForm.dropoff || "Locating...")}
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
                  <div className="flex items-center justify-between w-full animate-in fade-in slide-in-from-bottom-2 px-2">
                    <div className="flex items-center space-x-3 overflow-hidden flex-1">
                      <div className="flex flex-col min-w-0 w-full">
                        <div className="flex items-center space-x-2 w-full overflow-hidden">
                          <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></div>
                          <span className="text-[10px] sm:text-xs font-bold text-gray-700 truncate max-w-[60px] sm:max-w-[120px]">{order.pickup}</span>

                          {order.stops && order.stops.length > 1 && (
                            <>
                              <ArrowRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                              <div className="w-2 h-2 rounded-full bg-brand-400 flex-shrink-0"></div>
                              <span className="text-[10px] sm:text-xs font-bold text-gray-700 truncate max-w-[60px] sm:max-w-[100px]">
                                {order.stops[0].address}
                              </span>
                              {order.stops.length > 2 && (
                                <span className="text-[10px] font-black text-gray-400 flex-shrink-0">...</span>
                              )}
                            </>
                          )}

                          <ArrowRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0"></div>
                          <span className="text-[10px] sm:text-xs font-bold text-gray-700 truncate max-w-[60px] sm:max-w-[120px]">{order.dropoff}</span>
                        </div>

                        <div className="flex items-center space-x-2 mt-1.5 w-full overflow-hidden">
                          <span className="text-xs font-black text-gray-900 truncate max-w-[150px] sm:max-w-[300px]">
                            {order.items?.description || (order as any).itemDescription || 'Package'}
                          </span>
                          <span className="text-gray-300">•</span>
                          <span className="text-[10px] font-black text-brand-600 whitespace-nowrap">KES {order.price.toLocaleString()}</span>
                        </div>

                        {order.status !== 'delivered' && order.status !== 'cancelled' && (
                          <div className="flex items-center space-x-2 mt-1 w-full overflow-hidden">
                            <div className="flex items-center space-x-1 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 flex-shrink-0">
                              {(() => {
                                const VIcon = getVehicleIcon(order.vehicle);
                                return <VIcon className="w-2.5 h-2.5 text-gray-500" />;
                              })()}
                              <span className="text-[9px] font-bold text-gray-600 uppercase tracking-tighter">
                                {order.vehicle?.split(' ')[0]}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1 flex-shrink-0">
                              <Clock className="w-2.5 h-2.5 text-brand-500" />
                              <span className="text-[9px] font-black text-brand-600 uppercase tracking-tighter whitespace-nowrap">
                                {(() => {
                                  const now = new Date();
                                  let arrival: Date;
                                  if (order.remainingDuration) {
                                    arrival = new Date(now.getTime() + order.remainingDuration * 1000);
                                  } else {
                                    const mins = parseInt(order.estimatedDuration?.split(' ')[0] || '30');
                                    arrival = new Date(now.getTime() + mins * 60 * 1000);
                                  }
                                  const timeOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
                                  const dateOptions: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
                                  return `${arrival.toLocaleTimeString([], timeOptions)}, ${arrival.toLocaleDateString([], dateOptions)}`;
                                })()}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0 ml-4 flex flex-col items-end space-y-2">
                      <span className={`text-[8px] font-black px-2 py-1 rounded-md uppercase tracking-widest border shadow-sm ${order.status === 'delivered' ? 'bg-emerald-500 text-white border-emerald-400' :
                        order.status === 'cancelled' ? 'bg-red-500 text-white border-red-400' :
                          'bg-brand-600 text-white border-brand-500'
                        }`}>
                        {order.status === 'driver_assigned' ? 'Pickup' :
                          order.status === 'in_transit' ? 'Delivering' :
                            order.status.replace('_', ' ')}
                      </span>
                      <ChevronUp className="w-4 h-4 text-gray-400 animate-bounce" />
                    </div>
                  </div>
                )
              )}
            </div>
          </div>

          <div className="px-8 pb-8 space-y-6 transition-opacity duration-300">

            {isEditing ? (
              <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <h3 className="text-2xl font-extrabold text-gray-900">Edit Details</h3>
                    {priceQuote > 0 && (
                      <div className="bg-brand-50 text-brand-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter shadow-sm border border-brand-100 animate-in zoom-in-95">
                        KES {priceQuote.toLocaleString()}
                      </div>
                    )}
                  </div>
                  <button onClick={() => {
                    setIsEditing(false);
                    setIsMapSelecting(false);
                  }} className="text-gray-400 hover:text-gray-600 font-bold">Cancel</button>
                </div>
                <div className="space-y-4">
                  {/* Locations at the top */}

                  {/* Pickup Location */}
                  <div className="relative">
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-2 ml-2">Pickup Location</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={editForm.pickup}
                        onChange={(e) => handleInputChange('pickup', e.target.value)}
                        onFocus={() => setActiveInput('pickup')}
                        disabled={isDeliveryStarted}
                        className={`w-full bg-white border border-gray-200 shadow-sm rounded-2xl py-4 pl-6 pr-24 text-gray-900 focus:ring-brand-500 ${isDeliveryStarted ? 'opacity-50 cursor-not-allowed' : ''}`}
                        placeholder="Pickup location"
                      />
                      {!isDeliveryStarted && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center space-x-1">
                          <button
                            onClick={() => {
                              setActiveInput('pickup');
                              const nextState = !isMapSelecting;
                              setIsMapSelecting(nextState);
                              if (nextState) {
                                setIsCollapsed(true);
                                if (pickupCoords) setMapCenter(pickupCoords.lat, pickupCoords.lng);
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
                                  setEditForm(prev => ({ ...prev, pickup: address }));
                                  setPickupCoords(coords);
                                }
                              }
                            }}
                            className="p-2 bg-white hover:bg-gray-50 rounded-xl text-brand-600 transition-all shadow-sm active:scale-95"
                            title="Use Current Location"
                          >
                            <Navigation className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </div>
                    {!isDeliveryStarted && (
                      <div className="flex gap-2 mt-2 px-2">
                        <button
                          onClick={async () => {
                            const coords = await requestUserLocation();
                            if (coords) {
                              setPickupCoords(coords);
                              const address = await mapService.reverseGeocode(coords.lat, coords.lng);
                              if (address) setEditForm(prev => ({ ...prev, pickup: address }));
                            }
                          }}
                          className="flex items-center space-x-1 px-3 py-1 bg-white border border-gray-200 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-600 hover:text-brand-600 hover:border-brand-200 transition-all shadow-sm"
                        >
                          <Navigation className="w-3 h-3" /> <span>Current Location</span>
                        </button>
                        <button
                          onClick={async () => {
                            const loc = "Nairobi, Kenya";
                            setEditForm(prev => ({ ...prev, pickup: loc }));
                            const coords = await mapService.geocodeAddress(loc);
                            if (coords) setPickupCoords(coords);
                          }}
                          className="flex items-center space-x-1 px-3 py-1 bg-white border border-gray-200 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-600 hover:text-brand-600 hover:border-brand-200 transition-all shadow-sm"
                        >
                          <MapPin className="w-3 h-3" /> <span>Nairobi</span>
                        </button>
                      </div>
                    )}
                    {isMapSelecting && activeInput === 'pickup' && (
                      <div className="absolute right-14 top-10 text-[8px] font-extrabold text-green-500 animate-pulse uppercase tracking-tighter">Drag Map to adjust</div>
                    )}

                    {/* Pickup Suggestions */}
                    {showPickupSuggestions && pickupSuggestions.length > 0 && !isDeliveryStarted && (
                      <div className="absolute z-[100] left-0 right-0 mt-2 bg-white rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-2">
                        {pickupSuggestions.map((s, i) => (
                          <button
                            key={i}
                            onClick={() => handleSuggestionSelect('pickup', s)}
                            className="w-full px-6 py-4 text-left hover:bg-brand-50 flex items-center space-x-3 border-b border-gray-50 last:border-none group"
                          >
                            <div className="bg-gray-100 p-2 rounded-lg group-hover:bg-white transition-colors">
                              <MapPin className="w-4 h-4 text-gray-400 group-hover:text-brand-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-gray-700 truncate">{s.label.split(',')[0]}</p>
                              <p className="text-[10px] text-gray-400 font-medium truncate">{s.label.split(',').slice(1).join(',').trim()}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* --- Waypoints Section --- */}
                  <div className="relative ml-6 space-y-4 border-l-2 border-dashed border-gray-200 pl-6 py-2">
                    {editForm.waypoints.map((wp, idx) => {
                      const isCompleted = wp.status === 'completed';
                      return (
                        <div key={wp.id} className="relative animate-in slide-in-from-left-4 duration-300">
                          <div className={`absolute -left-[31px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 ${isCompleted ? 'border-emerald-500 bg-emerald-50' : 'border-brand-400'} z-10`}>
                            {isCompleted && <CheckCircle className="w-full h-full text-emerald-500 p-0.5" />}
                          </div>
                          <div className="relative group/wp">
                            <input
                              type="text"
                              value={wp.address}
                              disabled={isCompleted}
                              onChange={(e) => handleInputChange('waypoint', e.target.value, idx)}
                              onFocus={() => {
                                setActiveInput(`waypoint-${idx}`);
                                setActiveWaypointIndex(idx);
                                setIsMapSelecting(false);
                              }}
                              className={`w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pl-4 pr-24 text-sm font-bold text-gray-700 placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-brand-500/10 transition-all ${isMapSelecting && activeInput === `waypoint-${idx}` ? 'ring-2 ring-brand-500' : ''} ${isCompleted ? 'opacity-60 cursor-not-allowed' : ''}`}
                              placeholder={`Drop-off ${idx + 1}...`}
                            />
                            {!isCompleted && (
                              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-1">
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
                                  className={`p-1.5 rounded-lg transition-all ${isMapSelecting && activeInput === `waypoint-${idx}` ? 'bg-brand-600 text-white' : 'text-gray-400 hover:text-brand-600'}`}
                                >
                                  <Map className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => !isDeliveryStarted && removeWaypoint(wp.id)}
                                  className={`p-1.5 transition-colors ${isDeliveryStarted ? 'text-gray-100 cursor-not-allowed' : 'text-gray-300 hover:text-red-500'}`}
                                  disabled={isDeliveryStarted}
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </div>
                            )}

                            {/* Waypoint Suggestions */}
                            {showDropoffSuggestions && activeWaypointIndex === idx && !isCompleted && (
                              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-gray-100 overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2">
                                {dropoffSuggestions.map((s, sIdx) => (
                                  <button
                                    key={sIdx}
                                    onClick={() => handleSuggestionSelect('waypoint', s)}
                                    className="w-full p-4 text-left hover:bg-brand-50 flex items-center gap-3 border-b border-gray-50 last:border-none group"
                                  >
                                    <div className="bg-gray-100 p-2 rounded-lg group-hover:bg-white transition-colors">
                                      <MapPin className="w-4 h-4 text-gray-400 group-hover:text-brand-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-bold text-gray-700 truncate">{s.label.split(',')[0]}</p>
                                      <p className="text-[10px] text-gray-400 font-medium truncate">{s.label.split(',').slice(1).join(',').trim()}</p>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {editForm.waypoints.length < 5 && !isDeliveryStarted && (
                      <button
                        onClick={addWaypoint}
                        className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-brand-600 hover:bg-brand-50 transition-all shadow-sm active:scale-95"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Drop-off</span>
                      </button>
                    )}
                  </div>

                  {/* Dropoff Location */}
                  <div className="relative">
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-2 ml-2">Dropoff Location</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={editForm.dropoff}
                        disabled={isDropoffCompleted}
                        onChange={(e) => handleInputChange('dropoff', e.target.value)}
                        onFocus={() => setActiveInput('dropoff')}
                        className={`w-full bg-white border border-gray-200 shadow-sm rounded-2xl py-4 pl-6 pr-24 text-gray-900 focus:ring-brand-500 ${isDropoffCompleted ? 'opacity-60 cursor-not-allowed' : ''}`}
                        placeholder="Where to?"
                      />
                      {!isDropoffCompleted && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center space-x-1">
                          <button
                            onClick={() => {
                              setActiveInput('dropoff');
                              const nextState = !isMapSelecting;
                              setIsMapSelecting(nextState);
                              if (nextState) {
                                setIsCollapsed(true);
                                if (dropoffCoords) setMapCenter(dropoffCoords.lat, dropoffCoords.lng);
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
                                  setEditForm(prev => ({ ...prev, dropoff: address }));
                                  setDropoffCoords(coords);
                                }
                              }
                            }}
                            className="p-2 bg-white hover:bg-gray-50 rounded-xl text-brand-600 transition-all shadow-sm active:scale-95"
                            title="Use Current Location"
                          >
                            <Navigation className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </div>
                    {/* Quick Destinations */}
                    {!isDropoffCompleted && (
                      <div className="flex flex-wrap gap-2 mt-2 px-2">
                        {historyDestinations.length > 0 ? (
                          historyDestinations.map((dest) => (
                            <button
                              key={dest}
                              onClick={async () => {
                                setEditForm(prev => ({ ...prev, dropoff: dest }));
                                const coords = await mapService.geocodeAddress(dest);
                                if (coords) {
                                  setDropoffCoords(coords);
                                  fitBounds([coords]);
                                }
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-100 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-brand-600 hover:border-brand-200 transition-all shadow-sm active:scale-95"
                            >
                              <MapPin className="w-3 h-3 text-brand-500" />
                              <span>{dest.split(',')[0]}</span>
                            </button>
                          ))
                        ) : (
                          ['Nairobi', 'Mombasa', 'Ruiru', 'Kisumu'].map((loc) => (
                            <button
                              key={loc}
                              onClick={async () => {
                                const fullLoc = `${loc}, Kenya`;
                                setEditForm(prev => ({ ...prev, dropoff: fullLoc }));
                                const coords = await mapService.geocodeAddress(fullLoc);
                                if (coords) {
                                  setDropoffCoords(coords);
                                  fitBounds([coords]);
                                }
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-100 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-brand-600 hover:border-brand-200 transition-all shadow-sm active:scale-95"
                            >
                              <MapPin className="w-3 h-3 text-brand-500" />
                              <span>{loc}</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                    {isMapSelecting && activeInput === 'dropoff' && (
                      <div className="absolute right-14 top-10 text-[8px] font-extrabold text-green-500 animate-pulse uppercase tracking-tighter">Drag Map to adjust</div>
                    )}

                    {/* Dropoff Suggestions */}
                    {showDropoffSuggestions && dropoffSuggestions.length > 0 && activeWaypointIndex === null && (
                      <div className="absolute z-[100] left-0 right-0 mt-2 bg-white rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-2">
                        {dropoffSuggestions.map((s, i) => (
                          <button
                            key={i}
                            onClick={() => handleSuggestionSelect('dropoff', s)}
                            className="w-full px-6 py-4 text-left hover:bg-brand-50 flex items-center space-x-3 border-b border-gray-50 last:border-none group"
                          >
                            <div className="bg-gray-100 p-2 rounded-lg group-hover:bg-white transition-colors">
                              <MapPin className="w-4 h-4 text-gray-400 group-hover:text-brand-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-gray-700 truncate">{s.label.split(',')[0]}</p>
                              <p className="text-[10px] text-gray-400 font-medium truncate">{s.label.split(',').slice(1).join(',').trim()}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>


                  {/* Vehicle Selection */}
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-gray-600 uppercase ml-2">Select Vehicle</label>
                    <div
                      ref={vehicleScrollRef}
                      className="flex gap-4 overflow-x-auto no-scrollbar py-6 snap-x touch-pan-x -mx-8 px-8 cursor-grab"
                    >
                      {vehicleOptions
                        .filter(v => {
                          const distKm = distance / 1000;
                          const lowerDesc = editForm.itemDesc.toLowerCase();

                          // Force bigger vehicles for distance
                          if (v.maxDist && distKm > v.maxDist) return false;

                          // Logistics Rule: Heavy items don't go on Bodas/Tuktuks
                          if ((lowerDesc.includes('cargo') || lowerDesc.includes('gunia') || lowerDesc.includes('sack') || lowerDesc.includes('heavy') || lowerDesc.includes('furniture') || lowerDesc.includes('container') || lowerDesc.includes('90kg')) &&
                            (v.type === VehicleType.BODA || v.type === VehicleType.TUKTUK)) {
                            return false;
                          }

                          return true;
                        })
                        .map((v) => (
                          <button
                            key={v.type}
                            disabled={isDeliveryStarted}
                            onClick={() => setEditForm(prev => ({ ...prev, vehicle: v.type }))}
                            className={`flex-shrink-0 flex flex-col items-center p-6 rounded-[2.2rem] border-2 transition-all min-w-[140px] snap-start relative ${editForm.vehicle === v.type ? 'bg-white border-brand-600 shadow-xl scale-105 z-10' : 'bg-gray-50/50 border-gray-100 text-gray-400 grayscale hover:grayscale-0'} ${isDeliveryStarted ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <div className={`p-2 rounded-xl mb-3 ${editForm.vehicle === v.type ? 'bg-brand-600 text-white' : 'bg-white text-gray-300 border border-gray-100'}`}>
                              <v.icon className="w-5 h-5" />
                            </div>
                            <div className="text-center">
                              <p className={`text-[11px] font-black uppercase tracking-tight leading-none mb-1 ${editForm.vehicle === v.type ? 'text-gray-900' : 'text-gray-500'}`}>{v.label}</p>
                              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{v.maxWeight}</p>
                            </div>
                            {editForm.vehicle === v.type && (
                              <div className="absolute -top-1.5 -right-1.5 bg-brand-600 text-white p-1 rounded-full shadow-lg">
                                <CheckCircle className="w-3 h-3" />
                              </div>
                            )}
                          </button>
                        ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Delivery Plan</p>
                    <div className="bg-gray-100 p-1.5 rounded-[1.8rem] flex gap-1">
                      {serviceOptions.map((s) => (
                        <button
                          key={s.type}
                          disabled={isDeliveryStarted}
                          onClick={() => setEditForm(prev => ({ ...prev, serviceType: s.type }))}
                          className={`flex-1 flex flex-col items-center py-4 rounded-2xl transition-all relative ${editForm.serviceType === s.type ? 'bg-white shadow-xl text-brand-600 scale-[1.02] z-10' : 'text-gray-400 hover:text-gray-600'} ${isDeliveryStarted ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <s.icon className={`w-4 h-4 mb-1.5 ${editForm.serviceType === s.type ? 'text-brand-600' : 'text-gray-400'}`} />
                          <span className="text-[9px] font-black uppercase tracking-widest">{s.label.split(' ')[0]}</span>
                          <span className="text-[7px] font-bold uppercase opacity-60 tracking-tighter">
                            {s.type === ServiceType.EXPRESS ? 'Instant' : s.type === ServiceType.STANDARD ? 'Same Day' : 'Next Day'}
                          </span>
                        </button>
                      ))}
                    </div>

                    <div className="bg-brand-50/50 p-5 rounded-3xl border border-brand-100 animate-in fade-in slide-in-from-top-2">
                      <div className="flex items-start space-x-3">
                        <div className="p-2 bg-white rounded-xl shadow-sm">
                          {editForm.serviceType === ServiceType.EXPRESS ? <Zap className="w-4 h-4 text-brand-600" /> : editForm.serviceType === ServiceType.STANDARD ? <Rocket className="w-4 h-4 text-brand-600" /> : <Shield className="w-4 h-4 text-brand-600" />}
                        </div>
                        <div className="flex-1">
                          <p className="text-[10px] font-black text-gray-900 uppercase tracking-tight">
                            {editForm.serviceType === ServiceType.EXPRESS ? 'Express Instant' : editForm.serviceType === ServiceType.STANDARD ? 'Standard Delivery' : 'Economy Delivery'}
                          </p>
                          <p className="text-[8px] text-gray-500 font-bold uppercase leading-tight mt-1 tracking-tight">
                            {editForm.serviceType === ServiceType.EXPRESS
                              ? 'Direct dispatch. Ideal for urgent documents or hot meals.'
                              : editForm.serviceType === ServiceType.STANDARD
                                ? 'Reliability meets value. Best for wholesale and retail stock.'
                                : 'Our most affordable rate. Tailored for bulky freight.'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Calendar className={`w-4 h-4 ${editForm.isScheduled ? 'text-brand-500' : 'text-gray-400'}`} />
                          <span className={`text-xs font-black uppercase tracking-widest ${editForm.isScheduled ? 'text-gray-900' : 'text-gray-400'}`}>Schedule Pickup</span>
                        </div>
                        <button
                          disabled={isDeliveryStarted}
                          onClick={() => setEditForm(prev => ({ ...prev, isScheduled: !prev.isScheduled }))}
                          className={`w-10 h-6 rounded-full transition-colors relative ${editForm.isScheduled ? 'bg-brand-600' : 'bg-gray-200'} ${isDeliveryStarted ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${editForm.isScheduled ? 'right-1' : 'left-1'}`}></div>
                        </button>
                      </div>
                      {editForm.isScheduled && (
                        <div className="flex items-center space-x-3 bg-white p-4 rounded-[1.5rem] border border-gray-200 shadow-sm animate-in fade-in slide-in-from-top-2">
                          <Clock className="w-5 h-5 text-brand-600" />
                          <input
                            type="datetime-local"
                            disabled={isDeliveryStarted}
                            value={editForm.pickupTime}
                            onChange={(e) => setEditForm(prev => ({ ...prev, pickupTime: e.target.value }))}
                            className="text-lg font-black text-gray-900 bg-transparent border-none p-0 focus:ring-0 w-full"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Item Description - Matches BookingForm placement */}
                  <div className="space-y-4">
                    <div className="relative group">
                      <label className="block text-xs font-bold text-gray-600 uppercase mb-2 ml-2">Item Description</label>
                      <Box className="absolute left-4 top-12 text-brand-600 w-5 h-5 pointer-events-none group-focus-within:scale-110 transition-transform" />
                      <textarea
                        value={editForm.itemDesc}
                        onChange={e => setEditForm(prev => ({ ...prev, itemDesc: e.target.value }))}
                        disabled={isDeliveryStarted}
                        className={`w-full bg-white border border-gray-100 shadow-sm rounded-3xl py-4 pl-12 pr-6 text-gray-900 font-bold focus:ring-brand-500 min-h-[100px] transition-all text-lg ${isDeliveryStarted ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'hover:border-brand-200 focus:ring-2 focus:ring-brand-500/20'}`}
                        placeholder="What are we moving?"
                      />
                    </div>

                    {/* Quick Fill Items */}
                    <div className="flex flex-wrap gap-2 px-1">
                      {historyItems.map(item => (
                        <button
                          key={item}
                          disabled={isDeliveryStarted}
                          onClick={() => setEditForm(prev => ({ ...prev, itemDesc: prev.itemDesc ? `${prev.itemDesc}, ${item}` : item }))}
                          className="px-3 py-1.5 bg-white border border-gray-100 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-500 hover:border-brand-300 hover:text-brand-600 transition-all shadow-sm"
                        >
                          + {item}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Fragile & Handling Notes */}
                  <div className="bg-orange-50/50 rounded-2xl p-4 border border-orange-100 space-y-3 mt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="w-5 h-5 text-orange-500" />
                        <span className="text-sm font-black text-gray-900 uppercase tracking-wide">Fragile Item?</span>
                      </div>
                      <button
                        onClick={() => setEditForm(prev => ({ ...prev, fragile: !prev.fragile }))}
                        disabled={isDeliveryStarted}
                        className={`relative w-12 h-6 rounded-full transition-colors duration-200 ease-in-out ${editForm.fragile ? 'bg-orange-500' : 'bg-gray-200'} ${isDeliveryStarted ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <span className={`block w-4 h-4 rounded-full bg-white shadow transform transition-transform duration-200 ease-in-out ${editForm.fragile ? 'translate-x-7' : 'translate-x-1'}`} />
                      </button>
                    </div>

                    {editForm.fragile && (
                      <div className="animate-in fade-in slide-in-from-top-2">
                        <textarea
                          value={editForm.handlingNotes}
                          onChange={(e) => setEditForm(prev => ({ ...prev, handlingNotes: e.target.value }))}
                          disabled={isDeliveryStarted}
                          className="w-full bg-white border border-orange-200 rounded-xl py-3 px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all min-h-[80px]"
                          placeholder="Add handling instructions (e.g. Do not stack, Keep upright)..."
                        />
                      </div>
                    )}
                  </div>

                  {/* Weight Input */}
                  <div className="relative mt-4">
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-2 ml-2">Approx. Weight (kg)</label>
                    <div className="absolute left-4 top-10 flex items-center pointer-events-none">
                      <Scale className="w-5 h-5 text-gray-400" />
                    </div>
                    <input
                      type="number"
                      value={editForm.weightKg}
                      disabled={isDeliveryStarted}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setEditForm(prev => {
                          const newState = { ...prev, weightKg: val };

                          if (val > 0) {
                            const suitable = vehicleOptions.find(v => {
                              const max = parseInt(v.maxWeight.replace('kg', ''));
                              return val <= max;
                            });

                            if (suitable) {
                              newState.vehicle = suitable.type;
                            } else {
                              const largest = vehicleOptions[vehicleOptions.length - 1];
                              newState.vehicle = largest.type;
                            }
                          }
                          return newState;
                        });
                      }}
                      className="w-full bg-white border border-gray-100 rounded-2xl py-3 pl-12 pr-4 text-gray-900 font-bold focus:ring-2 focus:ring-brand-500/20"
                      placeholder="Approx. Weight (kg)"
                    />
                  </div>

                  {/* Recipient Details at the bottom */}
                  <div className="bg-brand-50/30 rounded-[2rem] p-6 border border-brand-100/50 space-y-4">
                    <div className="flex items-center space-x-2 px-2">
                      <div className="w-1.5 h-4 bg-brand-600 rounded-full"></div>
                      <p className="text-xs font-black text-brand-600 uppercase tracking-widest">Recipient Details</p>
                    </div>
                    <div className="space-y-3">
                      <div className="relative">
                        <label className="block text-[10px] font-bold text-brand-400 uppercase mb-1 ml-2">Recipient Name</label>
                        <div className="absolute left-4 top-9 flex items-center pointer-events-none">
                          <User className="w-4 h-4 text-brand-500" />
                        </div>
                        <input
                          type="text"
                          placeholder="Recipient Name"
                          value={editForm.recipientName}
                          onChange={e => setEditForm(prev => ({ ...prev, recipientName: e.target.value }))}
                          className="w-full bg-white border-none rounded-2xl py-4 pl-10 pr-4 text-gray-900 focus:ring-brand-500 text-sm shadow-sm font-black uppercase tracking-widest placeholder:text-gray-300"
                        />
                      </div>
                      <div className="relative">
                        <label className="block text-[10px] font-bold text-brand-400 uppercase mb-1 ml-2">Recipient Phone</label>
                        <div className="absolute left-4 top-9 flex items-center pointer-events-none">
                          <Phone className="w-4 h-4 text-brand-500" />
                        </div>
                        <input
                          type="tel"
                          placeholder="Recipient Phone"
                          value={editForm.recipientPhone}
                          onChange={e => setEditForm(prev => ({ ...prev, recipientPhone: e.target.value }))}
                          className="w-full bg-white border-none rounded-2xl py-4 pl-10 pr-4 text-gray-900 focus:ring-brand-500 text-sm shadow-sm font-black uppercase tracking-widest placeholder:text-gray-300"
                        />
                      </div>
                      <div className="relative">
                        <label className="block text-[10px] font-bold text-brand-400 uppercase mb-1 ml-2">Recipient ID / PIN</label>
                        <div className="absolute left-4 top-9 flex items-center pointer-events-none">
                          <CreditCard className="w-4 h-4 text-brand-500" />
                        </div>
                        <input
                          type="text"
                          placeholder="Recipient ID"
                          value={editForm.recipientId}
                          onChange={e => setEditForm(prev => ({ ...prev, recipientId: e.target.value }))}
                          className="w-full bg-white border-none rounded-2xl py-4 pl-10 pr-4 text-gray-900 focus:ring-brand-500 text-sm shadow-sm font-black uppercase tracking-widest placeholder:text-gray-300"
                        />
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleSaveEdits}
                    className="w-full bg-brand-600 text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-brand-700 transition-all font-black text-sm uppercase tracking-widest mt-4"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-8 animate-in fade-in duration-500">

                {/* Header Section */}
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-4">
                    <button
                      onClick={onBack}
                      className="p-3 bg-white border border-gray-100 rounded-2xl shadow-sm text-gray-400 hover:text-brand-600 hover:border-brand-100 transition-all active:scale-90 flex-shrink-0"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-2 border shadow-sm ${order.status === 'delivered' ? 'bg-emerald-500 text-white border-emerald-400' :
                        order.status === 'cancelled' ? 'bg-red-500 text-white border-red-400' :
                          order.status === 'in_transit' ? 'bg-brand-600 text-white border-brand-500' :
                            order.status === 'driver_assigned' ? 'bg-blue-600 text-white border-blue-500' :
                              'bg-amber-500 text-white border-amber-400'
                        }`}>
                        {order.status === 'driver_assigned' ? 'Heading to Pickup' :
                          order.status === 'in_transit' ? 'Delivering' :
                            order?.status?.replace('_', ' ') || 'Pending'}
                      </span>
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <button
                          onClick={() => handleCopyId(order.id)}
                          className="flex items-center space-x-2 px-2 py-1 bg-gray-50 border border-gray-100 rounded-lg font-mono text-[10px] font-bold text-gray-500 hover:border-brand-300 hover:text-brand-600 transition-all"
                          title="Click to copy Tracking ID"
                        >
                          <span>ID: {order.id}</span>
                          {copiedId === order.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 opacity-40" />}
                        </button>
                        <div className="flex items-center px-2 py-1 bg-gray-50 border border-gray-100 rounded-lg text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                          <Clock className="w-3 h-3 mr-1.5 text-brand-500" />
                          Created: {new Date(order.createdAt || order.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                        </div>
                        {order.updatedAt && order.updatedAt !== (order.createdAt || order.date) && (
                          <div className="flex items-center px-2 py-1 bg-brand-50 border border-brand-100 rounded-lg text-[10px] font-bold text-brand-600 uppercase tracking-widest">
                            <RefreshCw className="w-3 h-3 mr-1.5" />
                            Edited: {new Date(order.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                      </div>
                      <h2 className="text-5xl font-black text-brand-600 tracking-tighter animate-pulse leading-none flex items-baseline">
                        {order?.remainingDuration ? `${Math.ceil(order.remainingDuration / 60)}` : order?.estimatedDuration?.split(' ')[0] || '--'}
                        <span className="text-gray-400 text-xl font-bold ml-2">mins away</span>
                      </h2>
                      {(() => {
                        const now = new Date();
                        let arrival: Date;
                        if (order.remainingDuration) {
                          arrival = new Date(now.getTime() + order.remainingDuration * 1000);
                        } else {
                          const mins = parseInt(order.estimatedDuration?.split(' ')[0] || '30');
                          arrival = new Date(now.getTime() + mins * 60 * 1000);
                        }
                        const timeOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
                        const dateOptions: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', weekday: 'short' };
                        return (
                          <p className="text-[10px] font-black text-brand-500 uppercase mt-1 tracking-widest">
                            Estimated: {arrival.toLocaleTimeString([], timeOptions)}, {arrival.toLocaleDateString([], dateOptions)}
                          </p>
                        );
                      })()}
                      {order?.remainingDistance !== undefined && (
                        <p className="text-sm font-bold text-gray-500 mt-2 flex items-center">
                          <Navigation className="w-3.5 h-3.5 mr-1.5 text-brand-500" /> {order.remainingDistance} km remaining
                          <span className="mx-2 text-gray-300">•</span>
                          <span className="text-brand-600 uppercase text-[11px] font-black tracking-widest">
                            {order.estimatedDuration || 'FAST'}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                  {(order?.status === 'pending' || order?.status === 'driver_assigned' || order?.status === 'in_transit') && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="group flex flex-col items-center p-3 rounded-2xl bg-gray-50 border border-gray-100 text-gray-400 hover:bg-white hover:text-brand-600 hover:border-brand-200 hover:shadow-xl transition-all duration-300 active:scale-95"
                    >
                      <Map className="w-5 h-5 mb-1 group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Edit</span>
                    </button>
                  )}
                </div>

                {/* Status Visualization */}
                <div className="relative flex justify-between px-2 py-4">
                  <div className="absolute top-1/2 left-0 w-full h-1.5 bg-gray-100 -translate-y-1/2 -z-10 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-500 transition-all duration-1000" style={{ width: order?.status === 'pending' ? '12.5%' : order?.status === 'driver_assigned' ? '37.5%' : order?.status === 'in_transit' ? '62.5%' : '100%' }}></div>
                  </div>
                  {[
                    { id: 'pending', icon: Package, color: 'bg-amber-500' },
                    { id: 'driver_assigned', icon: User, color: 'bg-blue-600' },
                    { id: 'in_transit', icon: Navigation, color: 'bg-brand-600' },
                    { id: 'delivered', icon: CheckCircle, color: 'bg-emerald-500' }
                  ].map((step) => {
                    const Icon = step.icon;
                    const active = isComplete(step.id);
                    return (
                      <div key={step.id} className={`w-12 h-12 rounded-2xl flex items-center justify-center border-4 transition-all duration-500 ${active ? `${step.color} border-white shadow-xl text-white scale-110` : 'bg-gray-50 border-white text-gray-300'}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                    );
                  })}
                </div>
                {/* Multi-stop Route Overview */}
                {order.stops && order.stops.length > 0 && (
                  <div className="bg-white/70 backdrop-blur-xl border border-white/20 p-6 rounded-[2rem] space-y-4 shadow-sm">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Route Overview</h4>
                    <div className="relative space-y-6 px-2">
                      {/* Vertical Timeline Line */}
                      <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-gray-100"></div>

                      {/* Pickup */}
                      <div className="relative flex items-center space-x-4 z-10">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 shadow-sm border border-emerald-100/50">
                          <MapPin className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-tighter">Pickup</p>
                          <p className="text-xs font-black text-gray-900 truncate">{order.pickup}</p>
                        </div>
                      </div>

                      {/* Intermediate Stops */}
                      {order.stops.filter(s => s.type !== 'dropoff').map((stop, i) => (
                        <div key={stop.id} className="relative flex items-center justify-between z-10 animate-in slide-in-from-left-2" style={{ animationDelay: `${i * 100}ms` }}>
                          <div className="flex items-center space-x-4 min-w-0">
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border ${stop.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100/50' : 'bg-brand-50 text-brand-600 border-brand-100/50'}`}>
                              {stop.status === 'completed' ? <CheckCircle className="w-4 h-4" /> : <Box className="w-4 h-4" />}
                            </div>
                            <div className="min-w-0">
                              <p className={`text-[9px] font-bold uppercase tracking-tighter ${stop.status === 'completed' ? 'text-emerald-600' : 'text-gray-400'}`}>
                                Stop {i + 1} {stop.status === 'completed' && '• Completed'}
                              </p>
                              <p className="text-xs font-black text-gray-900 truncate">{stop.address}</p>
                            </div>
                          </div>
                          {stop.verificationCode && (
                            <div className="flex flex-col items-end shrink-0 ml-4 bg-brand-50/50 px-3 py-1 rounded-xl border border-brand-100/50">
                              <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Safe Code</span>
                              <span className="text-sm font-black text-brand-600 tracking-tighter">{stop.verificationCode}</span>
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Final Destination */}
                      <div className="relative flex items-center justify-between z-10">
                        <div className="flex items-center space-x-4 min-w-0">
                          <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 shadow-sm border border-red-100/50">
                            <MapPin className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[9px] font-bold text-red-600 uppercase tracking-tighter">Final Destination</p>
                            <p className="text-xs font-black text-gray-900 truncate">{order.dropoff}</p>
                          </div>
                        </div>
                        {(() => {
                          const dropoffStop = order.stops?.find(s => s.type === 'dropoff');
                          const code = dropoffStop?.verificationCode || order.verificationCode;
                          return code ? (
                            <div className="flex flex-col items-end shrink-0 ml-4 bg-brand-50/50 px-3 py-1 rounded-xl border border-brand-100/50">
                              <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Safe Code</span>
                              <span className="text-sm font-black text-brand-600 tracking-tighter">{code}</span>
                            </div>
                          ) : null;
                        })()}
                      </div>
                    </div>
                  </div>
                )}

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  {/* Driver Card */}
                  <div className="bg-brand-600 text-white p-6 rounded-[2rem] shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                      <VehicleIcon className="w-16 h-16" />
                    </div>
                    {order?.driver ? (
                      <div className="relative z-10 flex items-center space-x-4">
                        <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-2xl overflow-hidden">
                          {order.driver.avatar ? (
                            <img src={order.driver.avatar} alt={order.driver.name} className="w-full h-full object-cover" />
                          ) : (
                            '👤'
                          )}
                        </div>
                        <div>
                          <p className="text-brand-200 text-[10px] font-bold uppercase tracking-wider">Courier</p>
                          <h4 className="text-lg font-extrabold">{order.driver.name}</h4>
                          <p className="text-xs font-bold text-brand-100 opacity-80">{order.driver.plate}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="font-bold flex items-center"><Loader className="w-4 h-4 mr-2 animate-spin" /> Fetching courier...</p>
                    )}
                  </div>

                  {/* Security Card */}
                  <div className="bg-amber-50 border border-amber-100 p-6 rounded-[2rem] flex flex-col justify-center">
                    <div className="flex items-center space-x-2 mb-2">
                      <Shield className="w-4 h-4 text-amber-600" />
                      <p className="text-amber-800 text-[10px] font-bold uppercase tracking-wider">
                        {order.stops && order.stops.length > 0 ? 'Delivery Codes' : 'Delivery Code'}
                      </p>
                    </div>
                    <div className="space-y-3">
                      {order.stops && order.stops.length > 0 ? (
                        order.stops.map((stop: any, idx: number) => (
                          <div key={stop.id || idx} className="flex justify-between items-center border-b border-amber-200/50 pb-2 last:border-0 last:pb-0">
                            <div className="min-w-0 flex-1 mr-2">
                              <p className="text-[9px] font-black text-amber-700 uppercase truncate">
                                {stop.type === 'dropoff' ? 'Final Destination' : `Stop ${idx + 1}`}
                              </p>
                              <p className="text-[10px] text-amber-900/60 truncate font-bold">{stop.address}</p>
                              {stop.proofImage && (
                                <button
                                  onClick={() => window.open(stop.proofImage, '_blank')}
                                  className="text-[8px] font-black text-emerald-600 uppercase mt-1 flex items-center"
                                >
                                  <CheckCircle className="w-2 h-2 mr-1" /> View Proof
                                </button>
                              )}
                            </div>
                            <p className="text-xl font-black text-amber-900 tracking-widest">{stop.verificationCode || '----'}</p>
                          </div>
                        ))
                      ) : (
                        <div className="flex justify-between items-center">
                          <div className="min-w-0 flex-1 mr-2">
                            <p className="text-[9px] font-black text-amber-700 uppercase truncate">Final Destination</p>
                            <p className="text-[10px] text-amber-900/60 truncate font-bold">{order.dropoff}</p>
                          </div>
                          <p className="text-xl font-black text-amber-900 tracking-widest">{order.verificationCode || '----'}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Recipient & Info */}
                <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100">
                  <div className="flex justify-between items-start">
                    <div className="flex items-start space-x-3">
                      <div className="bg-white p-3 rounded-2xl shadow-sm"><User className="w-5 h-5 text-gray-400" /></div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">To</p>
                        <h4 className="font-extrabold text-gray-900">{order?.recipient?.name || 'Not specified'}</h4>
                        <p className="text-xs text-gray-500 font-medium">{order?.recipient?.phone || ''}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Items</p>
                      <h4 className="font-extrabold text-gray-900">{order?.items?.description || 'Package'}</h4>
                    </div>
                  </div>

                  {/* Fragile Warning */}
                  {order?.items?.fragile && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex items-start space-x-2">
                        <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-black text-orange-600 uppercase tracking-wide">Fragile Handling Required</p>
                          {order.items.handlingNotes && (
                            <p className="text-xs text-gray-600 mt-1 font-medium bg-white p-2 rounded-lg border border-gray-100 shadow-sm">
                              "{order.items.handlingNotes}"
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Item Image & Delivery Proof */}
                {(order?.itemImage || order?.deliveryConfirmationImage) && (
                  <div className="mt-6 grid grid-cols-2 gap-4">
                    {order.itemImage && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Item Photo</p>
                        <div className="aspect-square rounded-2xl overflow-hidden border border-gray-200">
                          <img src={order.itemImage} alt="Item" className="w-full h-full object-cover" />
                        </div>
                      </div>
                    )}
                    {order.deliveryConfirmationImage && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest">Delivery Proof</p>
                        <div className="aspect-square rounded-2xl overflow-hidden border-2 border-green-200">
                          <img src={order.deliveryConfirmationImage} alt="Proof" className="w-full h-full object-cover" />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-6 pt-6 border-t border-gray-200/50 flex justify-between items-center text-sm">
                  <p className="text-gray-400 font-bold">Total Payable</p>
                  <p className="text-brand-600 font-black text-lg">KES {(order?.price || 0).toLocaleString()}</p>
                </div>

                {/* Cancel Button - Only for early stages */}
                {(order?.status === 'pending' || order?.status === 'driver_assigned') && (
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to cancel this order?')) {
                        onUpdateStatus(order.id, 'cancelled');
                      }
                    }}
                    className="w-full flex items-center justify-center space-x-2 py-4 text-red-500 font-bold hover:bg-red-50 rounded-2xl transition-all border border-red-100"
                  >
                    <XCircle className="w-5 h-5" />
                    <span>Cancel Order</span>
                  </button>
                )}

              </div>
            )}
          </div>
        </div>
      </div>
    </div >
  );
};

export default Tracking;
