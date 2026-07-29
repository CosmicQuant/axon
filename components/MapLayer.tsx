
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { GoogleMap, MarkerF, Polyline, InfoWindow, OverlayView } from '@react-google-maps/api';

// Heatmap styling for the driver demand layer. Kept as a module constant so
// the native HeatmapLayer's options reference is stable across renders.
const HEATMAP_OPTIONS = {
    radius: 45,
    opacity: 0.7,
    dissipating: true,
    gradient: [
        'rgba(22, 163, 74, 0)',
        'rgba(34, 197, 94, 0.6)',
        'rgba(250, 204, 21, 0.8)',
        'rgba(249, 115, 22, 0.9)',
        'rgba(239, 68, 68, 1)'
    ]
};
import { useMapState } from '@/context/MapContext';
import { APP_CONFIG } from '@/config';
import { Truck, Navigation, MapPin, GripVertical, X, Compass, Flag, ArrowUp, ArrowUpRight, ArrowRight, ArrowDownRight, ArrowDown, ArrowLeft, ArrowUpLeft, CornerUpLeft, CornerUpRight, Merge, Navigation2 } from 'lucide-react';

/* ── Bird's-eye (top-down) vehicle SVGs — Uber/Bolt style ─────
   All face NORTH at 0°. Parent div rotates by GPS bearing.
   viewBox 48x48. Each has: tapered nose (front), dark windshield,
   colored body, dark wheels, and a white contrast ring for map legibility. */

const BirdEyeMotorcycle = ({ size, accent }: { size: number; accent: string }) => (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <radialGradient id="motoBody" cx="50%" cy="40%" r="60%">
                <stop offset="0%" stopColor={accent} stopOpacity="1" />
                <stop offset="100%" stopColor={accent} stopOpacity="0.82" />
            </radialGradient>
        </defs>
        {/* Front wheel — vertical pill aligned with travel (tyre seen edge-on from above) */}
        <rect x="21.5" y="3" width="5" height="8" rx="2.5" fill="#111827" />
        <rect x="22.5" y="4" width="3" height="6" rx="1.5" fill="#1f2937" />
        <rect x="23.4" y="5.5" width="1.2" height="3" rx="0.6" fill="#4b5563" />
        {/* Handlebars — wide V */}
        <path d="M13 11 L20 16 M35 11 L28 16" stroke="#111827" strokeWidth="2.4" strokeLinecap="round" fill="none" />
        {/* Nose fairing — tapered */}
        <path d="M19 13 L29 13 L30.8 20 L24 23 L17.2 20 Z" fill="url(#motoBody)" />
        {/* Tank/body */}
        <rect x="18.7" y="18" width="10.6" height="9" rx="5" fill="url(#motoBody)" />
        {/* Rider torso */}
        <path d="M20 25 L28 25 L27 31 L21 31 Z" fill="#1f2937" />
        {/* Rider head + helmet */}
        <circle cx="24" cy="22" r="3" fill="#111827" />
        <circle cx="24" cy="22" r="2" fill="#374151" />
        {/* Seat */}
        <rect x="20.5" y="30" width="7" height="5" rx="2.5" fill="#0f172a" />
        {/* Swing arm */}
        <rect x="23" y="35" width="2" height="3" fill="#1f2937" opacity="0.7" />
        {/* Rear wheel — vertical pill aligned with travel */}
        <rect x="21.5" y="37" width="5" height="8" rx="2.5" fill="#111827" />
        <rect x="22.5" y="38" width="3" height="6" rx="1.5" fill="#1f2937" />
        <rect x="23.4" y="39.5" width="1.2" height="3" rx="0.6" fill="#4b5563" />
    </svg>
);

const BirdEyeTuktuk = ({ size, accent }: { size: number; accent: string }) => (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* single front wheel */}
        <ellipse cx="24" cy="9" rx="3.5" ry="3" fill="#111827" />
        {/* tapered nose */}
        <path d="M17 11 L31 11 L34 16 L14 16 Z" fill={accent} />
        {/* windshield */}
        <path d="M15 16 L33 16 L34 21 L14 21 Z" fill="#111827" opacity="0.55" />
        {/* rounded cabin body */}
        <rect x="13" y="21" width="22" height="16" rx="6" fill={accent} />
        {/* side windows */}
        <rect x="16" y="24" width="6" height="7" rx="2" fill="#111827" opacity="0.3" />
        <rect x="26" y="24" width="6" height="7" rx="2" fill="#111827" opacity="0.3" />
        {/* two rear wheels */}
        <ellipse cx="15" cy="40" rx="3.5" ry="3" fill="#111827" />
        <ellipse cx="33" cy="40" rx="3.5" ry="3" fill="#111827" />
    </svg>
);

const BirdEyeCar = ({ size, accent }: { size: number; accent: string }) => (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* nose taper */}
        <path d="M16 6 L32 6 L35 11 L13 11 Z" fill={accent} />
        {/* hood to windshield */}
        <rect x="12" y="11" width="24" height="26" rx="8" fill={accent} />
        {/* windshield */}
        <path d="M14 13 L34 13 L36 19 L12 19 Z" fill="#111827" opacity="0.5" />
        {/* side windows */}
        <rect x="14" y="21" width="20" height="7" rx="3" fill="#111827" opacity="0.28" />
        {/* rear window */}
        <path d="M14 31 L34 31 L33 36 L15 36 Z" fill="#111827" opacity="0.4" />
        {/* 4 wheels */}
        <rect x="7" y="13" width="5" height="8" rx="2.5" fill="#111827" />
        <rect x="36" y="13" width="5" height="8" rx="2.5" fill="#111827" />
        <rect x="7" y="30" width="5" height="8" rx="2.5" fill="#111827" />
        <rect x="36" y="30" width="5" height="8" rx="2.5" fill="#111827" />
    </svg>
);

const BirdEyeVan = ({ size, accent }: { size: number; accent: string }) => (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* nose */}
        <path d="M16 4 L32 4 L35 10 L13 10 Z" fill={accent} />
        {/* boxy van body */}
        <rect x="11" y="10" width="26" height="30" rx="6" fill={accent} />
        {/* windshield */}
        <path d="M13 12 L35 12 L36 18 L12 18 Z" fill="#111827" opacity="0.5" />
        {/* cargo panel seams */}
        <rect x="13" y="22" width="22" height="1.5" rx="0.75" fill="#ffffff" opacity="0.25" />
        <rect x="13" y="30" width="22" height="1.5" rx="0.75" fill="#ffffff" opacity="0.25" />
        {/* 4 wheels */}
        <rect x="7" y="13" width="5" height="8" rx="2.5" fill="#111827" />
        <rect x="36" y="13" width="5" height="8" rx="2.5" fill="#111827" />
        <rect x="7" y="31" width="5" height="8" rx="2.5" fill="#111827" />
        <rect x="36" y="31" width="5" height="8" rx="2.5" fill="#111827" />
    </svg>
);

