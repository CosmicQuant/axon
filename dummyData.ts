
import type { DeliveryOrder, DriverMetrics } from './types';
import { VehicleType, ServiceType } from './types';

export const DUMMY_MARKET_ORDERS: DeliveryOrder[] = [
  {
    id: 'ORD-MKT-101',
    pickup: 'Westlands, Nairobi',
    dropoff: 'Lavington, Nairobi',
    vehicle: VehicleType.BODA,
    items: { itemDesc: 'Urgent Legal Documents', weightKg: 0.5, fragile: false, value: 0 },
    price: 250,
    status: 'pending',
    estimatedDuration: '15 mins',
    date: new Date().toISOString(),
    sender: { name: 'Kamoa Advocates', phone: '0711 222 333' },
    recipient: { name: 'Safaricom HQ Reception', phone: '0722 333 444' },
    paymentMethod: 'MPESA',
    verificationCode: '8520',
    serviceType: ServiceType.EXPRESS,
    driverRate: 5.0
  },
  {
    id: 'ORD-MKT-102',
    pickup: 'River Road, CBD',
    dropoff: 'South B, Nairobi',
    vehicle: VehicleType.PICKUP,
    items: { itemDesc: 'Box of Auto Spares', weightKg: 15, fragile: true, value: 15000 },
    price: 1200,
    status: 'pending',
    estimatedDuration: '45 mins',
    date: new Date().toISOString(),
    sender: { name: 'AutoWorld Spares', phone: '0733 444 555' },
    recipient: { name: 'Mechanic John', phone: '0744 555 666' },
    paymentMethod: 'CASH',
    verificationCode: '3698',
    serviceType: ServiceType.STANDARD,
    driverRate: 4.8
  },
  {
    id: 'ORD-MKT-103',
    pickup: 'Village Market, Gigiri',
    dropoff: 'Runda, Nairobi',
    vehicle: VehicleType.BODA,
    items: { itemDesc: 'Lunch Delivery', weightKg: 2, fragile: true, value: 3000 },
    price: 350,
    status: 'pending',
    estimatedDuration: '20 mins',
    date: new Date().toISOString(),
    sender: { name: 'Java House', phone: '0755 666 777' },
    recipient: { name: 'Alice Smith', phone: '0766 777 888' },
    paymentMethod: 'MPESA',
    verificationCode: '7410',
    serviceType: ServiceType.EXPRESS,
    driverRate: 4.9
  },
  {
    id: 'ORD-MKT-104',
    pickup: 'Industrial Area, Nairobi',
    dropoff: 'Thika Road Mall (TRM)',
    vehicle: VehicleType.LORRY,
    items: { itemDesc: 'Construction Materials (Tiles)', weightKg: 500, fragile: true, value: 50000 },
    price: 4500,
    status: 'pending',
    estimatedDuration: '2 hours',
    date: new Date().toISOString(),
    sender: { name: 'Ceramics Kenya', phone: '0777 888 999' },
    recipient: { name: 'Construction Site B', phone: '0788 999 000' },
    paymentMethod: 'MPESA',
    verificationCode: '9632',
    serviceType: ServiceType.ECONOMY,
    driverRate: 4.2
  },
  {
    id: 'ORD-MKT-105',
    pickup: 'Nyali Centre, Mombasa',
    dropoff: 'Bamburi Beach Hotel',
    vehicle: VehicleType.TUKTUK,
    items: { itemDesc: 'Tourist Luggage', weightKg: 20, fragile: false, value: 0 },
    price: 400,
    status: 'pending',
    estimatedDuration: '30 mins',
    date: new Date().toISOString(),
    sender: { name: 'James Otieno', phone: '0799 000 111' },
    recipient: { name: 'Hotel Reception', phone: '0700 111 222' },
    paymentMethod: 'CASH',
    verificationCode: '1597',
    serviceType: ServiceType.STANDARD,
    driverRate: 4.7
  }
];

export const DUMMY_DRIVER_METRICS: DriverMetrics = {
  earnings: {
    today: 4500,
    week: 18200,
    month: 65000,
    balance: 14250
  },
  performance: {
    tripsCompleted: 142,
    acceptanceRate: 94,
    rating: 4.8,
    hoursOnline: 6.5,
    totalDistanceKm: 1240,
    todayDistanceKm: 48.2
  },
  weeklyChart: [
    { day: 'Mon', value: 45, amount: 'KES 4.5k' },
    { day: 'Tue', value: 60, amount: 'KES 6.0k' },
    { day: 'Wed', value: 30, amount: 'KES 3.0k' },
    { day: 'Thu', value: 75, amount: 'KES 7.5k' },
    { day: 'Fri', value: 90, amount: 'KES 9.0k' },
    { day: 'Sat', value: 50, amount: 'KES 5.0k' },
    { day: 'Sun', value: 20, amount: 'KES 2.0k' },
  ],
  recentTransactions: [
    { id: 'TXN-001', amount: 450, date: 'Today, 10:30 AM', type: 'trip' },
    { id: 'TXN-002', amount: 1200, date: 'Today, 09:15 AM', type: 'trip' },
    { id: 'TXN-003', amount: 150, date: 'Yesterday, 06:45 PM', type: 'tip' },
    { id: 'TXN-004', amount: 800, date: 'Yesterday, 04:20 PM', type: 'trip' },
    { id: 'TXN-005', amount: 500, date: 'Yesterday, 02:00 PM', type: 'bonus' },
  ]
};
