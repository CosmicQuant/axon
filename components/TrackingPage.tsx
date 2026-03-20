import React, { useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Tracking from './Tracking';
import MapLayer from './MapLayer';
import { useAuth } from '../context/AuthContext';
import { usePrompt } from '../context/PromptContext';
import { useUpdateOrderStatus, useUpdateOrder } from '../hooks/useOrders';
import { Loader, XCircle, Navigation, ArrowLeft, Search, AlertCircle } from 'lucide-react';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { DeliveryOrder } from '../types';
import { MapProvider, useMapState } from '@/context/MapContext';
import { mapService } from '@/services/mapService';

const TrackingPageContent: React.FC = () => {
    const { orderId: paramId } = useParams<{ orderId: string }>();
    const location = useLocation();
    const queryId = new URLSearchParams(location.search).get('id');
    const orderId = paramId || queryId;

    const navigate = useNavigate();
    const { user } = useAuth();
    const { showAlert } = usePrompt();
    const { isLoaded, setOrderState, setPickupCoords, setDropoffCoords, setDriverCoords, setDriverBearing, setDriverVehicleType, setRoutePolyline, fitBounds, requestUserLocation, setMapCenter, setWaypointCoords } = useMapState();

    const [order, setOrder] = React.useState<DeliveryOrder | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [retryId, setRetryId] = React.useState('');
    const lastRouteUpdate = React.useRef<number>(0);
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
        }
        return () => setOrderState('IDLE');
    }, [order?.status, setOrderState]);

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
                    // Set initial center to pickup if not already set
                    setMapCenter(p.lat, p.lng);
                }
                if (d) setDropoffCoords(d);

                // Set Waypoints if available
                if (order.stops && order.stops.length > 0) {
                    const wpCoords = order.stops.map(s => ({ lat: s.lat, lng: s.lng }));
                    setWaypointCoords(wpCoords);
                } else {
                    setWaypointCoords([]);
                }

                // Update Route for customer
                if (order.routeGeometry) {
                    setRoutePolyline(order.routeGeometry);
                } else {
                    // Fallback: Update Route for customer (throttle to every 15s)
                    const now = Date.now();
                    if (now - lastRouteUpdate.current > 15000 || !lastRouteUpdate.current) {
                        lastRouteUpdate.current = now;

                        if (order.driverLocation) {
                            // Multi-stop aware routing for customer
                            const remainingStops: { lat: number, lng: number }[] = [];

                            // If heading to pickup
                            if (order.status === 'driver_assigned' && p) {
                                remainingStops.push(p);
                            }

                            // Add all pending waypoints and final dropoff
                            if (order.stops && order.stops.length > 0) {
                                const pendingStops = order.stops
                                    .filter(s => s.status !== 'completed')
                                    .map(s => ({ lat: s.lat, lng: s.lng }));
                                remainingStops.push(...pendingStops);
                            }

                            // If final dropoff is not in stops array and we are in transit or assigned
                            const hasDropoffInStops = order.stops?.some(s => s.type === 'dropoff');
                            if (!hasDropoffInStops && d && (order.status === 'in_transit' || order.status === 'driver_assigned')) {
                                remainingStops.push(d);
                            }

                            if (remainingStops.length > 0) {
                                const start = { lat: order.driverLocation.lat, lng: order.driverLocation.lng };
                                const end = remainingStops[remainingStops.length - 1];
                                const waypoints = remainingStops.slice(0, -1);

                                const route = await mapService.getRoute(start, end, waypoints);
                                if (route) setRoutePolyline(route.geometry);
                            }
                        } else if (p && d) {
                            // No driver yet, show full route with waypoints
                            const waypoints = order.stops?.map(s => ({ lat: s.lat, lng: s.lng })) || [];
                            const route = await mapService.getRoute(p, d, waypoints);
                            if (route) setRoutePolyline(route.geometry);
                        }
                    }
                }

                if (order.vehicle) {
                    setDriverVehicleType(order.vehicle);
                }

                // Update Driver Location
                if (order.driverLocation) {
                    const driverPos = { lat: order.driverLocation.lat, lng: order.driverLocation.lng };
                    setDriverCoords(driverPos);
                    if (order.driverLocation.bearing) {
                        setDriverBearing(order.driverLocation.bearing);
                    }

                    // Fit bounds to include driver and their current destination
                    if (order.status === 'driver_assigned' && p) {
                        fitBounds([driverPos, p]);
                    } else if (order.status === 'in_transit' && d) {
                        fitBounds([driverPos, d]);
                    }
                } else if (p && d) {
                    // No driver yet, show full route bounds
                    fitBounds([p, d]);
                }
            } catch (error) {
                console.error("Error syncing map in TrackingPage:", error);
            }
        };

        syncMap();
    }, [order, isLoaded, setPickupCoords, setDropoffCoords, setDriverCoords, setDriverBearing, setRoutePolyline, fitBounds]);

    React.useEffect(() => {
        if (!orderId) {
            setIsLoading(false);
            return;
        }

        let unsub: (() => void) | null = null;

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
            } catch (error) {
                console.error("Error initializing tracking:", error);
                setIsLoading(false);
            }
        };

        initTracking();

        return () => {
            if (unsub) unsub();
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
                    <p className="text-gray-500 font-bold text-sm mb-6">This delivery has been cancelled. If this was a mistake, please place a new order.</p>
                    <button
                        onClick={() => navigate(user?.role === 'business' ? '/business-dashboard' : (user ? '/customer-dashboard' : '/'))}
                        className="w-full bg-brand-600 text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-brand-700 transition-all"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="absolute inset-0 flex flex-col pointer-events-none">
            {/* Background Map Layer */}
            <div className="absolute inset-0 pointer-events-auto">
                <MapLayer
                    driverLabel={
                        order?.status === 'driver_assigned'
                            ? (order.remainingDuration ? `Picking up in ${Math.ceil(order.remainingDuration / 60)} mins` : 'Heading to Pickup')
                            : (order?.status === 'in_transit'
                                ? (order.remainingDuration ? `Delivering in ${Math.ceil(order.remainingDuration / 60)} mins` : 'Delivering')
                                : (order?.status === 'delivered' ? 'Arrived' : undefined))
                    }
                />
            </div>

            <div className="relative z-10 flex-grow flex flex-col pointer-events-none">
                <Tracking
                    order={order}
                    onUpdateStatus={handleUpdateStatus}
                    onUpdateOrder={handleUpdateOrder}
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
    return (
        <TrackingPageContent />
    );
};

export default TrackingPage;