const BirdEyePickup = ({ size, accent }: { size: number; accent: string }) => (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* nose */}
        <path d="M16 3 L32 3 L35 9 L13 9 Z" fill={accent} />
        {/* cab */}
        <rect x="12" y="9" width="24" height="15" rx="6" fill={accent} />
        {/* windshield */}
        <path d="M14 11 L34 11 L35 17 L13 17 Z" fill="#111827" opacity="0.5" />
        {/* open cargo bed (darker, recessed) */}
        <rect x="13" y="25" width="22" height="15" rx="3" fill={accent} opacity="0.6" />
        <rect x="15" y="27" width="18" height="11" rx="2" fill="#111827" opacity="0.25" />
        {/* bed rails */}
        <rect x="13" y="25" width="1.5" height="15" fill="#111827" opacity="0.3" />
        <rect x="33.5" y="25" width="1.5" height="15" fill="#111827" opacity="0.3" />
        {/* 4 wheels */}
        <rect x="7" y="11" width="5" height="8" rx="2.5" fill="#111827" />
        <rect x="36" y="11" width="5" height="8" rx="2.5" fill="#111827" />
        <rect x="7" y="30" width="5" height="8" rx="2.5" fill="#111827" />
        <rect x="36" y="30" width="5" height="8" rx="2.5" fill="#111827" />
    </svg>
);

const BirdEyeTruck = ({ size, accent }: { size: number; accent: string }) => (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* cab nose */}
        <path d="M16 2 L32 2 L35 8 L13 8 Z" fill={accent} />
        {/* cab */}
        <rect x="13" y="8" width="22" height="10" rx="4" fill={accent} />
        {/* windshield */}
        <path d="M15 9 L33 9 L34 14 L14 14 Z" fill="#111827" opacity="0.5" />
        {/* cargo box (long) */}
        <rect x="11" y="19" width="26" height="24" rx="3" fill={accent} opacity="0.85" />
        {/* cargo seams */}
        <rect x="13" y="25" width="22" height="1.5" rx="0.75" fill="#ffffff" opacity="0.2" />
        <rect x="13" y="32" width="22" height="1.5" rx="0.75" fill="#ffffff" opacity="0.2" />
        {/* front wheels */}
        <rect x="7" y="9" width="5" height="7" rx="2.5" fill="#111827" />
        <rect x="36" y="9" width="5" height="7" rx="2.5" fill="#111827" />
        {/* dual rear axle */}
        <rect x="7" y="28" width="5" height="6" rx="2.5" fill="#111827" />
        <rect x="36" y="28" width="5" height="6" rx="2.5" fill="#111827" />
        <rect x="7" y="36" width="5" height="6" rx="2.5" fill="#111827" />
        <rect x="36" y="36" width="5" height="6" rx="2.5" fill="#111827" />
    </svg>
);

/** Returns the accent color for map markers based on vehicle type */
const getVehicleAccent = (type: string, isDriver: boolean): string => {
    if (isDriver) return '#16a34a'; // brand green for the active driver
    const t = type.toLowerCase();
    if (t.includes('boda') || t.includes('motor') || t.includes('bike')) return '#f97316';
    if (t.includes('tuk')) return '#eab308';
    if (t.includes('probox') || t.includes('car')) return '#3b82f6';
    if (t.includes('van')) return '#6366f1';
    if (t.includes('pickup') || t.includes('pick')) return '#10b981';
    return '#475569'; // slate for trucks
};

/** Returns the correct bird's-eye SVG component for a vehicle type */
const getBirdEyeSvg = (type: string): React.FC<{ size: number; accent: string }> => {
    const t = type.toLowerCase();
    if (t.includes('boda') || t.includes('motor') || t.includes('bike')) return BirdEyeMotorcycle;
    if (t.includes('tuk')) return BirdEyeTuktuk;
    if (t.includes('probox') || t.includes('car') || t === 'automobile') return BirdEyeCar;
    if (t.includes('van') || t.includes('minibus')) return BirdEyeVan;
    if (t.includes('pickup') || t.includes('pick-up') || t.includes('pick up')) return BirdEyePickup;
    if (t.includes('tipper')) return BirdEyeTruck;     // tipper body style
    if (t.includes('tanker')) return BirdEyeVan;        // tank body (rounded)
    if (t.includes('container')) return BirdEyeTruck;  // skeletal trailer = box
    // All other trucks: rigid-truck-*, semi-truck-*, canter, etc.
    return BirdEyeTruck;
};

// Phase 3: Maneuver icon for the navigation banner
const ManeuverIcon = ({ maneuver }: { maneuver: string }) => {
    const iconMap: Record<string, React.FC<any>> = {
        'turn-left': ArrowUpLeft,
        'turn-right': ArrowUpRight,
        'slight-left': ArrowUpLeft,
        'slight-right': ArrowUpRight,
        'sharp-left': CornerUpLeft,
        'sharp-right': CornerUpRight,
        'uturn-left': CornerUpLeft,
        'uturn-right': CornerUpRight,
        'straight': ArrowUp,
        'keep-left': ArrowUpLeft,
        'keep-right': ArrowUpRight,
        'merge-left': Merge,
        'merge-right': Merge,
        'merge': Merge,
        'fork-left': ArrowUpLeft,
        'fork-right': ArrowUpRight,
        'ramp-left': ArrowUpLeft,
        'ramp-right': ArrowUpRight,
        'roundabout-left': ArrowUpLeft,
        'roundabout-right': ArrowUpRight,
    };
    const IconComp = iconMap[maneuver] || ArrowUp;
    return <IconComp className="w-6 h-6" strokeWidth={2.5} />;
};

const VehicleIcon = ({ type, bearing = 0, color = "blue", isDriver = false }: { type: string, bearing?: number, color?: string, isDriver?: boolean }) => {
    const size = isDriver ? 44 : 28;
    const accent = getVehicleAccent(type, isDriver);
    const SvgComponent = getBirdEyeSvg(type);

    return (
        <div className="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2">
            {/* Entire marker rotates with bearing — like Bolt/Uber */}
            <div
                className="transition-transform duration-700 ease-in-out"
                style={{ transform: `rotate(${bearing}deg)` }}
            >
                {isDriver && (
                    <div className="absolute inset-0 rounded-full animate-ping bg-brand-500/20 -z-10" />
                )}
                <div className="relative z-10 drop-shadow-[0_4px_6px_rgba(0,0,0,0.3)]">
                    <SvgComponent size={size} accent={accent} />
                </div>
            </div>
        </div>
    );
};

const containerStyle = {
    width: '100%',
    height: '100%'
};

// ── Camera timing constants ────────────────────────────────────────
const CAMERA = {
    SINGLE_POINT_ZOOM: 19,
    RETURN_HOME_ZOOM: 16.5,
    DEFAULT_ZOOM: 14,
    FLY_SINGLE_MS: 2800,
    FLY_ZOOM_OUT_MS: 2400,
    FLY_ZOOM_IN_MS: 2200,
    FLY_RETURN_HOME_MS: 2400,
    FLY_SHEET_REFIT_MS: 600,
    SHEET_REFIT_DEBOUNCE_MS: 400,
    PREWARM_TIMEOUT_MS: 1200,
    TILES_FAILSAFE_MS: 3000,
    SHEET_DELTA_THRESHOLD: 15,
    SHEET_MAX_RATIO: 0.85,
    PAD_MAX_RATIO: 0.55,
    DRIVER_FOLLOW_ZOOM: 17,
    DRIVER_FOLLOW_MS: 1200,
} as const;

