
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

export enum CargoCategory {
  STANDARD = 'Standard Parcels & Boxes',
  BULKY = 'Bulky Items & Appliances',
  DEDICATED = 'Dedicated / Business Stock'
}

export enum LogisticsZone {
  ZONE_1 = 'Hyper-Local (0-15km)',
  ZONE_2 = 'Urban Outskirts (16-35km)',
  ZONE_3 = 'Metropolis Edge (36-65km)',
  INTERCOUNTY = 'Inter-County (>65km)'
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
  status: 'pending' | 'arriving' | 'arrived' | 'completed';
  contact?: ContactInfo;
  instructions?: string;
  completedAt?: string;
  verificationCode?: string; // 4-digit code for secure delivery confirmation
  sequenceOrder?: number; // Optimized sequence order for fastest route
}

export interface OrderItem {
  itemDesc: string;
  category?: CargoCategory;
  subCategory?: string;
  weightKg: number;
  actualWeight?: number;
  dimensions?: {
    l: number;
    w: number;
    h: number;
  };
  fragile: boolean;
  value: number;
  handlingNotes?: string;
  image?: string;
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
export enum ProviderType {
  RIDER = 'rider',
  FLEET_OWNER = 'fleet_owner',
  THREE_PL = '3pl',
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  role: 'customer' | 'driver' | 'business';
  providerType?: ProviderType;
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
  businessRegNumber?: string;
  pinCertificateImage?: string;
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
  twoFASecret?: string;
  status?: 'active' | 'suspended' | 'pending';
  photoURL?: string;
  onboarded?: boolean;
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
  providerType?: ProviderType;
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
  businessRegNumber?: string;
  pinCertificateImage?: string;
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
  zone?: LogisticsZone;
  isDedicated?: boolean;
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
  status: 'pending' | 'driver_assigned' | 'arriving_pickup' | 'in_transit' | 'delivered' | 'reviewed' | 'cancelled' | 'expired' | 'disputed' | 'refunded';
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
  totalRemainingDistance?: number;
  totalRemainingDuration?: number;
  distance?: number;
  routeGeometry?: string;
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
  stops?: RouteStop[];
  total?: number;
  dropoffAddress?: string;
  isDedicated?: boolean;
  isIntercounty?: boolean;
  zone?: LogisticsZone;
  // ── Lifecycle management fields ──
  expiresAt?: any; // Firestore Timestamp — set at booking, checked by cron
  pendingEdit?: PendingEdit;
  editHistory?: EditEvent[];
  dispute?: Dispute;
  priceAdjustmentPaid?: boolean;
  cancellationReason?: string;
  refundAmount?: number;
  cancelPenaltyPaid?: boolean;
}

export interface Review {
  rating: number;
  comment?: string;
  tags?: string[];
  date: string;
  submittedBy: 'customer' | 'driver';
}

// ── Pending edit proposed by customer after driver assignment ──
// @deprecated Post-acceptance editing was removed — orders are locked once a
// driver accepts (cancel-only). Kept for reading historical order docs that
// still carry a `pendingEdit` field. The proposeOrderEdit/respondToEdit
// Cloud Functions no longer exist.
export interface PendingEdit {
  proposedBy: 'customer' | 'driver';
  changes: Record<string, any>;
  newPrice: number;
  newDriverRate: number;
  oldPrice: number;
  oldDriverRate: number;
  priceDifference: number;
  distanceChangeKm: number;
  status: 'proposed' | 'accepted' | 'rejected' | 'paid' | 'expired';
  createdAt: string;
  respondedAt?: string;
  reason?: string;
}

// ── Edit history for audit trail ──
export interface EditEvent {
  field: string;
  oldValue: any;
  newValue: any;
  changedBy: 'customer' | 'driver' | 'system';
  reason?: string;
  timestamp: string;
}

// ── Dispute record ──
export interface Dispute {
  raisedBy: 'customer' | 'driver';
  reason: string;
  description: string;
  status: 'open' | 'resolved';
  resolution?: string;
  createdAt: string;
  resolvedAt?: string;
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
