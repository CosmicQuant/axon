import React, { useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import BookingWizard from './booking/BookingWizardModular';
import { useAuth } from '../context/AuthContext';
import { useCreateOrder } from '../hooks/useOrders';
import type { DeliveryOrder } from '../types';
import { toast } from 'react-hot-toast';
import { useMapState } from '@/context/MapContext';
import LocationBlocker from './LocationBlocker';

export const PENDING_BOOKING_KEY = 'axon_pending_booking';

interface BookingPageProps {
    prefillData?: any;
    onRequireAuth?: (title?: string, desc?: string) => void;
    onClearPrefill?: () => void;
    isDashboardMode?: boolean;
}

const BookingPageContent: React.FC<BookingPageProps> = ({ prefillData: propPrefill, onRequireAuth, onClearPrefill, isDashboardMode }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const createOrderMutation = useCreateOrder();
    const navigatingToTrackRef = React.useRef(false);

    // Redirect drivers away from booking page
    useEffect(() => {
        if (user?.role === 'driver') {
            toast.error("Driver accounts cannot place orders.");
            navigate('/driver');
        }
    }, [user, navigate]);

    const { setOrderState, setPickupCoords, setDropoffCoords, setWaypointCoords, setRoutePolyline, ensureFreshLocation } = useMapState();

    // Combine prop prefill with router state prefill
    const prefillData = propPrefill || location.state?.prefill;

    // --- Saved booking restoration (for auth-interrupted flow) ---

    const savedBooking = useMemo(() => {
        try {
            const raw = sessionStorage.getItem(PENDING_BOOKING_KEY);
            if (!raw) return null;
            sessionStorage.removeItem(PENDING_BOOKING_KEY);
            return JSON.parse(raw);
        } catch { return null; }
    }, []);

    // Restore map coords from saved booking
    useEffect(() => {
        if (!savedBooking) return;
        if (savedBooking.pickupCoords) setPickupCoords(savedBooking.pickupCoords);
        if (savedBooking.dropoffCoords) setDropoffCoords(savedBooking.dropoffCoords);
        if (savedBooking.waypointCoords) setWaypointCoords(savedBooking.waypointCoords);
    }, [savedBooking, setPickupCoords, setDropoffCoords, setWaypointCoords]);

    // Build BookingState from a saved order so the wizard can resume
    const savedBookingData = useMemo(() => {
        if (!savedBooking?.order) return undefined;
        const o = savedBooking.order;
        const wpAddresses = (o.stops || [])
            .filter((s: any) => s.type === 'waypoint')
            .sort((a: any, b: any) => a.sequenceOrder - b.sequenceOrder)
            .map((s: any) => s.address);
        return {
            pickup: o.pickup || '',
            dropoff: o.dropoff || '',
            waypoints: wpAddresses,
            vehicle: o.vehicle || '',
            serviceType: o.serviceType?.includes('Express') ? 'Express' : 'Standard',
            receiverName: o.recipient?.name || '',
            receiverPhone: o.recipient?.phone || '',
            receiverId: o.recipient?.id || '',
            paymentMethod: o.paymentMethod === 'MPESA' ? 'M-Pesa' : o.paymentMethod || 'M-Pesa',
            category: o.items?.itemDesc?.split(' - ')[0] || 'A',
            subCategory: o.items?.itemDesc?.split(' - ')[1] || '',
            dimensions: { length: '', width: '', height: '', weight: String(o.items?.weightKg || '') },
            price: o.price,
            quoteId: o.quoteId || undefined,
            helpersCount: o.helpersCount || 0,
        } as any;
    }, [savedBooking]);

    const savedStep = savedBooking?.step ?? undefined;

    useEffect(() => {
        setOrderState('DRAFTING');
        ensureFreshLocation().catch(() => undefined);
        onClearPrefill?.();

        return () => {
            if (navigatingToTrackRef.current) {
                setOrderState('MATCHING');
            } else {
                setOrderState('IDLE');
                setPickupCoords(null);
                setDropoffCoords(null);
                setWaypointCoords([]);
                setRoutePolyline(null);
            }
        };
    }, [ensureFreshLocation, setOrderState, onClearPrefill, setPickupCoords, setDropoffCoords, setWaypointCoords, setRoutePolyline]);

    const handleOrderComplete = async (order: DeliveryOrder) => {
        if (!user) {
            // Save state so it survives auth (especially Google redirect)
            try {
                sessionStorage.setItem(PENDING_BOOKING_KEY, JSON.stringify({
                    order,
                    step: 4,
                    pickupCoords: order.pickupCoords,
                    dropoffCoords: order.dropoffCoords,
                    waypointCoords: (order.stops || [])
                        .filter((s: any) => s.type === 'waypoint')
                        .map((s: any) => ({ lat: s.lat, lng: s.lng })),
                }));
            } catch (e) {
                console.warn('Failed to persist booking state', e);
            }
            onRequireAuth?.('Sign In to Complete Order', 'Your booking details are saved. Sign in or create an account to finish your order.');
            return;
        }

        const orderWithUser = {
            ...order,
            userId: user.id,
            sender: { name: user.name || user.email || 'Customer', phone: user.phone || '' }
        };

        try {
            const newOrder = await createOrderMutation.mutateAsync(orderWithUser);

            toast.success('Order created successfully!');
            onClearPrefill?.();
            sessionStorage.removeItem(PENDING_BOOKING_KEY);

            navigatingToTrackRef.current = true;
            navigate(`/track/${newOrder.id}`);
        } catch (error) {
            console.error("Failed to create order", error);
            toast.error("Failed to create order. Please try again.");
        }
    };

    return (
        <div className="absolute inset-0 flex flex-col pointer-events-none overflow-hidden">
            <LocationBlocker />
            <div className="relative z-10 flex-grow flex flex-col pointer-events-none">
                <BookingWizard
                    prefillData={prefillData}
                    onOrderComplete={handleOrderComplete}
                    onRequireAuth={onRequireAuth}
                    startAtDashboard={isDashboardMode}
                    savedBookingData={savedBookingData}
                    savedStep={savedStep}
                />
            </div>
        </div>
    );
};

const BookingPage: React.FC<BookingPageProps> = (props) => {
    return (
        <BookingPageContent {...props} />
    );
};

export default BookingPage;
