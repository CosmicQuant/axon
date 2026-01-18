import { APP_CONFIG } from '../config';
import { Geolocation } from '@capacitor/geolocation'; // Import Capacitor Geolocation
import { Capacitor } from '@capacitor/core';

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

        return new Promise((resolve) => {
            const service = new google.maps.places.AutocompleteService();
            service.getPlacePredictions({
                input: translatedQuery,
                componentRestrictions: { country: 'ke' }
            }, (predictions, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
                    const results = predictions.map(p => ({
                        label: p.description,
                        lat: 0,
                        lng: 0
                    }));
                    resolve(results);
                } else {
                    resolve([]);
                }
            });
        });
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
                    // Filter out results that are primarily plus codes
                    // Prefer results with 'establishment', 'point_of_interest' or 'premise'
                    const bestResult = results.find(r =>
                        !r.types.includes('plus_code') &&
                        (r.types.includes('establishment') || r.types.includes('point_of_interest') || r.types.includes('premise'))
                    ) || results.find(r => !r.types.includes('plus_code')) || results[0];

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
    getCurrentLocation: async (): Promise<Coordinates> => {
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
            // Default to Nairobi if failed
            return { lat: -1.2921, lng: 36.8219 };
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
    getRoute: async (start: Coordinates, end: Coordinates, waypoints: Coordinates[] = []): Promise<any> => {
        if (typeof google === 'undefined' || !google.maps) {
            console.warn("Google Maps not loaded yet");
            return null;
        }

        return new Promise((resolve) => {
            const directionsService = new google.maps.DirectionsService();
            const gWaypoints = waypoints.map(w => ({
                location: w,
                stopover: true
            }));

            directionsService.route({
                origin: start,
                destination: end,
                waypoints: gWaypoints,
                travelMode: google.maps.TravelMode.DRIVING,
                optimizeWaypoints: true
            }, (result, status) => {
                if (status === google.maps.DirectionsStatus.OK && result && result.routes.length > 0) {
                    const route = result.routes[0];

                    // Sum up all legs for total distance/duration
                    let totalDistance = 0;
                    let totalDuration = 0;
                    route.legs.forEach(leg => {
                        totalDistance += leg.distance?.value || 0;
                        totalDuration += leg.duration?.value || 0;
                    });

                    const geometry = typeof route.overview_polyline === 'string'
                        ? route.overview_polyline
                        : (route.overview_polyline as any).points;

                    resolve({
                        geometry: geometry,
                        distance: totalDistance,
                        duration: totalDuration,
                        waypoint_order: route.waypoint_order // Return the optimized order
                    });
                } else {
                    console.error("Directions request failed due to " + status);
                    resolve(null);
                }
            });
        });
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
        waypoints: Array<{ id: string; lat: number; lng: number; address: string; contact?: any; instructions?: string }>
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
            const route = await mapService.getRoute(pickup, dropoff);
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

        // Get optimized route with all stops
        const route = await mapService.getRoute(pickup, allIntermediatePoints[allIntermediatePoints.length - 1], allIntermediatePoints.slice(0, -1));

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

        // Reorder waypoints based on Google's optimization
        const waypointOrder = route?.waypoint_order || waypoints.map((_, i) => i);

        waypointOrder.forEach((originalIndex: number, newIndex: number) => {
            const wp = waypoints[originalIndex];
            if (wp) {
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
                    sequenceOrder: newIndex + 1
                });
            }
        });

        // Dropoff is always last
        optimizedStops.push({
            id: 'dropoff-end',
            address: dropoff.address,
            lat: dropoff.lat,
            lng: dropoff.lng,
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
    }
};

function deg2rad(deg: number) {
    return deg * (Math.PI / 180);
}