// ── Easing functions (GPU-friendly parametric curves) ──────────────
const easeOutQuint = (t: number) => 1 - Math.pow(1 - t, 5);
const easeInOutCubic = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

// ── Padding calculator (shared by all camera operations) ───────────
const computePadding = (bottomSheetHeight: number) => {
    const screenH = window.innerHeight;
    const isDesktop = window.innerWidth >= 768;
    const maxBottomPad = Math.floor(screenH * CAMERA.PAD_MAX_RATIO);
    const sheetPad = Math.min(maxBottomPad, Math.max(100, (bottomSheetHeight || 280) + 16));
    return isDesktop
        ? { top: 50, bottom: 50, left: 40, right: 440 }
        : { top: 50, bottom: sheetPad, left: 48, right: 48 };
};

// Haversine distance in km (Phase 4 — auto-arriving mode trigger)
const haversine = (a: { lat: number; lng: number }, b: { lat: number; lng: number }): number => {
    const R = 6371;
    const dLat = (b.lat - a.lat) * Math.PI / 180;
    const dLng = (b.lng - a.lng) * Math.PI / 180;
    const sinLat = Math.sin(dLat / 2);
    const sinLng = Math.sin(dLng / 2);
    const h = sinLat * sinLat + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * sinLng * sinLng;
    return 2 * R * Math.asin(Math.sqrt(h));
};

// Helper to decode Google's encoded polyline
const decodePolyline = (encoded: string) => {
    if (!encoded) return [];
    let poly = [];
    let index = 0, len = encoded.length;
    let lat = 0, lng = 0;

    while (index < len) {
        let b, shift = 0, result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lat += dlat;

        shift = 0;
        result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lng += dlng;

        poly.push({ lat: lat / 1e5, lng: lng / 1e5 });
    }
    return poly;
};

