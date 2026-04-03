import React, { createContext, useContext, useState } from 'react';

export type Category = 'A' | 'B' | 'C';
export type ServiceType = 'Express' | 'Standard';
export type PaymentMethod = 'M-Pesa' | 'Cash';

export interface BookingState {
    activeTab?: "pickup" | "dropoff";
    pickup: string;
    dropoff: string;
    waypoints: string[];
    distanceKm: number;
    etaTime?: string;
    calculatingRoute?: boolean;
    category: Category;
    subCategory: string;
    dimensions: { length: string; width: string; height: string; weight: string };
    imageUploaded: boolean;
    vehicle: string;
    serviceType: ServiceType;
    receiverName: string;
    receiverPhone: string;
    receiverId: string;
    paymentMethod: PaymentMethod;
    paymentPhone: string;
    isScheduled: boolean;
    pickupTime: string;
    isSearchingText?: boolean;
    // Package Details
    itemImage?: string;
    itemValue?: number;
    isFragile?: boolean;
    handlingNotes?: string;
    isReturnTrip?: boolean;
    // Enterprise Pricing Fields
    quoteId?: string;
    price?: number;
    calculatingQuote?: boolean;
    helpersCount?: number;
}

export const INITIAL_STATE: BookingState = {
    pickup: '', dropoff: '', waypoints: [], distanceKm: 0, activeTab: 'pickup',
    category: 'A', subCategory: '', dimensions: { length: '', width: '', height: '', weight: '' }, imageUploaded: false,
    vehicle: '', serviceType: 'Express',
    receiverName: '', receiverPhone: '', receiverId: '',
    paymentMethod: 'M-Pesa', paymentPhone: '0712345678',
    isScheduled: false, pickupTime: '',
    helpersCount: 0,
    isReturnTrip: false
};

interface BookingContextType {
    data: BookingState;
    updateData: (updates: Partial<BookingState>) => void;
    step: number;
    setStep: (step: number) => void;
    direction: number;
    setDirection: (dir: number) => void;
    nextStep: (skipTo?: number) => void;
    prevStep: (skipTo?: number) => void;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export const BookingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [data, setData] = useState<BookingState>(INITIAL_STATE);
    const [step, setStep] = useState(0);
    const [direction, setDirection] = useState(0);

    const updateData = React.useCallback((updates: Partial<BookingState>) => {
        setData(prev => ({ ...prev, ...updates }));
    }, []);

    const nextStep = React.useCallback((skipTo?: number) => {
        setStep(prevStep => {
            const target = typeof skipTo === 'number' ? skipTo : prevStep + 1;
            if (target <= 5) { setDirection(1); return target; }
            return prevStep;
        });
    }, []);

    const prevStep = React.useCallback((skipTo?: number) => {
        setStep(prevStepState => {
            const target = typeof skipTo === 'number' ? skipTo : prevStepState - 1;
            if (target >= 0) { setDirection(-1); return target; }
            return prevStepState;
        });
    }, []);

    return (
        <BookingContext.Provider value={{ data, updateData, step, setStep, direction, setDirection, nextStep, prevStep }}>
            {children}
        </BookingContext.Provider>
    );
};

export const useBooking = () => {
    const context = useContext(BookingContext);
    if (!context) throw new Error('useBooking must be used within a BookingProvider');
    return context;
};
