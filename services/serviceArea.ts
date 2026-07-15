export interface SupportedTown {
    name: string;
    lat: number;
    lng: number;
    radiusKm: number;
}

export const SUPPORTED_TOWNS: SupportedTown[] = [
    { name: 'Nairobi', lat: -1.2864, lng: 36.8172, radiusKm: 25 },
    { name: 'Mombasa', lat: -4.0435, lng: 39.6682, radiusKm: 20 },
    { name: 'Garissa', lat: -0.4536, lng: 39.6461, radiusKm: 12 },
    { name: 'Wajir', lat: 1.7508, lng: 40.0449, radiusKm: 10 },
    { name: 'Ukunda', lat: -4.2700, lng: 39.4147, radiusKm: 10 },
];

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function findTown(lat: number, lng: number): SupportedTown | null {
    for (const town of SUPPORTED_TOWNS) {
        if (haversineKm(lat, lng, town.lat, town.lng) <= town.radiusKm) {
            return town;
        }
    }
    return null;
}

export function isLocationSupported(lat: number, lng: number): boolean {
    return findTown(lat, lng) !== null;
}

export function isRouteSupported(
    pickup: { lat: number; lng: number },
    dropoff: { lat: number; lng: number },
    waypoints: Array<{ lat: number; lng: number }> = []
): boolean {
    if (!isLocationSupported(pickup.lat, pickup.lng)) return false;
    if (!isLocationSupported(dropoff.lat, dropoff.lng)) return false;
    for (const wp of waypoints) {
        if (!isLocationSupported(wp.lat, wp.lng)) return false;
    }
    return true;
}

export const UNSUPPORTED_MESSAGE =
    "We don't serve this route yet. Axon is currently live in Nairobi, Mombasa, Garissa, Wajir & Ukunda. We're expanding to more towns soon!";

export const SUPPORTED_TOWN_NAMES = SUPPORTED_TOWNS.map(t => t.name);
