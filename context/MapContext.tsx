
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { mapService } from '@/services/mapService';
import { useJsApiLoader } from '@react-google-maps/api';
import { APP_CONFIG } from '@/config';
import { GOOGLE_MAPS_LIBRARIES } from '@/constants';
import { db } from '@/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';

export type MapOrderState = 'IDLE' | 'DRAFTING' | 'MATCHING' | 'IN_TRANSIT' | 'COMPLETED';
export type CameraMode = 'idle' | 'follow' | 'overview' | 'arriving';

interface Coordinates {
    lat: number;
    lng: number;
}

interface VehicleMarker {
    id: string;
    type: string;
    position: Coordinates;
    bearing?: number;
}

type LocationAccuracy = 'none' | 'cached' | 'low' | 'high' | 'pending';
type SheetDetent = 'default' | 'search' | 'pin';
type SheetPlacement = 'bottom' | 'side';

const LOCATION_CACHE_KEY = 'axon_last_known_location';

interface MapContextType {
    isLoaded: boolean;
    orderState: MapOrderState;
    setOrderState: (state: MapOrderState) => void;

    pickupCoords: Coordinates | null;
    setPickupCoords: (coords: Coordinates | null) => void;

    dropoffCoords: Coordinates | null;
    setDropoffCoords: (coords: Coordinates | null) => void;

    waypointCoords: Coordinates[];
    setWaypointCoords: (coords: Coordinates[]) => void;

    driverCoords: Coordinates | null;
    setDriverCoords: (coords: Coordinates | null) => void;

    driverBearing: number;
    setDriverBearing: (bearing: number) => void;

    driverVehicleType: string;
    setDriverVehicleType: (type: string) => void;

    driverLabel: string | null;
    setDriverLabel: (label: string | null) => void;

    routePolyline: any;
    setRoutePolyline: (polyline: any) => void;

    nearbyVehicles: VehicleMarker[];
    setNearbyVehicles: (vehicles: VehicleMarker[]) => void;

    mapCenter: Coordinates | null;
    setMapCenter: (lat: number, lng: number) => void;

    zoom: number;
    setZoom: (zoom: number) => void;

    isPanning: boolean;
    setIsPanning: (panning: boolean) => void;

    userLocation: Coordinates | null;
    locationAccuracy: LocationAccuracy;
    requestUserLocation: () => Promise<Coordinates | null>;
    ensureFreshLocation: () => Promise<Coordinates | null>;

    isMapSelecting: boolean;
    setIsMapSelecting: (selecting: boolean) => void;

    activeInput: 'pickup' | 'dropoff' | string | null;
    setActiveInput: (input: 'pickup' | 'dropoff' | string | null) => void;

    allowMarkerClick: boolean;
    setAllowMarkerClick: (allow: boolean) => void;

    bottomSheetHeight: number;
    setBottomSheetHeight: (height: number) => void;

    bottomSheetWidth: number;
    setBottomSheetWidth: (width: number) => void;

    bottomSheetDetent: SheetDetent;
    setBottomSheetDetent: (detent: SheetDetent) => void;

    bottomSheetPlacement: SheetPlacement;
    setBottomSheetPlacement: (placement: SheetPlacement) => void;

    // Commands
    fitBounds: (markers: Coordinates[]) => void;

    // Camera mode state machine (Uber/Bolt pattern)
    cameraMode: CameraMode;
    setCameraMode: (mode: CameraMode) => void;

    // User interaction tracking — when the user manually pans/zooms,
    // follow mode pauses for 8 seconds. Maps to a timestamp.
    userInteractedAt: number;
    markUserInteraction: () => void;

    // Internal state for triggering map actions
    boundsToFit: Coordinates[] | null;
    resetBoundsTrigger: () => void;
}

const MapContext = createContext<MapContextType | undefined>(undefined);

