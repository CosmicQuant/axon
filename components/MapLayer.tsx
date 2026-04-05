
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleMap, MarkerF, Polyline, InfoWindow, OverlayView } from '@react-google-maps/api';
import { useMapState } from '@/context/MapContext';
import { APP_CONFIG } from '@/config';
import { Truck, Navigation, MapPin, GripVertical, X, Bike, Car } from 'lucide-react';

const VehicleIcon = ({ type, bearing = 0, color = "blue", isDriver = false }: { type: string, bearing?: number, color?: string, isDriver?: boolean }) => {
    const getIcon = () => {
        const t = type.toLowerCase();
        if (t.includes('boda')) return Bike;
        if (t.includes('tuk') || t.includes('car')) return Car;
        return Truck;
    };
    const Icon = getIcon();

    return (
        <div className="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2">
            {/* Direction Arrow (Rotated) */}
            <div
                className="absolute transition-transform duration-700 ease-in-out"
                style={{ transform: `rotate(${bearing}deg)` }}
            >
                <div className={`w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[12px] opacity-80 ${color === 'blue' ? 'border-b-blue-500' : 'border-b-brand-500'} -translate-y-8 shadow-lg`} />
            </div>

            {/* Main Icon (Not Rotated) - Removed white background circle */}
            <div
                className={`transition-all duration-300 drop-shadow-[0_4px_4px_rgba(0,0,0,0.25)] ${color === 'blue' ? 'text-blue-600' : 'text-brand-600'} ${isDriver ? 'scale-125' : 'scale-100'}`}
            >
                {isDriver && (
                    <div className="absolute inset-0 rounded-full animate-ping bg-brand-500/20 -z-10" />
                )}
                <Icon size={isDriver ? 32 : 24} className="relative z-10" />
            </div>
        </div>
    );
};

const containerStyle = {
    width: '100%',
    height: '100%'
};

