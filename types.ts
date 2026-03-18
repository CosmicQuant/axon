
export type View = 'HOME' | 'BOOKING' | 'TRACKING' | 'HISTORY' | 'DRIVER_DASHBOARD' | 'BUSINESS_LANDING' | 'BUSINESS_DASHBOARD';

export enum VehicleType {
  BODA = 'Boda Boda',
  TUKTUK = 'Tuk-Tuk',
  PICKUP = 'Pickup Truck',
  VAN = 'Cargo Van',
  LORRY = 'Truck / Lorry',
  TRAILER = 'Container Trailer'
}

export enum ServiceType {
  EXPRESS = 'Express Instant',
  STANDARD = 'Standard (Same Day)',
  ECONOMY = 'Economy (Next Day)'
}

export interface Location {
  id: string;
  name: string;
  lat?: number;
  lng?: number;
}

export interface RouteStop {
  id: string;
  address: string;
  lat: number;
  lng: number;
  type: 'pickup' | 'dropoff' | 'waypoint';
  status: 'pending' | 'arrived' | 'completed';
  contact?: ContactInfo;
  instructions?: string;
  completedAt?: string;
  verificationCode?: string; // 4-digit code for secure delivery confirmation
  sequenceOrder?: number; // Optimized sequence order for fastest route
}

export interface OrderItem {
  description: string;
  weightKg: number;
  fragile: boolean;
  value: number;
  handlingNotes?: string;
}

export interface Driver {
  id?: string;
  name: string;
  phone: string;
  plate: string;
  rating: number;
  avatar?: string;
}

export interface ContactInfo {
  name: string;
  phone: string;
  instructions?: string;
  idNumber?: string;
}

export type PaymentMethod = 'MPESA' | 'CASH' | 'CARD' | 'CORPORATE_INVOICE';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  role: 'customer' | 'driver' | 'business';
  vehicleType?: VehicleType;
  plateNumber?: string;
  // Profile Fields
  idNumber?: string;
  licenseNumber?: string;
  address?: string;
  profileImage?: string;
  licenseImage?: string;
  idImage?: string;
  // Business Fields
  companyName?: string;
  businessDescription?: string;
  kraPin?: string;
  apiKey?: string;
  communicationPreferences?: {
    marketing: { email: boolean; push: boolean; sms: boolean };
    products: { email: boolean; push: boolean; sms: boolean };
    updates: { email: boolean; push: boolean; sms: boolean };
    security: { email: boolean; push: boolean; sms: boolean };
  };
  savedAddresses?: AddressBookEntry[];
  twoFAEnabled?: boolean;
  status?: 'active' | 'suspended' | 'pending';
  photoURL?: string;
}

export interface SignupProfileDetails {
  phone?: string;
  idNumber?: string;
  licenseNumber?: string;
  address?: string;
  kraPin?: string;
  businessDescription?: string;
  vehicleType?: VehicleType;
  plateNumber?: string;
}

export interface DriverProfile {
  id: string; // Same as User ID
  userId: string;
  vehicleType: VehicleType;
  plateNumber: string;
  licenseNumber: string;
  idNumber: string;
  kraPin?: string;
  status: 'online' | 'offline' | 'busy';
  currentLocation?: { lat: number; lng: number };
  rating: number;
  totalTrips: number;
}

export interface BusinessProfile {
  id: string; // Same as User ID
  userId: string;
  companyName: string;
  businessDescription?: string;
  kraPin: string;
  address: string;
  verified: boolean;
}

export interface Fleet {
  id: string;
  name: string;
  ownerId: string; // Business/User ID
  drivers: string[]; // List of Driver IDs
  vehicles: { plate: string; model: string; driverId?: string }[];
}

export interface PricingDetails {
  distance?: number;
  vehicleType?: VehicleType;
  weight?: number;
  items?: OrderItem[];
  estimatedBasePrice?: number;
  isFragile?: boolean;
  serviceType?: ServiceType;
  stopCount?: number;
}

export interface DeliveryOrder {
  id: string;
  userId?: string; // Linked to the user
  pickup: string;
  dropoff: string;
  pickupCoords?: { lat: number; lng: number };
  dropoffCoords?: { lat: number; lng: number };
  pickupTime?: string; // ISO string or 'ASAP'
  vehicle: VehicleType;
  tonnage?: string;
  items: OrderItem;
  itemDescription?: string; // Legacy/Bulk field
  price: number; // Total customer price
  driverRate: number; // Amount driver earns
  status: 'pending' | 'driver_assigned' | 'in_transit' | 'delivered' | 'cancelled';
  estimatedDuration: string;
  date: string;
  createdAt?: string;
  updatedAt?: string;
  packagingAdvice?: string;
  aiAnalysis?: string;
  driver?: Driver;
  sender: ContactInfo;
  recipient: ContactInfo;
  paymentMethod: PaymentMethod;
  verificationCode: string;
  driverLocation?: { lat: number; lng: number; bearing?: number };
  remainingDistance?: number;
  remainingDuration?: number;
  routeGeometry?: string; // Encoded polyline for the current active route
  itemImage?: string;
  deliveryConfirmationImage?: string;
  reviewForDriver?: Review;
  reviewForCustomer?: Review;
  assignedAt?: string;
  startedAt?: string;
  deliveredAt?: string;
  startTime?: string;
  endTime?: string;
  serviceType: ServiceType;
  stops?: RouteStop[]; // Optional: for multi-stop orders
  total?: number; // Total cost (legacy)
  dropoffAddress?: string; // Legacy
}

export interface Review {
  rating: number;
  comment?: string;
  date: string;
}

export interface AddressBookEntry {
  id: string;
  label: string;
  address: string;
  contactName: string;
  contactPhone: string;
  lat?: number;
  lng?: number;
}

export interface AIAnalysisResult {
  estimatedPrice: number;
  recommendedVehicle: VehicleType;
  relevantVehicles?: VehicleType[];
  packagingAdvice: string;
  riskAssessment: string;
  estimatedDuration: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface DriverMetrics {
  earnings: {
    today: number;
    week: number;
    month: number;
    balance: number;
  };
  performance: {
    tripsCompleted: number;
    acceptanceRate: number;
    rating: number;
    hoursOnline: number;
    totalDistanceKm: number;
  };
  weeklyChart: { day: string; value: number; amount: string }[];
  recentTransactions: { id: string; amount: number; date: string; type: 'trip' | 'tip' | 'bonus' }[];
  recentReviews?: {
    id: string;
    rating: number;
    comment?: string;
    date: string;
    customerName?: string;
  }[];
  status?: string;
}
