import { APP_CONFIG } from '../config';
import { Geolocation } from '@capacitor/geolocation'; // Import Capacitor Geolocation
import { Capacitor } from '@capacitor/core';
import toast from 'react-hot-toast';

interface Coordinates {
    lat: number;
    lng: number;
}

const SLANG_MAP: Record<string, string> = {
    'CBD': 'Nairobi Central, Nairobi',
    'TAO': 'Nairobi Central, Nairobi',
    'TOWN': 'Nairobi Central, Nairobi',
    'UPPER': 'Upper Hill, Nairobi',
    'WESTIE': 'Westlands, Nairobi',
    'ROYS': 'Roysambu, Nairobi',
    'KILE': 'Kileleshwa, Nairobi',
    'KILIMANI': 'Kilimani, Nairobi',
    'LAVI': 'Lavington, Nairobi',
    'SOUTH B': 'South B, Nairobi',
    'SOUTH C': 'South C, Nairobi',
    'LANGI': 'Langata, Nairobi',
    'RONGA': 'Ongata Rongai',
    'SYOKI': 'Syokimau',
    'KITEN': 'Kitengela',
    'THIKA RD': 'Thika Road, Nairobi',
    'MOMBASA RD': 'Mombasa Road, Nairobi',
};

const translateSlang = (query: string): string => {
    if (!query) return query;
    let translated = query.toUpperCase().trim();

    // Check for exact match first
    if (SLANG_MAP[translated]) return SLANG_MAP[translated];

    // Check for words within the query
    let result = query;
    Object.entries(SLANG_MAP).forEach(([slang, replacement]) => {
        const regex = new RegExp(`\\b${slang}\\b`, 'gi');
        result = result.replace(regex, replacement);
    });
    return result;
};

