
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { mapService } from '@/services/mapService';
import { useJsApiLoader } from '@react-google-maps/api';
import { APP_CONFIG } from '@/config';
import { GOOGLE_MAPS_LIBRARIES } from '@/constants';
import { db } from '@/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

export type MapOrderState = 'IDLE' | 'DRAFTING' | 'MATCHING' | 'IN_TRANSIT' | 'COMPLETED';

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

    routePolyline: any;
    setRoutePolyline: (polyline: any) => void;

    nearbyVehicles: VehicleMarker[];
    setNearbyVehicles: (vehicles: VehicleMarker[]) => void;

    mapCenter: Coordinates;
    setMapCenter: (lat: number, lng: number) => void;

    zoom: number;
    setZoom: (zoom: number) => void;

    isPanning: boolean;
    setIsPanning: (panning: boolean) => void;

    userLocation: Coordinates | null;
    requestUserLocation: () => Promise<Coordinates | null>;

    isMapSelecting: boolean;
    setIsMapSelecting: (selecting: boolean) => void;

    activeInput: 'pickup' | 'dropoff' | string | null;
    setActiveInput: (input: 'pickup' | 'dropoff' | string | null) => void;

    allowMarkerClick: boolean;
    setAllowMarkerClick: (allow: boolean) => void;

    // Commands
    fitBounds: (markers: Coordinates[]) => void;

    // Internal state for triggering map actions
    boundsToFit: Coordinates[] | null;
    resetBoundsTrigger: () => void;
}

const MapContext = createContext<MapContextType | undefined>(undefined);

export const MapProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: APP_CONFIG.GOOGLE_MAPS_API_KEY,
        libraries: GOOGLE_MAPS_LIBRARIES
    });

    const [orderState, setOrderState] = useState<MapOrderState>('IDLE');
    const [pickupCoords, setPickupCoordsInternal] = useState<Coordinates | null>(null);
    const [dropoffCoords, setDropoffCoordsInternal] = useState<Coordinates | null>(null);
    const [waypointCoords, setWaypointCoords] = useState<Coordinates[]>([]);
    const [driverCoords, setDriverCoords] = useState<Coordinates | null>(null);
    const [driverBearing, setDriverBearing] = useState<number>(0);
    const [driverVehicleType, setDriverVehicleType] = useState<string>('Truck');
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
            // We keep nearbyVehicles as they should be visible in IDLE
        }
    }, [orderState]);

    const [mapCenter, setMapCenterInternal] = useState<Coordinates>({ lat: -1.2921, lng: 36.8219 });
    const [zoom, setZoom] = useState(12);
    const [isPanning, setIsPanning] = useState(false);
    const [boundsToFit, setBoundsToFit] = useState<Coordinates[] | null>(null);
    const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
    const [isMapSelecting, setIsMapSelecting] = useState(false);
    const [activeInput, setActiveInput] = useState<'pickup' | 'dropoff' | string | null>(null);
    const [allowMarkerClick, setAllowMarkerClick] = useState(false);

    // Pre-fetch user location on mount to avoid starting at Nairobi
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const coords = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    setUserLocation(coords);
                    setMapCenterInternal(coords);
                },
                (error) => {
                    console.warn("Initial location pre-fetch failed:", error);
                },
                { enableHighAccuracy: false, timeout: 5000 }
            );
        }
    }, []);

    const setPickupCoords = useCallback((coords: Coordinates | null) => {
        setPickupCoordsInternal(prev => {
            if (!prev && !coords) return null;
            if (prev && coords && prev.lat === coords.lat && prev.lng === coords.lng) return prev;
            return coords;
        });
    }, []);

    const setDropoffCoords = useCallback((coords: Coordinates | null) => {
        setDropoffCoordsInternal(prev => {
            if (!prev && !coords) return null;
            if (prev && coords && prev.lat === coords.lat && prev.lng === coords.lng) return prev;
            return coords;
        });
    }, []);

    const setMapCenter = useCallback((lat: number, lng: number) => {
        setMapCenterInternal(prev => {
            if (Math.abs(prev.lat - lat) < 0.000001 && Math.abs(prev.lng - lng) < 0.000001) {
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

    const requestUserLocation = useCallback(async (): Promise<Coordinates | null> => {
        try {
            const coords = await mapService.getCurrentLocation();
            setUserLocation(coords);
            setMapCenterInternal(coords);
            return coords;
        } catch (error) {
            console.error("Error getting location:", error);
            return null;
        }
    }, []);

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
            userLocation,
            requestUserLocation,
            isMapSelecting,
            setIsMapSelecting,
            activeInput,
            setActiveInput,
            allowMarkerClick,
            setAllowMarkerClick,
            waypointCoords,
            setWaypointCoords
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
