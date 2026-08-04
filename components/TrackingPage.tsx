import React, { useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Tracking from './Tracking';
import { useAuth } from '../context/AuthContext';
import { usePrompt } from '../context/PromptContext';
import { useUpdateOrderStatus, useUpdateOrder } from '../hooks/useOrders';
import { Loader, XCircle, Navigation, ArrowLeft, Search, AlertCircle, Clock, AlertTriangle } from 'lucide-react';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { DeliveryOrder } from '../types';
import { useMapState } from '@/context/MapContext';
import { mapService } from '@/services/mapService';
import { orderApi } from '../services/orderApi';

const TrackingPageContent: React.FC = () => {
    const { orderId: paramId } = useParams<{ orderId: string }>();
    const location = useLocation();
    const queryId = new URLSearchParams(location.search).get('id');
    const orderId = paramId || queryId;

    const navigate = useNavigate();
    const { user } = useAuth();
    const { showAlert } = usePrompt();
    const { isLoaded, setOrderState, setPickupCoords, setDropoffCoords, setDriverCoords, setDriverBearing, setDriverVehicleType, setRoutePolyline, fitBounds, requestUserLocation, setMapCenter, setWaypointCoords, setDriverLabel, setCameraMode } = useMapState();

    const [order, setOrder] = React.useState<DeliveryOrder | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [retryId, setRetryId] = React.useState('');
    const [orderCodes, setOrderCodes] = React.useState<{ orderCode?: string; stopCodes?: Record<string, string> }>({});
    const lastRouteUpdate = React.useRef<number>(0);
    const lastSyncedOrderId = React.useRef<string>(''); // gate setMapCenter to first-load-per-order
    const lastFitBoundsStatus = React.useRef<string>(''); // gate fitBounds to status transitions only
    // Per-order gate so the base pickup→dropoff polyline is computed at most once.
    // Guarantees the customer ALWAYS sees a route line, even if the driver hasn't
    // written fresh geometry and the throttled driver→nextstop upgrade fails/skips.
    const baseRouteSetRef = React.useRef<string>('');
    const updateStatusMutation = useUpdateOrderStatus();
    const updateOrderMutation = useUpdateOrder();

    useEffect(() => {
        if (order) {
            if (order.status === 'pending') {
                setOrderState('MATCHING');
            } else if (order.status === 'delivered') {
                setOrderState('COMPLETED');
            } else {
                setOrderState('IN_TRANSIT');
            }

            // Sync driver label to context
            const dLabel = order?.status === 'driver_assigned'
                ? (order.remainingDuration ? `Picking up in ${Math.ceil(order.remainingDuration / 60)} mins` : 'Heading to Pickup')
                : (order?.status === 'in_transit'
                    ? (order.remainingDuration ? `Delivering in ${Math.ceil(order.remainingDuration / 60)} mins` : 'Delivering')
                    : (order?.status === 'delivered' ? 'Arrived' : null));

            setDriverLabel(dLabel);
        } else {
            setDriverLabel(null);
        }
    }, [order?.status, order?.remainingDuration, setOrderState, setDriverLabel]);

    // Only clear map state on unmount — clearing it on every order update
    // caused the route/driver marker to flicker or disappear between Firestore snapshots.
    useEffect(() => {
        return () => {
            setOrderState('IDLE');
            setDriverLabel(null);
        };
    }, [setOrderState, setDriverLabel]);

    // Sync map data when order or isLoaded changes
    useEffect(() => {
        const syncMap = async () => {
            if (!order || !isLoaded) return;

            try {
                // Use stored coordinates if available, otherwise geocode
                let p = order.pickupCoords;
                let d = order.dropoffCoords;

                if (!p) {
                    p = await mapService.geocodeAddress(order.pickup);
                }
                if (!d) {
                    d = await mapService.geocodeAddress(order.dropoff);
                }

                if (p) {
                    setPickupCoords(p);
                    // Only center on pickup once per order (not on every order update)
                    if (lastSyncedOrderId.current !== order.id) {
                        setMapCenter(p.lat, p.lng);
                    }
                }
                if (d) setDropoffCoords(d);

                // Set Waypoints if available
                if (order.stops && order.stops.length > 0) {
                    const wpCoords = order.stops.map(s => ({ lat: s.lat, lng: s.lng }));
                    setWaypointCoords(wpCoords);
                } else {
                    setWaypointCoords([]);
                }

                // ── Route display (guaranteed base line + live driver upgrade) ──
                // The customer must ALWAYS see at least a pickup→dropoff line so the
                // map is never just a lone pickup marker. Order of resolution:
                //   1. Live route the driver writes on the order (routeGeometry).
                //   2. One-shot base pickup→dropoff recalc per order (unthrottled) so a
                //      visible line appears even if the driver hasn't moved or the
                //      throttled upgrade is skipped.
                //   3. Throttled driver→next-stop upgrade that overrides the base.
                // MapLayer's dashed connector is the final safety net for API failure.
                const baseWaypoints = order.stops
                    ?.filter(s => s.type !== 'dropoff')
                    .sort((a, b) => (a.sequenceOrder || 0) - (b.sequenceOrder || 0))
                    .map(s => ({ lat: s.lat, lng: s.lng })) || [];

                const hasValidGeometry = typeof order.routeGeometry === 'string'
                    && order.routeGeometry.length > 10;

                if (hasValidGeometry) {
                    setRoutePolyline(order.routeGeometry);
                    baseRouteSetRef.current = order.id; // live geometry already satisfies the base
                } else {
                    let upgraded = false;

                    // Throttled live driver→next-stop upgrade (once / 15s)
                    if (order.driverLocation) {
                        const now = Date.now();
                        if (now - lastRouteUpdate.current > 15000 || !lastRouteUpdate.current) {
                            lastRouteUpdate.current = now;

                            const remainingStops: { lat: number, lng: number }[] = [];
                            if (order.status === 'driver_assigned' && p) remainingStops.push(p);
                            if (order.stops && order.stops.length > 0) {
                                order.stops
                                    .filter(s => s.status !== 'completed')
                                    .forEach(s => remainingStops.push({ lat: s.lat, lng: s.lng }));
                            }
                            const hasDropoffInStops = order.stops?.some(s => s.type === 'dropoff');
                            if (!hasDropoffInStops && d && (order.status === 'in_transit' || order.status === 'driver_assigned')) {
                                remainingStops.push(d);
                            }
                            if (remainingStops.length > 0) {
                                const start = { lat: order.driverLocation.lat, lng: order.driverLocation.lng };
                                const end = remainingStops[remainingStops.length - 1];
                                const waypoints = remainingStops.slice(0, -1);
                                const route = await mapService.getRoute(start, end, waypoints, order.vehicle);
                                if (route && route.geometry && route.geometry.length > 10) {
                                    setRoutePolyline(route.geometry);
                                    upgraded = true;
                                }
                            }
                        }
                    }

                    // One-shot base pickup→dropoff line so the customer always sees a
                    // route even before fresh live geometry arrives.
                    if (!upgraded && p && d && baseRouteSetRef.current !== order.id) {
                        const route = await mapService.getRoute(p, d, baseWaypoints, order.vehicle, false);
                        if (route && route.geometry && route.geometry.length > 10) {
                            setRoutePolyline(route.geometry);
                        }
                    }
                    // Mark the base attempt for this order so we never recompute it.
                    baseRouteSetRef.current = order.id;
                }

                // Default to 'boda' when the order vehicle is unset (legacy orders
                // with empty vehicle field) so the map never shows the Truck fallback.
                setDriverVehicleType(order.vehicle || 'boda');

                // Update Driver Location
                if (order.driverLocation) {
                    const driverPos = { lat: order.driverLocation.lat, lng: order.driverLocation.lng };
                    setDriverCoords(driverPos);
                    if (order.driverLocation.bearing) {
                        setDriverBearing(order.driverLocation.bearing);
                    }

                    // IMPORTANT: customer-facing tracking uses 'overview' mode, not
                    // the nav-tight 'follow' mode. Overview keeps the whole
                    // pickup→dropoff→driver route visible at once. Follow mode snaps
                    // to DRIVER_FOLLOW_ZOOM (~18) which would hide the dropoff and
                    // most of the route when the driver is near the pickup.
                    setCameraMode('overview');

                    // Always fit bounds to the full route so the customer sees
                    // every point: driver + pickup + remaining stops + dropoff.
                    // Gated to status transitions so it doesn't fight overview mode
                    // on every Firestore snapshot.
                    const statusChanged = lastFitBoundsStatus.current !== order.status;
                    if (statusChanged) {
                        const all: Array<{ lat: number; lng: number }> = [driverPos];
                        if (order.status === 'driver_assigned' && p) all.push(p);
                        if (order.stops && order.stops.length > 0) {
                            order.stops.filter(s => s.status !== 'completed').forEach(s => all.push({ lat: s.lat, lng: s.lng }));
                        }
                        if (d && (order.status === 'in_transit' || order.status === 'driver_assigned')) all.push(d);
                        if (all.length > 1) fitBounds(all);
                    }
                    lastFitBoundsStatus.current = order.status;
                } else if (p && d && lastFitBoundsStatus.current !== 'no-driver') {
                    // No driver yet — show full route bounds INCLUDING waypoints (once)
                    const allPoints: Array<{ lat: number; lng: number }> = [p, d];
                    order.stops?.forEach(s => {
                        if (s.type !== 'dropoff' && s.lat && s.lng) {
                            allPoints.push({ lat: s.lat, lng: s.lng });
                        }
                    });
                    fitBounds(allPoints);
                    lastFitBoundsStatus.current = 'no-driver';
                }
            } catch (error) {
                console.error("Error syncing map in TrackingPage:", error);
            } finally {
                lastSyncedOrderId.current = order.id;
            }
        };

        syncMap();
    }, [order, isLoaded, setPickupCoords, setDropoffCoords, setDriverCoords, setDriverBearing, setRoutePolyline, fitBounds, setMapCenter, setWaypointCoords, setDriverVehicleType, setDriverLabel, setOrderState, setCameraMode]);

    React.useEffect(() => {
        if (!orderId) {
            setIsLoading(false);
            return;
        }

        let unsub: (() => void) | null = null;
        let unsubCodes: (() => void) | null = null;

        const initTracking = async () => {
            setIsLoading(true);
            try {
                const docRef = doc(db, 'orders', orderId);
                const docSnap = await getDoc(docRef);

                if (!docSnap.exists()) {
                    setOrder(null);
                    setIsLoading(false);
                    return;
                }

                unsub = onSnapshot(
                    docRef,
                    (snapshot) => {
                        if (snapshot.exists()) {
                            const data = { ...snapshot.data() as any, id: snapshot.id } as DeliveryOrder;
                            setOrder(data);
                        } else {
                            setOrder(null);
                        }
                        setIsLoading(false);
                    },
                    (error) => {
                        console.error("Firestore Tracking Error:", error);
                        setIsLoading(false);
                    }
                );

                // Listen to the customer-only private codes subcollection
                // (verification PINs live here, not on the public order doc)
                unsubCodes = onSnapshot(
                    doc(db, 'orders', orderId, 'private', 'codes'),
                    (codesSnap) => {
                        if (codesSnap.exists()) {
                            setOrderCodes(codesSnap.data() as any);
                        }
                    },
                    () => { /* legacy orders have no codes doc — fall back to order fields */ }
                );
            } catch (error) {
                console.error("Error initializing tracking:", error);
                setIsLoading(false);
            }
        };

        initTracking();

        return () => {
            if (unsub) unsub();
            if (unsubCodes) unsubCodes();
        };
    }, [orderId]);

    const handleUpdateStatus = async (orderId: string, newStatus: any, driverDetails?: any) => {
        await updateStatusMutation.mutateAsync({ orderId, status: newStatus, driver: driverDetails });
    };

    const handleUpdateOrder = async (orderId: string, updates: Partial<DeliveryOrder>) => {
        await updateOrderMutation.mutateAsync({ orderId, updates });
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center pointer-events-none">
                <div className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl shadow-2xl flex flex-col items-center">
                    <Loader className="w-8 h-8 text-brand-600 animate-spin mb-2" />
                    <p className="text-gray-500 text-sm font-bold">Connecting to live feed...</p>
                </div>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="min-h-screen flex items-center justify-center pointer-events-none p-4 bg-gray-50/50">
                <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-gray-100 text-center max-w-lg w-full pointer-events-auto animate-in zoom-in duration-300">
                    <div className="w-20 h-20 bg-brand-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                        <Search className="w-10 h-10 text-brand-600" />
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 mb-2">Order Not Found</h2>
                    <p className="text-gray-500 font-bold text-sm mb-8">We couldn't find an order with ID <span className="text-brand-600">"{orderId}"</span>. Please check the number and try again.</p>

                    <div className="space-y-4">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Enter correct Order ID..."
                                value={retryId}
                                onChange={(e) => setRetryId(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all font-bold text-gray-900"
                            />
                        </div>
                        <button
                            onClick={() => retryId.trim() && navigate(`/tracking/${retryId.trim()}`)}
                            className="w-full bg-brand-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-brand-600/20 hover:bg-brand-700 transition-all active:scale-95"
                        >
                            Track Again
                        </button>
                        <button
                            onClick={() => navigate(user?.role === 'business' ? '/business-dashboard' : (user ? '/customer-dashboard' : '/'))}
                            className="w-full bg-gray-100 text-gray-600 py-4 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                        >
                            Back to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (order.status === 'cancelled') {
        return (
            <div className="min-h-screen flex items-center justify-center pointer-events-none p-4">
                <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-2xl border border-white/50 text-center max-w-sm pointer-events-auto animate-in zoom-in duration-300">
                    <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <XCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Order Cancelled</h2>
                    <p className="text-gray-500 font-bold text-sm mb-6">{order.cancellationReason || 'This delivery has been cancelled.'}</p>
                    <button
                        onClick={() => navigate('/book')}
                        className="w-full bg-brand-600 text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-brand-700 transition-all mb-3"
                    >
                        Place New Order
                    </button>
                    <button
                        onClick={() => navigate(user?.role === 'business' ? '/business-dashboard' : (user ? '/customer-dashboard' : '/'))}
                        className="w-full bg-gray-100 text-gray-700 py-4 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    if (order.status === 'expired') {
        return (
            <div className="min-h-screen flex items-center justify-center pointer-events-none p-4">
                <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-2xl border border-white/50 text-center max-w-sm pointer-events-auto animate-in zoom-in duration-300">
                    <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Clock className="w-8 h-8 text-gray-400" />
                    </div>
                    <h2 className="text-2xl font-extrabold text-gray-900 mb-2">No Driver Found</h2>
                    <p className="text-gray-500 font-bold text-sm mb-6">No driver accepted your order in time. Would you like to rebook?</p>
                    <button
                        onClick={() => navigate('/book')}
                        className="w-full bg-brand-600 text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-brand-700 transition-all mb-3"
                    >
                        Rebook Delivery
                    </button>
                    <button
                        onClick={() => navigate(user?.role === 'business' ? '/business-dashboard' : (user ? '/customer-dashboard' : '/'))}
                        className="w-full bg-gray-100 text-gray-700 py-4 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    if (order.status === 'disputed') {
        // ── Dispute: keep the LIVE tracking map mounted underneath the dispute
        // banner so the customer can still see the route line, driver marker,
        // and bottom sheet (same surface as a normal in-progress order). The
        // dispute banner floats on top with a "Resume Live Tracking" button that
        // withdraws the dispute (calls resolveDispute CF) and flips the order
        // back to its pre-dispute status — the Firestore snapshot (this page)
        // then re-mounts live tracking fully and the banner disappears.
        return (
            <div className="relative min-h-screen">
                {/* Live map + bottom sheet (read-only — actions are disabled below) */}
                <div className="dispute-blur-0">
                    <Tracking
                        order={order}
                        onUpdateStatus={handleUpdateStatus}
                        onUpdateOrder={handleUpdateOrder}
                        onBack={() => navigate(user?.role === 'business' ? '/business-dashboard' : (user ? '/customer-dashboard' : '/'))}
                        verificationCode={orderCodes.orderCode}
                        stopCodes={orderCodes.stopCodes}
                    />
                </div>

                {/* Floating dispute banner overlay — non-dismissible, action is Resolution */}
                <div className="absolute inset-x-0 top-0 z-[1000] pointer-events-none">
                    <div className="m-3 p-4 rounded-2xl bg-orange-50/95 backdrop-blur-md border border-orange-200 shadow-xl pointer-events-auto flex items-start gap-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <AlertTriangle className="w-6 h-6 text-orange-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 className="text-sm font-black text-orange-900">Dispute Under Review</h2>
                            <p className="text-[11px] font-semibold text-orange-700 mt-0.5 leading-snug">
                                Tracking is paused. Resolve the dispute to mark it complete or resume tracking.
                            </p>
                        </div>
                        <div className="flex flex-col gap-1.5 flex-shrink-0">
                            <button
                                onClick={async () => {
                                    setIsLoading(true);
                                    try {
                                        await orderApi.resolveDispute(orderId as string);
                                        // Stay on the page — the snapshot will flip
                                        // disputed → in_transit/delivered and the
                                        // live-tracking map re-renders automatically.
                                        setIsLoading(false);
                                    } catch (e: any) {
                                        setIsLoading(false);
                                        showAlert('Could not resume', e?.message || 'Please try again.', 'error');
                                    }
                                }}
                                disabled={isLoading}
                                className="px-3 py-2 rounded-xl bg-brand-600 text-white text-xs font-black shadow-sm hover:bg-brand-700 transition-all disabled:opacity-60 flex items-center gap-1.5"
                            >
                                {isLoading && <Loader className="w-3.5 h-3.5 animate-spin" />}
                                {isLoading ? 'Resuming…' : 'Resume'}
                            </button>
                            <button
                                onClick={() => navigate(user?.role === 'business' ? '/business-dashboard' : (user ? '/customer-dashboard' : '/'))}
                                className="px-3 py-1.5 rounded-xl bg-white text-gray-700 text-[11px] font-bold border border-gray-200 hover:bg-gray-50 transition-all"
                            >
                                Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="absolute inset-0 flex flex-col pointer-events-none">
            <div className="relative z-10 flex-grow flex flex-col pointer-events-none">
                <Tracking
                    order={order}
                    onUpdateStatus={handleUpdateStatus}
                    onUpdateOrder={handleUpdateOrder}
                    verificationCode={orderCodes.orderCode}
                    stopCodes={orderCodes.stopCodes}
                    onBack={() => {
                        if (user?.role === 'business') navigate('/business-dashboard');
                        else if (user?.role === 'driver') navigate('/driver');
                        else if (user) navigate('/customer-dashboard');
                        else navigate('/');
                    }}
                />
            </div>
        </div>
    );
};

const TrackingPage: React.FC = () => {
    // IMPORTANT: do NOT wrap TrackingPageContent in a nested <MapProvider>.
    // The global <MapLayer/> rendered by App.tsx reads from the SINGLE
    // top-level MapProvider that wraps the whole app. A nested provider here
    // would shadow it — setPickupCoords/setDropoffCoords/setRoutePolyline
    // would update this nested context, but the global MapLayer could not see
    // them, so customers would never see pickup/dropoff markers or the route
    // polyline on the map. Reuse the outer provider instead.
    return <TrackingPageContent />;
};

export default TrackingPage;