const MapLayer: React.FC = () => {
    const {
        isLoaded,
        pickupCoords,
        setPickupCoords,
        dropoffCoords,
        setDropoffCoords,
        driverCoords,
        driverBearing,
        driverVehicleType,
        nearbyVehicles,
        orderState,
        routePolyline,
        userLocation,
        isMapSelecting,
        setIsMapSelecting,
        activeInput,
        mapCenter,
        setMapCenter,
        zoom,
        setZoom,
        isPanning,
        setIsPanning,
        boundsToFit,
        resetBoundsTrigger,
        fitBounds,
        allowMarkerClick,
        setActiveInput,
        waypointCoords,
        setWaypointCoords,
        driverLabel,
        bottomSheetHeight,
        cameraMode,
        setCameraMode,
        headingUp,
        setHeadingUp,
        nextManeuver,
        driverAccuracy,
        setDriverAccuracy,
        heatPoints,
        userInteractedAt,
        markUserInteraction,
        clearUserInteraction
    } = useMapState();

    const isMapAnimatingRef = useRef(false);
    const [map, setMap] = useState<google.maps.Map | null>(null);

    // ── Driver demand heat-map (imperative, runtime-loaded visualization lib) ──
    // visualization is NOT in the app-wide GOOGLE_MAPS_LIBRARIES (so customer /
    // business maps don't pay for it). It is imported on demand here via
    // google.maps.importLibrary('visualization'), and the native HeatmapLayer
    // instance is kept alive across data changes — only its data/options are
    // updated, and it is attached/detached (setMap) rather than recreated.
    // `heatData` is memoized so setData only fires when demand actually changes,
    // not on every driverCoords / availableOrders snapshot tick.
    const heatLayerRef = useRef<any>(null);
    const visLibRef = useRef<any>(null);
    const heatData = useMemo(
        () => heatPoints.map(p => ({ location: new google.maps.LatLng(p.lat, p.lng), weight: p.weight ?? 1 })),
        [heatPoints]
    );
    const showHeat = orderState === 'DRIVER_IDLE' && heatPoints.length > 0;

    useEffect(() => {
        if (!map) return;
        let active = true;
        (async () => {
            try {
                if (!showHeat) {
                    if (heatLayerRef.current) heatLayerRef.current.setMap(null);
                    return;
                }
                if (!visLibRef.current) {
                    visLibRef.current = await (google.maps as any).importLibrary('visualization');
                }
                if (!active || !visLibRef.current) return;
                if (!heatLayerRef.current) {
                    heatLayerRef.current = new visLibRef.current.HeatmapLayer();
                }
                heatLayerRef.current.setData(heatData);
                heatLayerRef.current.setOptions(HEATMAP_OPTIONS);
                heatLayerRef.current.setMap(map);
            } catch (e) {
                if (import.meta.env.DEV) console.warn('Heatmap layer error:', e);
            }
        })();
        return () => { active = false; };
    }, [map, showHeat, heatData]);

    useEffect(() => {
        return () => {
            if (heatLayerRef.current) { heatLayerRef.current.setMap(null); heatLayerRef.current = null; }
        };
    }, [map]);
    const animationFrameRef = useRef<number | null>(null);
    const prewarmDivRef = useRef<HTMLDivElement | null>(null);
    const prewarmMapRef = useRef<google.maps.Map | null>(null);
    const prevOrderStateRef = useRef(orderState);
    const [decodedPath, setDecodedPath] = useState<google.maps.LatLngLiteral[]>([]);
    const [mapVisible, setMapVisible] = useState(false);
    const cameraTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
    const lastBoundsRef = useRef('');
    const interpolatedDriverCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
    const interpolationFrameRef = useRef<number | null>(null);
    const overviewAutoReturnRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastSheetHeightRef = useRef(0);
    const sheetRefitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const prevDriverCoordsRef = useRef<{ lat: number; lng: number } | null>(null);

    // ── Single reusable flyTo engine ───────────────────────────────
    // "Last wins": any new call cancels the in-flight animation cleanly.
    const cancelCamera = useCallback(() => {
        cameraTimeoutsRef.current.forEach(t => clearTimeout(t));
        cameraTimeoutsRef.current = [];
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
        isMapAnimatingRef.current = false;
    }, []);

    const flyTo = useCallback((
        target: { lat: number; lng: number },
        targetZoom: number,
        durationMs: number,
        ease: (t: number) => number,
        onDone?: () => void
    ) => {
        if (!map) { onDone?.(); return; }
        cancelCamera();

        const startCenter = map.getCenter();
        const startZoom = map.getZoom() ?? CAMERA.DEFAULT_ZOOM;
        if (!startCenter) { onDone?.(); return; }
        const sLat = startCenter.lat();
        const sLng = startCenter.lng();
        const t0 = performance.now();

        isMapAnimatingRef.current = true;
        const tick = (now: number) => {
            const p = Math.min((now - t0) / durationMs, 1);
            const e = ease(p);
            map.moveCamera({
                center: { lat: sLat + (target.lat - sLat) * e, lng: sLng + (target.lng - sLng) * e },
                zoom: startZoom + (targetZoom - startZoom) * e
            });
            if (p < 1) {
                animationFrameRef.current = requestAnimationFrame(tick);
            } else {
                isMapAnimatingRef.current = false;
                animationFrameRef.current = null;
                onDone?.();
            }
        };
        animationFrameRef.current = requestAnimationFrame(tick);
    }, [map, cancelCamera]);

    useEffect(() => {
        if (routePolyline) {
        if (import.meta.env.DEV) console.log("[Diagnostic: MapLayer] routePolyline updated:",
                typeof routePolyline === 'string' ? `String (length: ${routePolyline.length})` : "Object");
        }
        if (typeof routePolyline === 'string' && routePolyline.length > 0) {
            setDecodedPath(decodePolyline(routePolyline));
        } else if (routePolyline && typeof routePolyline === 'object') {
            // Handle GeoJSON-like fallback or direct coordinate arrays
            if (routePolyline.type === 'LineString' && Array.isArray(routePolyline.coordinates)) {
                setDecodedPath(routePolyline.coordinates.map((c: any) => ({ lat: c[1], lng: c[0] })));
            } else if (routePolyline.points && typeof routePolyline.points === 'string') {
                setDecodedPath(decodePolyline(routePolyline.points));
            } else if (Array.isArray(routePolyline)) {
                setDecodedPath(routePolyline);
            }
        } else {
            setDecodedPath([]);
        }
    }, [routePolyline]);

    const initialCenterSet = useRef(false);
    const mapReadyRef = useRef(false);
    const onLoad = useCallback(function callback(mapInstance: google.maps.Map) {
        if (!initialCenterSet.current && mapCenter) {
            mapInstance.setCenter(userLocation || mapCenter);
            mapInstance.setZoom(16.5);
            initialCenterSet.current = true;
        }
        // Mark ready immediately once tiles load (or after 3s failsafe for desktop)
        const markReady = () => {
            mapReadyRef.current = true;
            setMapVisible(true);
        };
        google.maps.event.addListenerOnce(mapInstance, 'tilesloaded', markReady);
        setTimeout(markReady, 3000); // Desktop failsafe — tilesloaded can stall on slow connections

        // Create hidden pre-warm map for tile cache warming
        if (!prewarmDivRef.current) {
            const div = document.createElement('div');
            div.style.cssText = 'width:1px;height:1px;position:absolute;left:-9999px;top:-9999px;overflow:hidden;';
            document.body.appendChild(div);
            prewarmDivRef.current = div;
            prewarmMapRef.current = new google.maps.Map(div, {
                mapId: "DEMO_MAP_ID",
                disableDefaultUI: true,
            });
        }

        setMap(mapInstance);
    }, [mapCenter, zoom, userLocation]);

    // First-fix effect: center map when location arrives after map loaded with null center
    useEffect(() => {
        if (map && !initialCenterSet.current && (userLocation || mapCenter)) {
            map.setCenter(userLocation || mapCenter!);
            map.setZoom(14);
            initialCenterSet.current = true;
        }
    }, [map, userLocation, mapCenter]);

    const onUnmount = useCallback(function callback(map: google.maps.Map) {
        setMap(null);
        // Clean up pre-warm map
        if (prewarmDivRef.current?.parentNode) {
            prewarmDivRef.current.remove();
            prewarmDivRef.current = null;
            prewarmMapRef.current = null;
        }
    }, []);

    // ── Unified camera system ───────────────────────────────────────
    // Helper: extend bounds with sampled polyline points to prevent clipping
    const extendBoundsWithPolyline = useCallback((bounds: google.maps.LatLngBounds) => {
        if (decodedPath.length > 0) {
            const step = Math.max(1, Math.floor(decodedPath.length / 20));
            for (let i = 0; i < decodedPath.length; i += step) bounds.extend(decodedPath[i]);
            bounds.extend(decodedPath[decodedPath.length - 1]);
        }
    }, [decodedPath]);

    // Helper: compute target center+zoom via Google's fitBounds, then snap back
    const computeBoundsTarget = useCallback((
        points: google.maps.LatLngLiteral[],
        padding: google.maps.Padding
    ): { target: google.maps.LatLngLiteral; zoom: number } | null => {
        if (!map) return null;
        const bounds = new google.maps.LatLngBounds();
        points.forEach(p => bounds.extend(p));
        extendBoundsWithPolyline(bounds);

        const startCenter = map.getCenter();
        const startZoom = map.getZoom() ?? CAMERA.DEFAULT_ZOOM;

        map.fitBounds(bounds, padding);
        const targetZoom = map.getZoom() ?? CAMERA.DEFAULT_ZOOM;
        const targetCenter = map.getCenter();
        const target = {
            lat: targetCenter?.lat() ?? bounds.getCenter().lat(),
            lng: targetCenter?.lng() ?? bounds.getCenter().lng()
        };

        if (startCenter) {
            map.moveCamera({ center: startCenter, zoom: startZoom });
        }

        return { target, zoom: targetZoom };
    }, [map, extendBoundsWithPolyline]);

    // ── Effect: Handle boundsToFit requests ────────────────────────
    useEffect(() => {
        if (!map) return;

        if (!boundsToFit || boundsToFit.length === 0) {
            lastBoundsRef.current = '';
            return;
        }

        const padding = computePadding(bottomSheetHeight);
        const boundsKey = JSON.stringify(boundsToFit) + '|' + (bottomSheetHeight || 0);

        if (boundsKey === lastBoundsRef.current) {
            resetBoundsTrigger();
            return;
        }

        lastBoundsRef.current = boundsKey;

        const applyCamera = () => {
            if (boundsToFit.length === 1) {
                // Single-point: compute padding-aware center WITHOUT extendBoundsWithPolyline
                // (the old route polyline may still be in decodedPath and would corrupt the center)
                const point = boundsToFit[0];
                const bounds = new google.maps.LatLngBounds();
                bounds.extend(point);

                const startCenter = map.getCenter();
                const startZoom = map.getZoom() ?? CAMERA.DEFAULT_ZOOM;

                map.fitBounds(bounds, padding);
                const paddedCenter = map.getCenter();
                const target = paddedCenter
                    ? { lat: paddedCenter.lat(), lng: paddedCenter.lng() }
                    : point;

                // Snap map back to current position before animating
                if (startCenter) map.moveCamera({ center: startCenter, zoom: startZoom });

                flyTo(target, CAMERA.SINGLE_POINT_ZOOM, CAMERA.FLY_SINGLE_MS, easeOutQuint, () => resetBoundsTrigger());
            } else {
                // Compute bounds from points only — NOT extendBoundsWithPolyline.
                // The polyline in decodedPath may be stale (old route still present
                // while calculateRoute hasn't re-fetched yet). Including it would
                // prevent the map from zooming in when a waypoint is removed.
                const bounds = new google.maps.LatLngBounds();
                boundsToFit.forEach(p => bounds.extend(p));

                const startCenter = map.getCenter();
                const startZoom = map.getZoom() ?? CAMERA.DEFAULT_ZOOM;

                map.fitBounds(bounds, padding);
                const targetZoom = map.getZoom() ?? CAMERA.DEFAULT_ZOOM;
                const targetCenter = map.getCenter();
                const result = {
                    target: {
                        lat: targetCenter?.lat() ?? bounds.getCenter().lat(),
                        lng: targetCenter?.lng() ?? bounds.getCenter().lng()
                    },
                    zoom: targetZoom
                };

                if (startCenter) map.moveCamera({ center: startCenter, zoom: startZoom });

                const isZoomingOut = result.zoom < startZoom;
                const duration = isZoomingOut ? CAMERA.FLY_ZOOM_OUT_MS : CAMERA.FLY_ZOOM_IN_MS;
                const ease = isZoomingOut ? easeInOutCubic : easeOutQuint;

                const prewarm = prewarmMapRef.current;
                if (prewarm && isZoomingOut) {
                    isMapAnimatingRef.current = true;
                    const prewarmBounds = new google.maps.LatLngBounds();
                    boundsToFit.forEach(c => prewarmBounds.extend(c));
                    prewarm.fitBounds(prewarmBounds, padding);
                    const prewarmZoom = prewarm.getZoom() ?? result.zoom;
                    prewarm.setZoom(Math.max(1, prewarmZoom - 1));

                    let prewarmFired = false;
                    const startAnim = () => {
                        if (prewarmFired) return;
                        prewarmFired = true;
                        flyTo(result.target, result.zoom, duration, ease, () => resetBoundsTrigger());
                    };
                    google.maps.event.addListenerOnce(prewarm, 'tilesloaded', startAnim);
                    cameraTimeoutsRef.current.push(setTimeout(startAnim, CAMERA.PREWARM_TIMEOUT_MS) as any);
                } else {
                    flyTo(result.target, result.zoom, duration, ease, () => resetBoundsTrigger());
                }
            }
        };

        if (mapReadyRef.current) {
            const t = setTimeout(applyCamera, 50);
            cameraTimeoutsRef.current.push(t);
        } else {
            let started = false;
            const go = () => { if (!started) { started = true; mapReadyRef.current = true; applyCamera(); } };
            google.maps.event.addListenerOnce(map, 'tilesloaded', go);
            cameraTimeoutsRef.current.push(setTimeout(go, CAMERA.TILES_FAILSAFE_MS) as any);
        }
    }, [map, boundsToFit, resetBoundsTrigger, flyTo, computeBoundsTarget, extendBoundsWithPolyline, bottomSheetHeight]);

    // ── Effect: Return-to-home when leaving a route ────────────────
    useEffect(() => {
        if (!map) return;
        if (orderState === 'IDLE' && prevOrderStateRef.current !== 'IDLE' && userLocation) {
            flyTo(userLocation, CAMERA.RETURN_HOME_ZOOM, CAMERA.FLY_RETURN_HOME_MS, easeInOutCubic);
        }
        // Auto-set camera mode based on order state transitions
        if (orderState === 'IN_TRANSIT' && prevOrderStateRef.current !== 'IN_TRANSIT') {
            setCameraMode('follow');
        } else if (orderState === 'DRIVER_IDLE' && prevOrderStateRef.current !== 'DRIVER_IDLE') {
            // Driver is online but waiting for jobs — follow their GPS at zoom 16
            setCameraMode('follow');
        } else if (orderState === 'IDLE' || orderState === 'DRAFTING') {
            setCameraMode('idle');
        }
        prevOrderStateRef.current = orderState;
    }, [map, orderState, userLocation, flyTo, setCameraMode]);

    // ── Effect: Follow driver at navigation-level zoom ─────────────
    // State-machine driven: follows when cameraMode is 'follow' or 'arriving'.
    // Also follows the driver during DRIVER_IDLE (waiting for jobs).
    // Pauses for 8s after user interaction (pan/zoom), like Bolt/Uber.
    const USER_INTERACTION_PAUSE_MS = 8000;
    const OVERVIEW_AUTO_RETURN_MS = 10000;
    useEffect(() => {
        if (!map || !driverCoords) {
            prevDriverCoordsRef.current = driverCoords;
            return;
        }
        // Only follow when actively tracking or driver idle
        if (orderState === 'IDLE' || orderState === 'DRAFTING') {
            prevDriverCoordsRef.current = driverCoords;
            return;
        }

        // Skip if camera mode is 'overview' or 'idle' — user is browsing
        if (cameraMode === 'overview' || cameraMode === 'idle') {
            prevDriverCoordsRef.current = driverCoords;
            return;
        }

        // ── User interaction pause window ──
        // If the user recently panned/zoomed, don't auto-follow for 8s
        if (userInteractedAt && Date.now() - userInteractedAt < USER_INTERACTION_PAUSE_MS) {
            prevDriverCoordsRef.current = driverCoords;
            return;
        }

        const prev = prevDriverCoordsRef.current;
        prevDriverCoordsRef.current = driverCoords;

        // Skip if driver hasn't moved
        if (prev && Math.abs(driverCoords.lat - prev.lat) < 0.00005 && Math.abs(driverCoords.lng - prev.lng) < 0.00005) return;
        // Skip if another animation is mid-flight from a fitBounds call
        if (isMapAnimatingRef.current) return;

        // ── Phase 4: Auto-switch to 'arriving' mode when within 200m of next destination ──
        // Next destination depends on phase:
        //   in_transit → dropoff (or last pending waypoint)
        //   (driver_assigned/arriving_pickup handled by customer camera, not here)
        if (orderState === 'IN_TRANSIT' && cameraMode === 'follow') {
            let nextDest: { lat: number; lng: number } | null = null;
            if (waypointCoords && waypointCoords.length > 0) {
                nextDest = waypointCoords[waypointCoords.length - 1];
            } else if (dropoffCoords) {
                nextDest = dropoffCoords;
            }

            if (nextDest) {
                const distToDest = haversine(driverCoords, nextDest);
                if (distToDest <= 0.2) { // 200m
                    setCameraMode('arriving');
                }
            }
        }

        const padding = computePadding(bottomSheetHeight);
        // Offset center upward so driver is visible above the bottom sheet
        const padded = computeBoundsTarget([driverCoords], padding);
        const target = padded ? padded.target : driverCoords;

        // Use a tighter zoom for 'arriving' mode (closer to destination)
        const zoom = cameraMode === 'arriving' ? CAMERA.DRIVER_FOLLOW_ZOOM + 2 : CAMERA.DRIVER_FOLLOW_ZOOM;

        flyTo(target, zoom, CAMERA.DRIVER_FOLLOW_MS, easeInOutCubic);

        // ── Phase 3: Heading-up rotation ──
        // When headingUp is on (driver navigation), rotate the map so the
        // direction of travel is "up". Google Map v2 requires setHeading + tilt
        // for the immersive 3D view.
        if (headingUp && driverBearing !== undefined && driverBearing > 0) {
            try {
                (map as any).moveCamera({ heading: driverBearing, tilt: 45 });
            } catch {
                // heading/tilt only supported with vector maps (mapId set)
            }
        }
    }, [map, driverCoords, orderState, cameraMode, userInteractedAt, flyTo, computeBoundsTarget, bottomSheetHeight, headingUp, driverBearing, pickupCoords, dropoffCoords, waypointCoords, setCameraMode]);

    // ── Effect: Phase 4 — Auto-return from overview to follow after 10s ──
    useEffect(() => {
        if (cameraMode === 'overview') {
            overviewAutoReturnRef.current = setTimeout(() => {
                setCameraMode('follow');
                clearUserInteraction();
            }, OVERVIEW_AUTO_RETURN_MS);
        }
        return () => {
            if (overviewAutoReturnRef.current) clearTimeout(overviewAutoReturnRef.current);
        };
    }, [cameraMode, setCameraMode, clearUserInteraction]);

    // ── Effect: Phase 3 — Reset heading/tilt when headingUp turns off ──
    useEffect(() => {
        if (!map) return;
        if (!headingUp) {
            try { (map as any).moveCamera({ heading: 0, tilt: 0 }); } catch { /* vector maps only */ }
        }
    }, [map, headingUp]);

    // ── Effect: Re-fit route when bottom sheet resizes ──────────────
    useEffect(() => {
        if (!map || !bottomSheetHeight) return;

        if (sheetRefitTimerRef.current) clearTimeout(sheetRefitTimerRef.current);

        sheetRefitTimerRef.current = setTimeout(() => {
            if (isMapAnimatingRef.current) return;

            const screenH = window.innerHeight;
            if (bottomSheetHeight > screenH * CAMERA.SHEET_MAX_RATIO) return;

            const delta = Math.abs(bottomSheetHeight - lastSheetHeightRef.current);
            if (delta < CAMERA.SHEET_DELTA_THRESHOLD) return;
            lastSheetHeightRef.current = bottomSheetHeight;

            const hasRoute = pickupCoords && (waypointCoords?.length > 0 || dropoffCoords);
            if (!hasRoute) return;

            const allPoints: google.maps.LatLngLiteral[] = [];
            if (pickupCoords) allPoints.push(pickupCoords);
            if (waypointCoords) waypointCoords.forEach((wp: any) => { if (wp) allPoints.push(wp); });
            if (dropoffCoords) allPoints.push(dropoffCoords);
            if (allPoints.length < 2) return;

            const padding = computePadding(bottomSheetHeight);
            const result = computeBoundsTarget(allPoints, padding);
            if (!result) return;

            const startZoom = map.getZoom() ?? CAMERA.DEFAULT_ZOOM;
            const startCenter = map.getCenter();
            const zoomDelta = Math.abs(result.zoom - startZoom);
            const centerDelta = startCenter
                ? Math.abs(result.target.lat - startCenter.lat()) + Math.abs(result.target.lng - startCenter.lng())
                : 1;
            if (zoomDelta < 0.15 && centerDelta < 0.0005) return;

            flyTo(result.target, result.zoom, CAMERA.FLY_SHEET_REFIT_MS, easeInOutCubic);
        }, CAMERA.SHEET_REFIT_DEBOUNCE_MS);

        return () => {
            if (sheetRefitTimerRef.current) clearTimeout(sheetRefitTimerRef.current);
        };
    }, [map, bottomSheetHeight, pickupCoords, dropoffCoords, waypointCoords, flyTo, computeBoundsTarget]);

    useEffect(() => {
        return () => { cancelCamera(); };
    }, [cancelCamera]);

    // Sync map center back to context when user pans
    const onIdle = useCallback(() => {
        if (isMapAnimatingRef.current) return;
        if (!map) return;
        const currentZoom = map.getZoom();
        if (currentZoom !== undefined && currentZoom !== zoom) {
            setZoom(currentZoom);
        }
        const c = map.getCenter();
        if (c) {
            setMapCenter(c.lat(), c.lng());
        }
    }, [map, zoom, setZoom, setMapCenter]);

    if (!isLoaded) return <div className="fixed inset-0 bg-[#f8f9fa] flex items-center justify-center"><Truck className="w-10 h-10 text-brand-600 animate-bounce" /></div>;

    return (
        <div className="w-full h-full z-0 pointer-events-auto bg-[#f8f9fa] relative">
            <div className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${mapVisible ? 'opacity-100' : 'opacity-0'}`}>
                <GoogleMap
                    mapContainerStyle={containerStyle}
                    center={undefined}
                    zoom={undefined}
                    onLoad={onLoad}
                    onUnmount={onUnmount}
                    onIdle={onIdle}
                    onZoomChanged={() => {
                        if (isMapAnimatingRef.current) return;
                        if (map) {
                            const currentZoom = map.getZoom();
                            if (currentZoom !== undefined && currentZoom !== zoom) {
                                setZoom(currentZoom);
                                markUserInteraction();
                            }
                        }
                    }}
                    onClick={(e) => {
                        if (isMapSelecting && e.latLng) {
                            setMapCenter(e.latLng.lat(), e.latLng.lng());
                        }
                    }}
                    onDragStart={() => {
                        setIsPanning(true);
                        markUserInteraction();
                    }}
                    onDragEnd={() => setIsPanning(false)}
                    options={{
                        isFractionalZoomEnabled: true,
                        mapId: "DEMO_MAP_ID",
                        disableDefaultUI: true,
                        gestureHandling: 'greedy' // Enables one-finger panning on mobile
                    }}
                >
                    {/* Pickup placeholder only renders during booking flow (IDLE/DRAFTING/MATCHING).
                        Not in DRIVER_IDLE or IN_TRANSIT where it would wrongly label
                        the driver's own location as "Pickup". */}
                    {userLocation && !pickupCoords && !isMapSelecting && ['IDLE', 'DRAFTING', 'MATCHING'].includes(orderState) && (
                        <React.Fragment key="pickup-user-loc">
                            <OverlayView position={userLocation} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
                                <div className="w-6 h-6 bg-emerald-500 rounded-full border-4 border-white shadow-xl -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
                                    <div className="w-1.5 h-1.5 bg-white rounded-full" />
                                </div>
                            </OverlayView>
                            <OverlayView position={userLocation} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
                                <div className="absolute -translate-x-1/2 -translate-y-12 flex flex-col items-center z-[9999] pointer-events-none">
                                    <div className="bg-emerald-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg border border-white/20 whitespace-nowrap">Pickup</div>
                                    <div className="w-2 h-2 bg-emerald-600 rotate-45 -mt-1 shadow-sm"></div>
                                </div>
                            </OverlayView>
                        </React.Fragment>
                    )}

                    {pickupCoords && (!isMapSelecting || activeInput !== 'pickup') && (
                        <React.Fragment key="pickup-loc">
                            <OverlayView position={pickupCoords} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
                                <div
                                    onClick={() => {
                                        if (orderState === 'DRAFTING' || allowMarkerClick) {
                                            setActiveInput('pickup');
                                            setIsMapSelecting(true);
                                            setMapCenter(pickupCoords.lat, pickupCoords.lng);
                                        }
                                    }}
                                    className="w-6 h-6 bg-emerald-500 rounded-full border-4 border-white shadow-xl -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:scale-110 transition-transform flex items-center justify-center"
                                >
                                    <div className="w-1.5 h-1.5 bg-white rounded-full" />
                                </div>
                            </OverlayView>
                            <OverlayView position={pickupCoords} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
                                <div className="absolute -translate-x-1/2 -translate-y-12 flex flex-col items-center z-[9999] pointer-events-none">
                                    <div className="bg-emerald-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg border border-white/20 whitespace-nowrap">Pickup</div>
                                    <div className="w-2 h-2 bg-emerald-600 rotate-45 -mt-1 shadow-sm"></div>
                                </div>
                            </OverlayView>
                        </React.Fragment>
                    )}

                    {dropoffCoords && (!isMapSelecting || activeInput !== 'dropoff') && (
                        <>
                            {/* Phase 5: Destination flag marker (Uber/Bolt style) */}
                            <OverlayView
                                position={dropoffCoords}
                                mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                            >
                                <div
                                    onClick={() => {
                                        if (orderState === 'DRAFTING' || allowMarkerClick) {
                                            setActiveInput('dropoff');
                                            setIsMapSelecting(true);
                                            setMapCenter(dropoffCoords.lat, dropoffCoords.lng);
                                        }
                                    }}
                                    className="relative -translate-x-1/2 -translate-y-full cursor-pointer hover:scale-110 transition-transform"
                                >
                                    <div className="flex flex-col items-center">
                                        <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center shadow-2xl border-2 border-white">
                                            <Flag className="w-4 h-4 text-white" />
                                        </div>
                                        <div className="w-1 h-8 bg-red-600 shadow-sm -mt-0.5 rounded-full"></div>
                                    </div>
                                </div>
                            </OverlayView>
                            <OverlayView
                                position={dropoffCoords}
                                mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                            >
                                <div className="absolute -translate-x-1/2 -translate-y-12 flex flex-col items-center z-[9998] pointer-events-none">
                                    <div className="bg-red-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg border border-white/20 whitespace-nowrap">
                                        Drop-Off
                                    </div>
                                    <div className="w-2 h-2 bg-red-600 rotate-45 -mt-1 shadow-sm"></div>
                                </div>
                            </OverlayView>
                        </>
                    )}

                    {/* Waypoint Markers — last waypoint is always red (Final Destination) */}
                    {waypointCoords.map((coords, idx) => {
                        const isLast = idx === waypointCoords.length - 1 && !dropoffCoords;
                        const dotColor = isLast ? 'bg-red-500' : ['bg-orange-500', 'bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-teal-500'][idx % 5];
                        const labelBg = isLast ? 'bg-red-600' : 'bg-purple-600';
                        const labelText = isLast ? 'Final Drop-off' : `Stop ${idx + 1}`;
                        return (
                            (!isMapSelecting || activeInput !== `waypoint-${idx}`) && (
                                <React.Fragment key={`wp-${idx}`}>
                                    <OverlayView
                                        position={coords}
                                        mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                                    >
                                        <div
                                            onClick={() => {
                                                if (orderState === 'DRAFTING' || allowMarkerClick) {
                                                    setActiveInput(`waypoint-${idx}`);
                                                    setIsMapSelecting(true);
                                                    setMapCenter(coords.lat, coords.lng);
                                                }
                                            }}
                                            className={`${isLast ? 'w-6 h-6' : 'w-5 h-5'} ${dotColor} rounded-full border-4 border-white shadow-xl -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:scale-110 transition-transform flex items-center justify-center`}
                                        >
                                            <div className={`${isLast ? 'w-1.5 h-1.5' : 'w-1 h-1'} bg-white rounded-full`} />
                                        </div>
                                    </OverlayView>
                                    <OverlayView
                                        position={coords}
                                        mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                                    >
                                        <div className="absolute -translate-x-1/2 -translate-y-12 flex flex-col items-center z-[9997] pointer-events-none">
                                            <div className={`${labelBg} text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg border border-white/20 whitespace-nowrap`}>
                                                {labelText}
                                            </div>
                                            <div className={`w-2 h-2 ${labelBg} rotate-45 -mt-1 shadow-sm`}></div>
                                        </div>
                                    </OverlayView>
                                </React.Fragment>
                            )
                        );
                    })}

                    {driverCoords && (
                        <>
                            {/* Phase 5: GPS accuracy circle (translucent blue, like Google Maps) */}
                            {driverAccuracy > 25 && (
                                <OverlayView
                                    position={driverCoords}
                                    mapPaneName={OverlayView.OVERLAY_LAYER}
                                >
                                    <div
                                        className="rounded-full bg-blue-400/15 border border-blue-400/30 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                                        style={{
                                            width: `${Math.min(driverAccuracy * 2, 300)}px`,
                                            height: `${Math.min(driverAccuracy * 2, 300)}px`,
                                        }}
                                    />
                                </OverlayView>
                            )}
                            <OverlayView
                                position={driverCoords}
                                mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                            >
                                <VehicleIcon
                                    type={driverVehicleType}
                                    bearing={driverBearing}
                                    color="brand"
                                    isDriver={true}
                                />
                            </OverlayView>
                            {driverLabel && (
                                <OverlayView
                                    position={driverCoords}
                                    mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                                >
                                    <div className="absolute -translate-x-1/2 -translate-y-20 flex flex-col items-center z-[9999] cursor-default" style={{ minWidth: '120px' }}>
                                        <div className="bg-brand-600 px-4 py-2 rounded-2xl shadow-xl text-xs font-black text-white whitespace-nowrap border border-brand-500 flex items-center gap-2">
                                            <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                                            </span>
                                            <span>{driverLabel}</span>
                                        </div>
                                        <div className="w-2 h-2 bg-brand-600 rotate-45 -mt-1 shadow-sm"></div>
                                    </div>
                                </OverlayView>
                            )}
                        </>
                    )}

                    {(orderState === 'IDLE' || orderState === 'DRAFTING' || orderState === 'MATCHING') && nearbyVehicles.map(vehicle => (
                        <React.Fragment key={vehicle.id}>
                            <OverlayView
                                position={vehicle.position}
                                mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                            >
                                <VehicleIcon
                                    type={vehicle.type}
                                    bearing={vehicle.bearing}
                                    color="blue"
                                />
                            </OverlayView>
                        </React.Fragment>
                    ))}

                    {/* Shadow outline for depth */}
                    <Polyline
                        path={decodedPath}
                        options={{
                            strokeColor: '#1e3a5f',
                            strokeOpacity: 0.25,
                            strokeWeight: 8,
                            geodesic: true,
                            zIndex: 99,
                            visible: decodedPath.length > 0
                        }}
                    />
                    {/* Main route polyline — 5px industry standard */}
                    <Polyline
                        path={decodedPath}
                        options={{
                            strokeColor: '#4285F4',
                            strokeOpacity: 1,
                            strokeWeight: 5,
                            geodesic: true,
                            zIndex: 100,
                            visible: decodedPath.length > 0
                        }}
/>
                    </GoogleMap>

                {/* ── Phase 3: Navigation banner (next maneuver) — Uber/Bolt style ── */}
                {orderState === 'IN_TRANSIT' && nextManeuver && !isMapSelecting && (
                    <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-100 px-4 py-3 flex items-center gap-3 min-w-[220px] animate-in slide-in-from-top-4 duration-300">
                            <div className="w-11 h-11 rounded-xl bg-brand-600 flex items-center justify-center text-white flex-shrink-0 shadow-lg">
                                <ManeuverIcon maneuver={nextManeuver.maneuver} />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-lg font-black text-gray-900 leading-none">
                                    {nextManeuver.distanceMeters >= 1000
                                        ? `${(nextManeuver.distanceMeters / 1000).toFixed(1)} km`
                                        : `${Math.round(nextManeuver.distanceMeters)} m`}
                                </span>
                                <span className="text-[11px] font-bold text-gray-500 truncate">{nextManeuver.streetName || nextManeuver.instructions || 'Continue'}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Overview / Recenter / Compass buttons — 3D Uber-style controls */}
                {(orderState === 'IN_TRANSIT' || orderState === 'DRIVER_IDLE') && !isMapSelecting && (
                    <div className="absolute right-4 top-24 z-10 flex flex-col gap-2.5">
                        {/* Compass button — toggles heading-up vs north-up */}
                        {orderState === 'IN_TRANSIT' && (
                            <button
                                onClick={() => setHeadingUp(!headingUp)}
                                className={`group relative w-13 h-13 rounded-2xl flex items-center justify-center transition-all active:scale-90 active:shadow-lg ${
                                    headingUp
                                        ? 'bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-[0_6px_16px_rgba(22,163,74,0.45),0_2px_4px_rgba(0,0,0,0.2)] ring-1 ring-brand-400/40'
                                        : 'bg-gradient-to-br from-white to-gray-50 text-gray-700 shadow-[0_4px_12px_rgba(0,0,0,0.18),0_1px_2px_rgba(0,0,0,0.1)] ring-1 ring-gray-200/60 hover:from-gray-50 hover:to-gray-100'
                                }`}
                                title={headingUp ? 'Switch to North-up' : 'Switch to heading-up navigation'}
                                style={{ width: '52px', height: '52px' }}
                            >
                                {/* top inner highlight for 3D depth */}
                                <span className="absolute inset-x-3 top-1.5 h-2.5 rounded-full bg-white/30 pointer-events-none" />
                                <Compass className={`relative w-6 h-6 drop-shadow-sm ${headingUp ? 'animate-pulse' : ''}`} style={headingUp ? { transform: `rotate(${driverBearing}deg)` } : undefined} strokeWidth={2.2} />
                            </button>
                        )}
                        {/* Overview button — show full route */}
                        {orderState === 'IN_TRANSIT' && cameraMode !== 'overview' && (pickupCoords || dropoffCoords) && (
                            <button
                                onClick={() => {
                                    const points: any[] = [];
                                    if (driverCoords) points.push(driverCoords);
                                    if (pickupCoords) points.push(pickupCoords);
                                    if (waypointCoords) waypointCoords.forEach((wp: any) => { if (wp) points.push(wp); });
                                    if (dropoffCoords) points.push(dropoffCoords);
                                    if (points.length > 0) fitBounds(points);
                                    setCameraMode('overview');
                                }}
                                className="group relative w-13 h-13 rounded-2xl flex items-center justify-center text-gray-700 transition-all active:scale-90 active:shadow-lg bg-gradient-to-br from-white to-gray-50 shadow-[0_4px_12px_rgba(0,0,0,0.18),0_1px_2px_rgba(0,0,0,0.1)] ring-1 ring-gray-200/60 hover:from-gray-50 hover:to-gray-100"
                                title="Show full route"
                                style={{ width: '52px', height: '52px' }}
                            >
                                <span className="absolute inset-x-3 top-1.5 h-2.5 rounded-full bg-white/30 pointer-events-none" />
                                <Navigation className="relative w-6 h-6 drop-shadow-sm" strokeWidth={2.2} />
                            </button>
                        )}
                        {/* Recenter button — lock on driver */}
                        {cameraMode !== 'follow' && (
                            <button
                                onClick={() => {
                                    setCameraMode('follow');
                                    clearUserInteraction();
                                }}
                                className="group relative w-13 h-13 rounded-2xl flex items-center justify-center text-white transition-all active:scale-90 active:shadow-lg bg-gradient-to-br from-brand-500 to-brand-700 shadow-[0_6px_16px_rgba(22,163,74,0.45),0_2px_4px_rgba(0,0,0,0.2)] ring-1 ring-brand-400/40 hover:from-brand-600 hover:to-brand-800"
                                title="Recenter on driver"
                                style={{ width: '52px', height: '52px' }}
                            >
                                <span className="absolute inset-x-3 top-1.5 h-2.5 rounded-full bg-white/30 pointer-events-none" />
                                <MapPin className="relative w-6 h-6 drop-shadow-sm" strokeWidth={2.2} />
                            </button>
                        )}
                    </div>
                )}

                {isMapSelecting && (
                    <>
                        {/* Top Hint */}
                        <div className="absolute top-24 left-0 right-0 flex justify-center z-10 pointer-events-none">
                            <div className="bg-white/90 px-6 py-3 rounded-2xl shadow-2xl border border-white/50 flex items-center space-x-3 animate-in slide-in-from-top-4 duration-500">
                                <div className="w-8 h-8 bg-brand-50 rounded-xl flex items-center justify-center">
                                    <GripVertical className="w-4 h-4 text-brand-600" />
                                </div>
                                <p className="text-sm font-black text-gray-900">Drag map to move pin</p>
                            </div>
                        </div>

                        {/* Cancel Button */}
                        <div className="absolute top-24 left-6 z-10">
                            <button
                                onClick={() => setIsMapSelecting(false)}
                                className="w-12 h-12 bg-white rounded-2xl shadow-2xl flex items-center justify-center text-gray-900 hover:bg-gray-50 active:scale-95 transition-all border border-gray-100"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
                            <div className={`mb-20 transition-all duration-300 ease-out transform ${isPanning ? '-translate-y-6 scale-110' : 'translate-y-0 scale-100'}`}>
                                {/* Label */}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-6 whitespace-nowrap animate-in fade-in slide-in-from-bottom-2 duration-500">
                                    <div className="bg-gray-900/95 text-white text-[11px] font-black px-4 py-2 rounded-2xl uppercase tracking-widest shadow-2xl border border-white/20 flex items-center space-x-2">
                                        <div className={`w-2 h-2 rounded-full animate-pulse ${activeInput === 'pickup' ? 'bg-green-500' : activeInput === 'dropoff' ? 'bg-red-500' : 'bg-brand-500'}`}></div>
                                        <span>Set {activeInput === 'pickup' ? 'Pickup' : activeInput === 'dropoff' ? 'Dropoff' : `Stop ${parseInt(activeInput?.split('-')[1] || '0') + 1}`}</span>
                                    </div>
                                    <div className="w-3 h-3 bg-gray-900/95 rotate-45 mx-auto -mt-1.5 border-r border-b border-white/20"></div>
                                </div>

                                {/* Pin */}
                                <div className="relative flex flex-col items-center">
                                    <div className={`w-14 h-14 rounded-[2rem] border-[6px] border-white shadow-2xl flex items-center justify-center transition-all duration-500 ${activeInput === 'pickup' ? 'bg-green-600' : 'bg-red-600'} ${!isPanning ? 'ring-4 ring-white/30' : ''}`}>
                                        {activeInput === 'pickup' ? (
                                            <MapPin className="w-6 h-6 text-white" />
                                        ) : (
                                            <Navigation className="w-6 h-6 text-white" />
                                        )}
                                    </div>
                                    <div className={`w-1.5 h-12 -mt-1 shadow-2xl transition-colors duration-500 rounded-full ${activeInput === 'pickup' ? 'bg-green-600' : 'bg-red-600'}`}></div>
                                </div>
                            </div>

                            {/* Shadow */}
                            <div className={`absolute w-8 h-2.5 bg-black/30 rounded-full blur-[4px] transition-all duration-500 ${isPanning ? 'scale-150 opacity-10 translate-y-4' : 'scale-100 opacity-40 translate-y-0'}`} style={{ marginTop: '48px' }}></div>
                        </div>
                    </>
                )}

            </div>
            {!mapVisible && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#f8f9fa] z-10 pointer-events-none">
                    <Truck className="w-10 h-10 text-brand-600 animate-bounce mb-3" />
                </div>
            )}
        </div>
    );
};

export default MapLayer;