// Helper: read cached location from sessionStorage
const getCachedLocation = (): Coordinates | null => {
    try {
        const cached = localStorage.getItem(LOCATION_CACHE_KEY);
        if (cached) {
            const parsed = JSON.parse(cached);
            // Use cache if less than 30 minutes old
            if (parsed.timestamp && Date.now() - parsed.timestamp < 30 * 60 * 1000) {
                return { lat: parsed.lat, lng: parsed.lng };
            }
        }
    } catch { /* ignore */ }
    return null;
};

// Helper: save location to localStorage
const cacheLocation = (coords: Coordinates) => {
    try {
        localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify({
            lat: coords.lat,
            lng: coords.lng,
            timestamp: Date.now()
        }));
    } catch { /* ignore */ }
};

export const MapProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: APP_CONFIG.GOOGLE_MAPS_API_KEY,
        libraries: GOOGLE_MAPS_LIBRARIES,
        version: "beta"
    });

    const [orderState, setOrderState] = useState<MapOrderState>('IDLE');
    const [cameraMode, setCameraMode] = useState<CameraMode>('idle');
    const [userInteractedAt, setUserInteractedAt] = useState<number>(0);
    const [pickupCoords, setPickupCoordsInternal] = useState<Coordinates | null>(null);
    const [dropoffCoords, setDropoffCoordsInternal] = useState<Coordinates | null>(null);
    const [waypointCoords, setWaypointCoords] = useState<Coordinates[]>([]);
    const [driverCoords, setDriverCoords] = useState<Coordinates | null>(null);
    const [driverBearing, setDriverBearing] = useState<number>(0);
    const [driverVehicleType, setDriverVehicleType] = useState<string>('Truck');
    const [driverLabel, setDriverLabel] = useState<string | null>(null);
    const [routePolyline, setRoutePolyline] = useState<any>(null);
    const [nearbyVehicles, setNearbyVehicles] = useState<VehicleMarker[]>([]);

    // Real-time listener for online drivers to show on map
    useEffect(() => {
        if (!isLoaded) return;

        // Only show nearby vehicles when idle, drafting, or matching
        if (orderState !== 'IDLE' && orderState !== 'DRAFTING' && orderState !== 'MATCHING') {
            setNearbyVehicles([]);
            return;
        }

        const driversRef = collection(db, 'drivers');
        const q = query(driversRef, where('status', '==', 'online'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const vehicles: VehicleMarker[] = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                if (data.location && data.location.lat && data.location.lng) {
                    vehicles.push({
                        id: doc.id,
                        type: data.vehicleType || 'Boda Boda',
                        position: {
                            lat: data.location.lat,
                            lng: data.location.lng
                        },
                        bearing: data.bearing || 0
                    });
                }
            });
            setNearbyVehicles(vehicles);
        }, (error) => {
            console.error("Error listening to drivers:", error);
        });

        return () => unsubscribe();
    }, [isLoaded, orderState]);

    // Auto-clear map data when state becomes IDLE to prevent stale routes
    useEffect(() => {
        if (orderState === 'IDLE') {
            setPickupCoordsInternal(null);
            setDropoffCoordsInternal(null);
            setWaypointCoords([]);
            setRoutePolyline(null);
            setBoundsToFit(null);
            setDriverCoords(null);
            setDriverBearing(0);
            setDriverVehicleType('Truck');
        }
    }, [orderState]);

    // Initialize map center from cache (null until real GPS fix arrives)
    const cachedLoc = getCachedLocation();
    const [mapCenter, setMapCenterInternal] = useState<Coordinates | null>(cachedLoc || null);
    const [zoom, setZoom] = useState(cachedLoc ? 16 : 14);
    const [isPanning, setIsPanning] = useState(false);
    const [boundsToFit, setBoundsToFit] = useState<Coordinates[] | null>(null);
    const [userLocation, setUserLocation] = useState<Coordinates | null>(cachedLoc);
    const [locationAccuracy, setLocationAccuracy] = useState<LocationAccuracy>(cachedLoc ? 'cached' : 'none');
    const [isMapSelecting, setIsMapSelecting] = useState(false);
    const [activeInput, setActiveInput] = useState<'pickup' | 'dropoff' | string | null>(null);
    const [allowMarkerClick, setAllowMarkerClick] = useState(false);
    const [bottomSheetHeight, setBottomSheetHeight] = useState(0);
    const [bottomSheetWidth, setBottomSheetWidth] = useState(0);
    const [bottomSheetDetent, setBottomSheetDetent] = useState<SheetDetent>('default');
    const [bottomSheetPlacement, setBottomSheetPlacement] = useState<SheetPlacement>('bottom');
    const watchIdRef = useRef<number | null>(null);
    const firstFixAppliedRef = useRef(!!cachedLoc); // True if cache already provided a center
    const lastUserLocationRef = useRef<Coordinates | null>(cachedLoc);
    const freshLocationRequestRef = useRef<Promise<Coordinates | null> | null>(null);
    const locationAccuracyRef = useRef(locationAccuracy);
    locationAccuracyRef.current = locationAccuracy;
    // Refs to track booking coords — used by watchPosition and ensureFreshLocation
    // to avoid overriding fitBounds when a route is already displayed
    const pickupCoordsRef = useRef<Coordinates | null>(null);
    const dropoffCoordsRef = useRef<Coordinates | null>(null);

    // Persistent location tracking with watchPosition (Uber/Bolt pattern)
    useEffect(() => {
        if (!navigator.geolocation) return;

        // Minimum distance change (in degrees, ~11m) before updating userLocation
        // This prevents the blue dot from jumping on every noisy GPS reading
        const MIN_MOVE_THRESHOLD = 0.0001; // ~11 meters

        const startWatch = () => {
            // Start continuous location stream
            const watchId = navigator.geolocation.watchPosition(
                (position) => {
                    const coords = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    const accuracy = position.coords.accuracy;
                    const newAccuracy: LocationAccuracy = accuracy <= 50 ? 'high' : 'low';

                    // Only update userLocation if moved beyond threshold (prevents marker jitter)
                    const prev = lastUserLocationRef.current;
                    const moved = !prev || (
                        Math.abs(coords.lat - prev.lat) > MIN_MOVE_THRESHOLD ||
                        Math.abs(coords.lng - prev.lng) > MIN_MOVE_THRESHOLD
                    );

                    if (moved) {
                        lastUserLocationRef.current = coords;
                        setUserLocation(coords);
                        cacheLocation(coords);
                    }

                    setLocationAccuracy(newAccuracy);

                    // Center the map ONLY on the very first GPS fix (not on every update)
                    // Skip if booking coords are already set (route is being displayed)
                    if (!firstFixAppliedRef.current && !pickupCoordsRef.current) {
                        firstFixAppliedRef.current = true;
                        setMapCenterInternal(coords);
                        setBoundsToFit([coords]);
                    }
                },
                (error) => {
                    console.warn("watchPosition error:", error);
                    // On native platform, trigger the full Capacitor pipeline
                    if (Capacitor.isNativePlatform() && !lastUserLocationRef.current) {
                        mapService.getCurrentLocation().then(coords => {
                            if (coords) {
                                lastUserLocationRef.current = coords;
                                setUserLocation(coords);
                                setLocationAccuracy('high');
                                cacheLocation(coords);
                                if (!firstFixAppliedRef.current && !pickupCoordsRef.current) {
                                    firstFixAppliedRef.current = true;
                                    setMapCenterInternal(coords);
                                    setBoundsToFit([coords]);
                                }
                            } else {
                                setLocationAccuracy('none');
                            }
                        }).catch(() => setLocationAccuracy('none'));
                    } else if (!lastUserLocationRef.current) {
                        // Web: permission already handled by cold start — just set none
                        setLocationAccuracy('none');
                    }
                },
                {
                    enableHighAccuracy: true,
                    timeout: 15000,
                    maximumAge: 10000
                }
            );

            watchIdRef.current = watchId;
        };

        if (Capacitor.isNativePlatform()) {
            // Native: start immediately — cold start already handled permissions
            startWatch();
        } else {
            // Web: delay to avoid racing with App.tsx cold-start prompt
            // The cold start triggers the browser permission dialog; watchPosition
            // would consume the same prompt and potentially create confusing UX
            const delay = setTimeout(startWatch, 2000);
            return () => {
                clearTimeout(delay);
                if (watchIdRef.current !== null) {
                    navigator.geolocation.clearWatch(watchIdRef.current);
                    watchIdRef.current = null;
                }
            };
        }

        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
            }
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const setPickupCoords = useCallback((coords: Coordinates | null) => {
        pickupCoordsRef.current = coords;
        setPickupCoordsInternal(prev => {
            if (!prev && !coords) return null;
            if (prev && coords && prev.lat === coords.lat && prev.lng === coords.lng) return prev;
            return coords;
        });
    }, []);

    const setDropoffCoords = useCallback((coords: Coordinates | null) => {
        dropoffCoordsRef.current = coords;
        setDropoffCoordsInternal(prev => {
            if (!prev && !coords) return null;
            if (prev && coords && prev.lat === coords.lat && prev.lng === coords.lng) return prev;
            return coords;
        });
    }, []);

    const setMapCenter = useCallback((lat: number, lng: number) => {
        setMapCenterInternal(prev => {
            if (prev && Math.abs(prev.lat - lat) < 0.000001 && Math.abs(prev.lng - lng) < 0.000001) {
                return prev;
            }
            return { lat, lng };
        });
    }, []);

    const fitBounds = useCallback((markers: Coordinates[]) => {
        setBoundsToFit(markers);
    }, []);

    const resetBoundsTrigger = useCallback(() => {
        setBoundsToFit(null);
    }, []);

    const markUserInteraction = useCallback(() => {
        setUserInteractedAt(Date.now());
    }, []);

    const requestUserLocation = useCallback(async (): Promise<Coordinates | null> => {
        try {
            const coords = await mapService.getCurrentLocation();
            if (coords) {
                setUserLocation(coords);
                setLocationAccuracy('high');
                cacheLocation(coords);
                setMapCenterInternal(coords);
            }
            return coords;
        } catch (error: any) {
            console.error("Error getting location:", error);
            return null;
        }
    }, []);

    // ensureFreshLocation — Bolt/Uber-style warm-start location pipeline.
    //
    // Phase 1 (instant): if we have a cached position, resolve immediately so the
    //   booking UI can pre-fill pickup and center the map without waiting for GPS.
    // Phase 2 (background): always kick off a real GPS fix in parallel.
    //   On Android this triggers cordova.plugins.locationAccuracy.request() which
    //   shows the native "Turn on Location Accuracy" dialog when precision is off.
    //   When the fresh fix arrives we update userLocation + cache automatically.
    //
    // Callers that only need a "good enough" position get the cached result quickly.
    // The map/UI silently upgrades when the fresh fix arrives via setUserLocation.
    const ensureFreshLocation = useCallback(async (): Promise<Coordinates | null> => {
        // De-duplicate: if a request is already in-flight, share it.
        if (freshLocationRequestRef.current) {
            return freshLocationRequestRef.current;
        }

        const requestPromise = (async () => {
            try {
                // Phase 1: Try to get fresh location, fallback to cache if slow
                // A booking pickup needs real accuracy. We'll wait up to 800ms for a real fix.
                const cached = getCachedLocation();
                let freshPromise = mapService.getCurrentLocation();

                // Race between fresh GPS and a short timeout.
                // If GPS takes longer than 800ms, returning the cache keeps the UI snappy.
                let timeoutPromise = new Promise<{ timeout: boolean }>(resolve => setTimeout(() => resolve({ timeout: true }), 800));

                let raceResult = await Promise.race([freshPromise, timeoutPromise]);

                if ('timeout' in raceResult && raceResult.timeout === true) {
                    // Fresh GPS didn't return fast enough. Use cache if available.
                    if (cached && locationAccuracyRef.current !== 'none') {
                        // Keep waiting for fresh in background
                        freshPromise.then(freshCoords => {
                            if (freshCoords) {
                                setUserLocation(freshCoords);
                                setLocationAccuracy('high');
                                cacheLocation(freshCoords);
                                // Only snap Map if we haven't already locked the pickup coords!
                                // It prevents the exact "jump to wrong place" bug.
                                setMapCenterInternal(prev => {
                                    if (!prev) return freshCoords;
                                    // If pickup is already actively bound and set we should NOT snap the map out of user's hands.
                                    if (pickupCoordsRef.current) return prev;

                                    const hasBookingPoints =
                                        lastUserLocationRef.current &&
                                        Math.abs(prev.lat - lastUserLocationRef.current.lat) > 0.001;
                                    if (!hasBookingPoints) return freshCoords;
                                    return prev;
                                });
                                lastUserLocationRef.current = freshCoords;
                            }
                        }).catch(() => { });
                        return cached; // Return cache for instant UI
                    }
                    // If no cache, we just wait for the GPS promise to finish
                    raceResult = await freshPromise;
                }

                // If we get here, either GPS finished fast OR timeout fired but we had no cache.
                const coords: Coordinates | null = ('timeout' in raceResult) ? await freshPromise : raceResult;

                if (coords) {
                    setUserLocation(coords);
                    setLocationAccuracy('high');
                    cacheLocation(coords);
                    lastUserLocationRef.current = coords;
                    if (!pickupCoordsRef.current) {
                        setMapCenterInternal(coords);
                        if (!firstFixAppliedRef.current) {
                            firstFixAppliedRef.current = true;
                            setBoundsToFit([coords]);
                        }
                    }
                } else {
                    setLocationAccuracy('none');
                }

                return coords || cached;
            } catch (error) {
                console.warn("ensureFreshLocation failed:", error);
                setLocationAccuracy('none');
                return null;
            } finally {
                freshLocationRequestRef.current = null;
            }
        })();

        freshLocationRequestRef.current = requestPromise;
        return requestPromise;
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Automatic Routing Effect - Removed to allow pages to control routing logic (e.g. driver-to-destination)
    /*
    useEffect(() => {
        const fetchRoute = async () => {
            if (pickupCoords && dropoffCoords) {
                const routeData = await mapService.getRoute(pickupCoords, dropoffCoords);
                if (routeData) {
                    setRoutePolyline(routeData.geometry);
                }
            } else {
                setRoutePolyline(null);
            }
        };
        fetchRoute();
    }, [pickupCoords, dropoffCoords]);
    */

    return (
        <MapContext.Provider value={{
            isLoaded,
            orderState,
            setOrderState,
            pickupCoords,
            setPickupCoords,
            dropoffCoords,
            setDropoffCoords,
            driverCoords,
            setDriverCoords,
            driverBearing,
            setDriverBearing,
            driverVehicleType,
            setDriverVehicleType,
            routePolyline,
            setRoutePolyline,
            nearbyVehicles,
            setNearbyVehicles,
            mapCenter,
            setMapCenter,
            zoom,
            setZoom,
            isPanning,
            setIsPanning,
            fitBounds,
            boundsToFit,
            resetBoundsTrigger,
            cameraMode,
            setCameraMode,
            userInteractedAt,
            markUserInteraction,
            userLocation,
            locationAccuracy,
            requestUserLocation,
            ensureFreshLocation,
            isMapSelecting,
            setIsMapSelecting,
            activeInput,
            setActiveInput,
            allowMarkerClick,
            setAllowMarkerClick,
            bottomSheetHeight,
            setBottomSheetHeight,
            bottomSheetWidth,
            setBottomSheetWidth,
            bottomSheetDetent,
            setBottomSheetDetent,
            bottomSheetPlacement,
            setBottomSheetPlacement,
            waypointCoords,
            setWaypointCoords,
            driverLabel,
            setDriverLabel
        }}>
            {children}
        </MapContext.Provider>
    );
};

export const useMapState = () => {
    const context = useContext(MapContext);
    if (context === undefined) {
        throw new Error('useMapState must be used within a MapProvider');
    }
    return context;
};