const center = {
    lat: -1.2921,
    lng: 36.8219
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
        allowMarkerClick,
        setActiveInput,
        waypointCoords,
        setWaypointCoords,
        driverLabel
    } = useMapState();

    const isMapAnimatingRef = useRef(false);
    const animationFrameRef = useRef<number | null>(null);
    const prewarmDivRef = useRef<HTMLDivElement | null>(null);
    const prewarmMapRef = useRef<google.maps.Map | null>(null);
    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [decodedPath, setDecodedPath] = useState<google.maps.LatLngLiteral[]>([]);

    useEffect(() => {
        if (routePolyline) {
            console.log("[Diagnostic: MapLayer] routePolyline updated:",
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
            mapInstance.setZoom(14);
            initialCenterSet.current = true;
        }
        // Mark ready immediately once tiles load (or after 3s failsafe for desktop)
        const markReady = () => { mapReadyRef.current = true; };
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

    const onUnmount = useCallback(function callback(map: google.maps.Map) {
        setMap(null);
        // Clean up pre-warm map
        if (prewarmDivRef.current?.parentNode) {
            prewarmDivRef.current.remove();
            prewarmDivRef.current = null;
            prewarmMapRef.current = null;
        }
    }, []);

    // Handle Fit Bounds — Uber/Bolt-style smooth camera transitions
    const lastBoundsRef = useRef('');
    const cameraTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

    useEffect(() => {
        if (map && boundsToFit && boundsToFit.length > 0) {
            const dynamicPadding = { top: 96, bottom: 400, left: 56, right: 56 };
            const boundsKey = JSON.stringify(boundsToFit);

            if (boundsKey === lastBoundsRef.current) {
                resetBoundsTrigger();
                return;
            }

            lastBoundsRef.current = boundsKey;

            cameraTimeoutsRef.current.forEach(t => clearTimeout(t));
            cameraTimeoutsRef.current = [];

            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
                isMapAnimatingRef.current = false;
            }

            // ── Professional flyTo engine ──────────────────────────────────
            // Direct animation with moveCamera — no screenshots, no hiding.
            // Vector Maps (WebGL) handles progressive tile rendering with fade-in.
            //
            // Zoom-out uses easeInOutCubic (slow start gives nearby tiles time to
            // render before the camera pulls away, slow end lets destination tiles
            // settle). Zoom-in uses easeOutQuint (fast departure, gentle arrival).

            const easeOutQuint = (t: number) => 1 - Math.pow(1 - t, 5);
            const easeInOutCubic = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

            const flyTo = (
                target: { lat: number; lng: number },
                targetZoom: number,
                durationMs: number,
                ease: (t: number) => number,
                onDone: () => void
            ) => {
                const startCenter = map.getCenter();
                const startZoom = map.getZoom() ?? 14;
                if (!startCenter) { onDone(); return; }
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
                        onDone();
                    }
                };
                animationFrameRef.current = requestAnimationFrame(tick);
            };

            const applyCamera = () => {
                if (boundsToFit.length === 1) {
                    // Single point: zoom-in fly (2.8s, fast start/gentle landing)
                    flyTo(boundsToFit[0], 18, 2800, easeOutQuint, () => resetBoundsTrigger());
                } else {
                    // Multi-point: compute exact target via fitBounds, then animate
                    const bounds = new google.maps.LatLngBounds();
                    boundsToFit.forEach(coord => bounds.extend(coord));

                    // Save current position
                    const startCenter = map.getCenter();
                    const startZoom = map.getZoom() ?? 14;

                    // Let Google compute exact target (synchronous on Vector Maps)
                    map.fitBounds(bounds, dynamicPadding);
                    const targetZoom = map.getZoom() ?? 14;
                    const targetCenter = map.getCenter();
                    const target = {
                        lat: targetCenter?.lat() ?? bounds.getCenter().lat(),
                        lng: targetCenter?.lng() ?? bounds.getCenter().lng()
                    };

                    // Snap back to origin instantly
                    if (startCenter) {
                        map.moveCamera({ center: startCenter, zoom: startZoom });
                    }

                    const isZoomingOut = targetZoom < startZoom;
                    const duration = isZoomingOut ? 2400 : 2200;
                    const ease = isZoomingOut ? easeInOutCubic : easeOutQuint;

                    // Pre-warm tile cache: jump hidden map to target, wait for tiles, then animate
                    const prewarm = prewarmMapRef.current;
                    if (prewarm && isZoomingOut) {
                        isMapAnimatingRef.current = true; // lock while pre-warming
                        prewarm.fitBounds(bounds, dynamicPadding);
                        let prewarmFired = false;
                        const startAnim = () => {
                            if (prewarmFired) return;
                            prewarmFired = true;
                            flyTo(target, targetZoom, duration, ease, () => resetBoundsTrigger());
                        };
                        google.maps.event.addListenerOnce(prewarm, 'tilesloaded', startAnim);
                        // 1.2s max wait — don't hold animation forever on slow networks
                        cameraTimeoutsRef.current.push(setTimeout(startAnim, 1200) as any);
                    } else {
                        flyTo(target, targetZoom, duration, ease, () => resetBoundsTrigger());
                    }
                }
            };

            // Fire immediately if tiles are ready, otherwise wait for tiles + failsafe
            if (mapReadyRef.current) {
                const t = setTimeout(applyCamera, 50);
                cameraTimeoutsRef.current.push(t);
            } else {
                let started = false;
                const go = () => { if (!started) { started = true; mapReadyRef.current = true; applyCamera(); } };
                google.maps.event.addListenerOnce(map, 'tilesloaded', go);
                cameraTimeoutsRef.current.push(setTimeout(go, 3000) as any);
            }
        }
    }, [map, boundsToFit, resetBoundsTrigger]);

    useEffect(() => {
        return () => {
            cameraTimeoutsRef.current.forEach(t => clearTimeout(t));
        };
    }, []);

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

    if (!isLoaded) return <div className="fixed inset-0 bg-gray-100 flex items-center justify-center"><Truck className="w-10 h-10 text-brand-600 animate-bounce" /></div>;

    return (
        <div className="w-full h-full z-0 pointer-events-auto">
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
                }}
                onDragEnd={() => setIsPanning(false)}
                options={{
                    isFractionalZoomEnabled: true,
                    mapId: "DEMO_MAP_ID",
                    disableDefaultUI: true,
                    gestureHandling: 'greedy' // Enables one-finger panning on mobile
                }}
            >
                {userLocation && !pickupCoords && !isMapSelecting && (
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
                                className="w-6 h-6 bg-red-500 rounded-full border-4 border-white shadow-xl -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:scale-110 transition-transform flex items-center justify-center"
                            >
                                <div className="w-1.5 h-1.5 bg-white rounded-full" />
                            </div>
                        </OverlayView>
                        <OverlayView
                            position={dropoffCoords}
                            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                        >
                            <div className="absolute -translate-x-1/2 -translate-y-12 flex flex-col items-center z-[9998] pointer-events-none">
                                <div className="bg-red-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg border border-white/20">
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
                                        <div className={`${labelBg} text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg border border-white/20`}>
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

                <Polyline
                    path={decodedPath}
                    options={{
                        isFractionalZoomEnabled: true,
                        mapId: "DEMO_MAP_ID",
                        strokeColor: '#2563eb',
                        strokeOpacity: 1,
                        strokeWeight: 6,
                        geodesic: true,
                        zIndex: 100,
                        visible: decodedPath.length > 0
                    }}
                />
            </GoogleMap>

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
    );
};

export default MapLayer;





