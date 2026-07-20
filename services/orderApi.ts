import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

/**
 * Typed wrappers for order-related Cloud Functions.
 * Single authority — no client-side Firestore fallbacks. Errors are thrown
 * to the caller so the UI can surface them instead of silently bypassing
 * server-side validation.
 */

const call = async <T = any>(name: string, data: Record<string, any>, timeoutMs = 25000): Promise<T> => {
    if (!functions) throw new Error('Backend unavailable. Please check your connection.');
    const fn = httpsCallable(functions, name);
    const result = await Promise.race([
        fn(data),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Request timed out. Please try again.')), timeoutMs)),
    ]);
    return (result as any).data as T;
};

export interface QuoteResponse {
    quoteId: string;
    price: number;
    driverRate: number;
    distanceKm: number;
    durationMinutes: number;
    breakdown?: any;
}

export const orderApi = {
    /** Server-side price quote (booking + pre-acceptance edits). */
    calculateQuote: (payload: {
        pickupCoords: { lat: number; lng: number };
        dropoffCoords: { lat: number; lng: number };
        waypoints?: { lat: number; lng: number }[];
        vehicle: string;
        serviceType: string;
        helpersCount?: number;
        isReturnTrip?: boolean;
        isFragile?: boolean;
        category?: string;
        subCategory?: string;
    }) => call<QuoteResponse>('calculateQuote', payload),

    /** Driver-only status transitions (arriving_pickup, in_transit, delivered). */
    transition: (orderId: string, newStatus: string, extraData?: Record<string, any>) =>
        call('updateOrderStatus', { orderId, newStatus, extraData }),

    /** Verify the 4-digit delivery PIN. Driver-only. */
    verifyCode: (orderId: string, code: string, stopId?: string) =>
        call<{ valid: boolean }>('verifyDeliveryCode', { orderId, code, stopId }),

    /** Cancel an order (customer or assigned driver, pre-transit only). */
    cancel: (orderId: string, reason: string) =>
        call('cancelOrder', { orderId, reason }),

    /** Double-blind review submission. */
    submitReview: (orderId: string, payload: {
        rating: number;
        comment?: string;
        tags?: string[];
        reviewedRole: 'customer' | 'driver';
    }) => call('submitReview', { orderId, ...payload }),

    /** Raise a dispute (customer or driver, in_transit/delivered). */
    raiseDispute: (orderId: string, reason: string, description: string) =>
        call('raiseDispute', { orderId, reason, description }),
};
