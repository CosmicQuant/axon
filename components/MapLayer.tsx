
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

interface MapLayerProps {
    driverLabel?: string;
}

const MapLayer: React.FC<MapLayerProps> = ({ driverLabel }) => {
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
        isPanning,
        setIsPanning,
        boundsToFit,
        resetBoundsTrigger,
        allowMarkerClick,
        setActiveInput,
        waypointCoords,
        setWaypointCoords
    } = useMapState();

    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [decodedPath, setDecodedPath] = useState<google.maps.LatLngLiteral[]>([]);
    const wasPanned = useRef(false);

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

    const onLoad = useCallback(function callback(map: google.maps.Map) {
        setMap(map);
    }, []);

    const onUnmount = useCallback(function callback(map: google.maps.Map) {
        setMap(null);
    }, []);

    // Handle Fit Bounds
    useEffect(() => {
        if (map && boundsToFit && boundsToFit.length > 0) {
            if (boundsToFit.length === 1) {
                map.panTo(boundsToFit[0]);
                let currentZoom = map.getZoom() || 13;
                let targetZoom = 18;
                if (currentZoom < targetZoom) {
                    const zoomIn = setInterval(() => {
                        currentZoom += 1;
                        map.setZoom(currentZoom);
                        if (currentZoom >= targetZoom) clearInterval(zoomIn);
                    }, 100); // 100ms interval for seamless smooth zoom effect
                } else {
                    map.setZoom(targetZoom);
                }
            } else {
                const bounds = new google.maps.LatLngBounds();
                boundsToFit.forEach(coord => bounds.extend(coord));
                
                // Ensure we start from the pickup (first coordinate) to keep the animation anchored
                if (boundsToFit.length > 1) {
                    map.panTo(boundsToFit[0]);
                }
                
                // Small delay to allow the pan to settle before zooming out gracefully
                setTimeout(() => {
                    map.fitBounds(bounds, { top: 70, bottom: 300, left: 70, right: 70 });
                }, 100);
            }
            resetBoundsTrigger();
        }
    }, [map, boundsToFit, resetBoundsTrigger]);

    // Sync map center back to context when user pans
    const onIdle = () => {
        if (map && isMapSelecting && wasPanned.current) {
            const center = map.getCenter();
            if (center) {
                setMapCenter(center.lat(), center.lng());
            }
            wasPanned.current = false;
        }
    };

    if (!isLoaded) return <div className="fixed inset-0 bg-gray-100 flex items-center justify-center"><Truck className="w-10 h-10 text-brand-600 animate-bounce" /></div>;

    return (
        <div className="w-full h-full z-0 pointer-events-auto">
            <GoogleMap
                mapContainerStyle={containerStyle}
                center={mapCenter || center}
                zoom={zoom}
                onLoad={onLoad}
                onUnmount={onUnmount}
                onIdle={onIdle}
                onClick={(e) => {
                    if (isMapSelecting && e.latLng) {
                        setMapCenter(e.latLng.lat(), e.latLng.lng());
                        wasPanned.current = true;
                    }
                }}
                onDragStart={() => {
                    setIsPanning(true);
                    wasPanned.current = true;
                }}
                onDragEnd={() => setIsPanning(false)}
                options={{
                    disableDefaultUI: true,
                    // Show points of interest labels by default to help with navigation
                    styles: []
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

                {/* Waypoint Markers */}
                {waypointCoords.map((coords, idx) => (
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
                                    className="w-5 h-5 bg-purple-500 rounded-full border-4 border-white shadow-xl -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:scale-110 transition-transform flex items-center justify-center"
                                >
                                    <div className="w-1 h-1 bg-white rounded-full" />
                                </div>
                            </OverlayView>
                            <OverlayView
                                position={coords}
                                mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                            >
                                <div className="absolute -translate-x-1/2 -translate-y-12 flex flex-col items-center z-[9997] pointer-events-none">
                                    <div className="bg-purple-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg border border-white/20">
                                        Stop {idx + 1}
                                    </div>
                                    <div className="w-2 h-2 bg-purple-600 rotate-45 -mt-1 shadow-sm"></div>
                                </div>
                            </OverlayView>
                        </React.Fragment>
                    )
                ))}

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
                        strokeColor: '#2563eb',
                        strokeOpacity: 1,
                        strokeWeight: 6,
                        geodesic: true,
                        zIndex: 100,
                        visible: decodedPath.length > 0
                    }}
                />
            </GoogleMap>

            {(orderState === 'MATCHING' && !isMapSelecting) && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-10 bg-brand-900/10">
                    <div className="bg-white/90 px-8 py-4 rounded-[2rem] shadow-2xl border border-white/50 flex flex-col items-center space-y-4 animate-in zoom-in duration-500">
                        <div className="relative">
                            <div className="w-16 h-16 bg-brand-600 rounded-full animate-ping opacity-20 absolute inset-0"></div>
                            <div className="w-16 h-16 bg-brand-600 rounded-full flex items-center justify-center relative shadow-lg shadow-brand-500/50">
                                <Truck className="w-8 h-8 text-white animate-bounce" />
                            </div>
                        </div>
                        <div className="text-center">
                            <h3 className="text-xl font-extrabold text-gray-900">Matching Driver</h3>
                            <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mt-1">Finding nearby couriers...</p>
                        </div>
                    </div>
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

            {/* Current Location Button */}
            {!isMapSelecting && (
                <div className="absolute top-24 right-4 z-10">
                    <button
                        onClick={() => {
                            if (userLocation && map) {
                                map.panTo(userLocation);
                                map.setZoom(17);
                            } else {
                                // Fallback if userLocation is not yet available in context
                                if (navigator.geolocation) {
                                    navigator.geolocation.getCurrentPosition(
                                        (position) => {
                                            const pos = {
                                                lat: position.coords.latitude,
                                                lng: position.coords.longitude,
                                            };
                                            map?.panTo(pos);
                                            map?.setZoom(17);
                                        },
                                        () => {
                                            // Handle error
                                        }
                                    );
                                }
                            }
                        }}
                        className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-700 hover:text-brand-600 hover:bg-gray-50 active:scale-95 transition-all border border-gray-100"
                    >
                        <Navigation className="w-6 h-6" />
                    </button>
                </div>
            )}
        </div>
    );
};

export default MapLayer;