export const mapService = {
    /**
     * Geocode an address string to coordinates using Google Maps Geocoder (JS SDK)
     */
    geocodeAddress: async (address: string): Promise<{ lat: number, lng: number, formattedAddress: string } | null> => {
        if (!address) return null;

        const translatedAddress = translateSlang(address);

        if (typeof google === 'undefined' || !google.maps) {
            console.warn("Google Maps not loaded yet");
            return null;
        }

        return new Promise((resolve) => {
            const geocoder = new google.maps.Geocoder();
            geocoder.geocode({ address: translatedAddress }, (results, status) => {
                if (status === google.maps.GeocoderStatus.OK && results && results.length > 0) {
                    const location = results[0].geometry.location;
                    resolve({
                        lat: location.lat(),
                        lng: location.lng(),
                        formattedAddress: results[0].formatted_address
                    });
                } else {
                    console.error(`Geocoding failed for address: "${address}" (translated: "${translatedAddress}") due to ${status}`);
                    resolve(null);
                }
            });
        });
    },

    /**
     * Get autocomplete suggestions for a query using Google Places Autocomplete Service (JS SDK)
     */
    getSuggestions: async (query: string): Promise<Array<{ label: string, lat: number, lng: number }>> => {
        if (!query || query.length < 2) return [];

        const translatedQuery = translateSlang(query);

        // Check if google maps is loaded
        if (typeof google === 'undefined' || !google.maps || !google.maps.places) {
            console.warn("Google Maps Places library not loaded yet");
            return [];
        }

        try {
            const request = {
                input: translatedQuery,
                includedRegionCodes: ['ke']
            };

            // Cast to any since standard @types/google.maps might not be fully updated to the 2026 API spec
            const AutocompleteSuggestion = (google.maps.places as any).AutocompleteSuggestion;

            if (AutocompleteSuggestion && AutocompleteSuggestion.fetchAutocompleteSuggestions) {
                const response = await AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
                if (response && response.suggestions) {
                    return response.suggestions.map((s: any) => ({
                        // The text wrapper contains the display text for the prediction
                        label: s.placePrediction.text.text,
                        lat: 0,
                        lng: 0
                    }));
                }
                return [];
            } else {
                // Fallback to old API if for some reason the new class isn't mounted yet
                return new Promise((resolve) => {
                    const service = new google.maps.places.AutocompleteService();
                    service.getPlacePredictions({
                        input: translatedQuery,
                        componentRestrictions: { country: 'ke' }
                    }, (predictions, status) => {
                        if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
                            resolve(predictions.map(p => ({ label: p.description, lat: 0, lng: 0 })));
                        } else {
                            resolve([]);
                        }
                    });
                });
            }
        } catch (error) {
            console.error("Autocomplete request failed:", error);
            return [];
        }
    },

    /**
     * Reverse geocode coordinates to an address string using Google Maps Geocoder (JS SDK)
     */
    reverseGeocode: async (lat: number, lng: number): Promise<string | null> => {
        if (typeof google === 'undefined' || !google.maps) {
            console.warn("Google Maps not loaded yet");
            return null;
        }

        return new Promise((resolve) => {
            const geocoder = new google.maps.Geocoder();
            geocoder.geocode({ location: { lat, lng } }, (results, status) => {
                if (status === google.maps.GeocoderStatus.OK && results && results.length > 0) {
                    // Filter out raw plus codes. Ride-hailing apps want the closest named street or building.
                    const validResults = results.filter(r => !r.types.includes('plus_code'));

                    // Prioritize specific location types to get the most human-readable option
                    const bestResult = validResults.find(r => r.types.includes('route') || r.types.includes('street_address'))
                        || validResults.find(r => r.types.includes('point_of_interest') || r.types.includes('establishment'))
                        || validResults.find(r => r.types.includes('neighborhood') || r.types.includes('sublocality'))
                        || validResults[0]
                        || results[0]; // Absolute fallback

                    resolve(bestResult.formatted_address);
                } else {
                    console.error("Reverse geocoding failed due to " + status);
                    resolve(null);
                }
            });
        });
    },

    /**
     * Get current location
     */
    getCurrentLocation: async (): Promise<Coordinates | null> => {
        try {
            // First check if native
            if (Capacitor.isNativePlatform()) {
                // Request permissions first on native
                const perm = await Geolocation.checkPermissions();
                if (perm.location !== 'granted') {
                    const req = await Geolocation.requestPermissions({ permissions: ['location'] });
                    if (req.location !== 'granted') {
                        throw new Error("Location permission denied");
                    }
                }

                if (Capacitor.getPlatform() === 'android') {
                    try {
                        await new Promise<void>((resolve, reject) => {
                            const cordova = (window as any).cordova;
                            if (cordova && cordova.plugins && cordova.plugins.locationAccuracy) {
                                // Bypass canRequest and force the native Google dialog
                                cordova.plugins.locationAccuracy.request(
                                    cordova.plugins.locationAccuracy.REQUEST_PRIORITY_HIGH_ACCURACY,
                                    () => resolve(),
                                    (error: any) => reject(error)
                                );
                            } else {
                                resolve();
                            }
                        });
                    } catch (accuracyError) {
                        console.warn("Failed to request high accuracy location:", accuracyError);
                        // Do not throw here, let Geolocation.getCurrentPosition try anyway
                    }
                }

                // Use Capacitor Geolocation
                // enableHighAccuracy: true is KEY for the "Turn on precise location" prompt
                const position = await Geolocation.getCurrentPosition({
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 3000 // Don't use very old cached positions
                });
                return {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
            } else {
                // Web Fallback
                return new Promise((resolve, reject) => {
                    if (!navigator.geolocation) {
                        reject(new Error("Geolocation not supported"));
                        return;
                    }
                    navigator.geolocation.getCurrentPosition(
                        (pos) => resolve({
                            lat: pos.coords.latitude,
                            lng: pos.coords.longitude
                        }),
                        (err) => reject(err),
                        { enableHighAccuracy: true }
                    );
                });
            }
        } catch (error) {
            console.error("Error getting location", error);
            if (!Capacitor.isNativePlatform()) {
                toast.error("Please turn on your device's precise location (GPS) and grant location permissions to use the map accurately.", { duration: 6000 });
            } else {
                toast.error("Please enable precise location and GPS.", { duration: 5000 });
            }
            // Default to null if failed
            return null;
        }
    },

    /**
     * Calculate distance between two points in Kilometers (Haversine Formula)
     */
    calculateDistance: (start: Coordinates, end: Coordinates): number => {
        const R = 6371; // Radius of the earth in km
        const dLat = deg2rad(end.lat - start.lat);
        const dLon = deg2rad(end.lng - start.lng);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(start.lat)) * Math.cos(deg2rad(end.lat)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c; // Distance in km
        return d;
    },

    /**
     * Get routing data between points using Google Maps Directions Service (JS SDK)
     */
    getRoute: async (start: Coordinates, end: Coordinates, waypoints: Coordinates[] = [], vehicleType?: string, optimize: boolean = false): Promise<any> => {
        console.log("[Diagnostic: mapService.getRoute] Called with:", { start, end, waypointsCount: waypoints.length, vehicleType, optimize });
        if (typeof google === 'undefined' || !google.maps) {
            console.warn("Google Maps not loaded yet");
            return null;
        }

        // Validate Coordinates
        const isValid = (c: any) => c && typeof c.lat !== 'undefined' && typeof c.lng !== 'undefined' && !isNaN(parseFloat(c.lat)) && !isNaN(parseFloat(c.lng));

        if (!isValid(start) || !isValid(end)) {
            console.error("Invalid start or end coordinates provided to getRoute", { start, end });
            return null;
        }

        try {
            // New Plan: EXCLUSIVELY use Routes API (V2) for all specialized routing (Boda, Trucks)
            // Directions Service (V1) is deprecated as of Feb 2026 and should not even be initialized to avoid warnings.
            return await mapService.getRouteV2(start, end, waypoints, vehicleType, optimize);
        } catch (error) {
            console.error("Axon Routing Error (V2):", error);
            return null;
        }
    },

    /**
     * Fallback routing using Google Routes API (V2)
     */
    getRouteV2: async (start: Coordinates, end: Coordinates, waypoints: Coordinates[] = [], vehicleType?: string, optimize: boolean = false): Promise<any> => {
        console.log("[Diagnostic: mapService.getRouteV2] Using REST API (fetch) for Routes V2...");
        try {
            // Map vehicle type to V2 travel mode and routing preferences
            let travelMode = 'DRIVE';
            let routingPreference = 'TRAFFIC_AWARE_OPTIMAL';
            let vehicleInfo: any = undefined;
            let speedMultiplier = 1.0;

            const normalizedVehicle = vehicleType?.toLowerCase();

            if (normalizedVehicle?.includes('boda') || normalizedVehicle?.includes('moto') || normalizedVehicle?.includes('bike') || normalizedVehicle?.includes('tuk')) {
                travelMode = 'TWO_WHEELER';
                routingPreference = 'TRAFFIC_AWARE';
                speedMultiplier = 1.0;
            } else if (normalizedVehicle?.includes('lorry') || normalizedVehicle?.includes('truck') || normalizedVehicle?.includes('trailer')) {
                travelMode = 'DRIVE';
                routingPreference = 'TRAFFIC_AWARE_OPTIMAL';
                // User requested raw Google ETA, so we remove the 1.25x manual factor
                speedMultiplier = 1.0;
                // Standard Routes API V2 only supports emissionType in vehicleInfo
                vehicleInfo = { emissionType: 'DIESEL' };
            } else if (normalizedVehicle?.includes('van') || normalizedVehicle?.includes('pickup')) {
                travelMode = 'DRIVE';
                routingPreference = 'TRAFFIC_AWARE_OPTIMAL';
                speedMultiplier = 1.0;
            }

            if (optimize && waypoints.length > 1 && routingPreference === 'TRAFFIC_AWARE_OPTIMAL') {
                routingPreference = 'TRAFFIC_AWARE';
                // vehicleInfo (emissionType) is only supported with TRAFFIC_AWARE_OPTIMAL
                vehicleInfo = undefined;
            }

            const isOptimizing = optimize && waypoints.length > 1;

            const requestBody = {
                origin: { location: { latLng: { latitude: Number(start.lat), longitude: Number(start.lng) } } },
                destination: { location: { latLng: { latitude: Number(end.lat), longitude: Number(end.lng) } } },
                intermediates: waypoints.map(w => ({
                    location: { latLng: { latitude: Number(w.lat), longitude: Number(w.lng) } }
                })),
                travelMode,
                routingPreference,
                computeAlternativeRoutes: false,
                routeModifiers: {
                    avoidTolls: false,
                    avoidHighways: false,
                    avoidFerries: true,
                    vehicleInfo
                },
                polylineQuality: 'HIGH_QUALITY',
                optimizeWaypointOrder: isOptimizing,
                units: 'METRIC',
                languageCode: 'en-US'
            };

            const fieldMask = isOptimizing
                ? 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs,routes.optimizedIntermediateWaypointIndex'
                : 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs';

            const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Goog-Api-Key': APP_CONFIG.GOOGLE_MAPS_API_KEY,
                    'X-Goog-FieldMask': fieldMask
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Routes API Error: ${errorData.error?.message || response.statusText}`);
            }

            const data = await response.json();

            if (data && data.routes && data.routes.length > 0) {
                const route = data.routes[0];

                const parseDuration = (dur: string) => {
                    if (!dur) return 0;
                    return parseInt(dur.replace('s', ''), 10);
                };

                const totalDistance = route.distanceMeters || 0;
                const baseDuration = parseDuration(route.duration);
                const duration = Math.round(baseDuration * speedMultiplier);

                const geometry = route.polyline?.encodedPolyline || "";

                // Handle Legs
                let nextLegDistance = totalDistance;
                let nextLegDuration = duration;

                if (route.legs && route.legs.length > 0) {
                    const firstLeg = route.legs[0];
                    nextLegDistance = firstLeg.distanceMeters || 0;
                    nextLegDuration = Math.round(parseDuration(firstLeg.duration) * speedMultiplier);
                }

                console.log(`[Diagnostic: mapService] V2 REST Success (${travelMode}):`, {
                    distance: totalDistance,
                    duration,
                    multiplier: speedMultiplier
                });

                if (route.optimizedIntermediateWaypointIndex) {
                    console.log("[Diagnostic: mapService] V2 Optimization Index Found:", route.optimizedIntermediateWaypointIndex);
                }

                return {
                    geometry,
                    distance: totalDistance,
                    duration: duration,
                    nextLegDistance,
                    nextLegDuration,
                    waypoint_order: route.optimizedIntermediateWaypointIndex || waypoints.map((_, i) => i)
                };
            }
            return null;
        } catch (e) {
            console.error("V2 REST Route error:", e);
            return null;
        }
    },

    /**
     * Optimize the order of stops for the fastest route.
     * Uses Google's optimizeWaypoints to reorder intermediate stops.
     * Also generates verification codes for each stop.
     * 
     * @param pickup - Starting point (pickup location)
     * @param dropoff - Final destination
     * @param waypoints - Intermediate stops between pickup and dropoff
     * @returns Optimized stops array with verification codes and sequence order
     */
    optimizeStops: async (
        pickup: { lat: number; lng: number; address: string },
        dropoff: { lat: number; lng: number; address: string },
        waypoints: Array<{ id: string; lat: number; lng: number; address: string; contact?: any; instructions?: string }>,
        vehicleType?: string
    ): Promise<{
        optimizedStops: Array<{
            id: string;
            address: string;
            lat: number;
            lng: number;
            type: 'pickup' | 'dropoff' | 'waypoint';
            status: 'pending' | 'arrived' | 'completed';
            contact?: any;
            instructions?: string;
            verificationCode: string;
            sequenceOrder: number;
        }>;
        totalDistance: number;
        totalDuration: number;
        routeGeometry: string | null;
    }> => {
        // Generate a 4-digit verification code
        const generateCode = () => Math.floor(1000 + Math.random() * 9000).toString();

        // If no waypoints, just return pickup and dropoff with codes
        if (!waypoints || waypoints.length === 0) {
            const route = await mapService.getRoute(pickup, dropoff, [], vehicleType);
            return {
                optimizedStops: [
                    {
                        id: 'pickup-start',
                        address: pickup.address,
                        lat: pickup.lat,
                        lng: pickup.lng,
                        type: 'pickup',
                        status: 'pending',
                        verificationCode: generateCode(),
                        sequenceOrder: 0
                    },
                    {
                        id: 'dropoff-end',
                        address: dropoff.address,
                        lat: dropoff.lat,
                        lng: dropoff.lng,
                        type: 'dropoff',
                        status: 'pending',
                        verificationCode: generateCode(),
                        sequenceOrder: 1
                    }
                ],
                totalDistance: route?.distance || 0,
                totalDuration: route?.duration || 0,
                routeGeometry: route?.geometry || null
            };
        }

        // Include dropoff as a waypoint for optimization
        // This allows Google to find the fastest order including the final dropoff
        const allIntermediatePoints = [
            ...waypoints.map(w => ({ lat: w.lat, lng: w.lng })),
            { lat: dropoff.lat, lng: dropoff.lng }
        ];

        // Get optimized route with all stops including the final dropoff as part of the reorderable stops
        const route = await mapService.getFullyOptimizedRoute(pickup, allIntermediatePoints, vehicleType);

        // Build optimized stops array
        const optimizedStops: Array<{
            id: string;
            address: string;
            lat: number;
            lng: number;
            type: 'pickup' | 'dropoff' | 'waypoint';
            status: 'pending' | 'arrived' | 'completed';
            contact?: any;
            instructions?: string;
            verificationCode: string;
            sequenceOrder: number;
        }> = [];

        // Pickup is always first
        optimizedStops.push({
            id: 'pickup-start',
            address: pickup.address,
            lat: pickup.lat,
            lng: pickup.lng,
            type: 'pickup',
            status: 'pending',
            verificationCode: generateCode(),
            sequenceOrder: 0
        });

        // Reorder waypoints based on Google's full optimization
        console.log("[Diagnostic: Post-Optimization] Axon Map Engine: Raw Waypoint Order Response:", route?.full_optimized_order);

        // Generate an initial linear array mapping to 0..N including the final dropoff
        let fullOrder = [...waypoints.map((_, i) => i), waypoints.length];

        if (route && Array.isArray(route.full_optimized_order) && route.full_optimized_order.length === fullOrder.length) {
            fullOrder = route.full_optimized_order;
        } else {
            console.warn("Axon Map Engine: No route or missing full_optimized_order. Preserving original sequence.");
        }

        console.log("[Diagnostic: Post-Optimization] Axon Map Engine: Final Waypoint Order to use:", fullOrder);

        // Separate the reordered points into new waypoints and the final new dropoff
        const reorderedWaypoints = [];
        let newDropoffIndex = fullOrder[fullOrder.length - 1];

        fullOrder.slice(0, -1).forEach((originalIndex: number, newIndex: number) => {
            if (originalIndex === waypoints.length) {
                // The old dropoff is now a waypoint
                reorderedWaypoints.push({
                    id: 'temp-dropoff',
                    address: dropoff.address,
                    lat: dropoff.lat,
                    lng: dropoff.lng,
                    contact: undefined,
                    instructions: undefined
                });
            } else {
                const wp = waypoints[originalIndex];
                if (wp) reorderedWaypoints.push(wp);
            }
        });

        // Add the new intermediate waypoints to the optimizedStops list
        reorderedWaypoints.forEach((wp, index) => {
            optimizedStops.push({
                id: wp.id,
                address: wp.address,
                lat: wp.lat,
                lng: wp.lng,
                type: 'waypoint',
                status: 'pending',
                contact: wp.contact,
                instructions: wp.instructions,
                verificationCode: generateCode(),
                sequenceOrder: index + 1
            });
        });

        console.log("Axon Map Engine: Waypoints processed into stops. Count:", optimizedStops.length - 1); // -1 for pickup

        // The final item in the optimized list becomes the actual 'dropoff'
        let finalDropoffData;
        if (newDropoffIndex === waypoints.length) {
            finalDropoffData = dropoff;
        } else {
            finalDropoffData = waypoints[newDropoffIndex];
        }

        // Dropoff is always last
        optimizedStops.push({
            id: 'dropoff-end',
            address: finalDropoffData.address,
            lat: finalDropoffData.lat,
            lng: finalDropoffData.lng,
            type: 'dropoff',
            status: 'pending',
            verificationCode: generateCode(),
            sequenceOrder: optimizedStops.length
        });

        return {
            optimizedStops,
            totalDistance: route?.distance || 0,
            totalDuration: route?.duration || 0,
            routeGeometry: route?.geometry || null
        };
    },

    /**
     * Finds the absolute best route by testing every possible stop as the final destination.
     * This fully includes the "drop-off" point in the optimization algorithm.
     */
    getFullyOptimizedRoute: async (start: Coordinates, allStops: Coordinates[], vehicleType?: string): Promise<any> => {
        if (allStops.length === 0) return null;
        if (allStops.length === 1) {
            return await mapService.getRoute(start, allStops[0], [], vehicleType, false);
        }

        let bestRoute = null;
        let bestDuration = Infinity;

        // Try each stop as the final destination
        const routePromises = allStops.map(async (potentialEnd, index) => {
            const intermediates = allStops.filter((_, i) => i !== index);
            const route = await mapService.getRoute(start, potentialEnd, intermediates, vehicleType, intermediates.length > 1);
            if (route) {
                return { ...route, endStopIndex: index, originalIntermediates: intermediates };
            }
            return null;
        });

        const routes = await Promise.all(routePromises);

        for (const route of routes) {
            if (route && route.duration < bestDuration) {
                bestDuration = route.duration;
                bestRoute = route;
            }
        }

        if (bestRoute) {
            // Reconstruct a unified full sequence index array mapping back to the original `allStops`
            const fullOrderIndices = [];
            const wpOrder = bestRoute.waypoint_order || bestRoute.originalIntermediates.map((_: any, i: number) => i);

            for (let i = 0; i < wpOrder.length; i++) {
                const intermediateIndexUsed = wpOrder[i];
                // Find the original index of this intermediate in the allStops array
                const originalIntermediateObj = bestRoute.originalIntermediates[intermediateIndexUsed];
                const originalIndex = allStops.findIndex(s => s.lat === originalIntermediateObj.lat && s.lng === originalIntermediateObj.lng);
                fullOrderIndices.push(originalIndex);
            }
            // Finally, push the chosen end stop
            fullOrderIndices.push(bestRoute.endStopIndex);

            bestRoute.full_optimized_order = fullOrderIndices;
        }

        return bestRoute;
    },
};

function deg2rad(deg: number) {
    return deg * (Math.PI / 180);
}
