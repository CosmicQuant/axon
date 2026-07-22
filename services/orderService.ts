import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  addDoc,
  updateDoc,
  orderBy,
  limit,
  startAfter,
  runTransaction,
  increment
} from 'firebase/firestore';
import { db } from '../firebase';
import type { DeliveryOrder, DriverMetrics, Driver, PricingDetails, Review } from '../types';
import { VehicleType, ServiceType } from '../types';
import { generateSecureCode } from '../utils/crypto';

const ORDERS_COLLECTION = 'orders';

export const orderService = {

  /**
   * Fetch all orders belonging to a specific user.
   */
  getUserOrders: async (userId: string, limitCount: number = 500, startAfterId?: string): Promise<DeliveryOrder[]> => {
    try {
      let q = query(
        collection(db, ORDERS_COLLECTION),
        where('userId', '==', userId),
        orderBy('date', 'desc'),
        limit(limitCount)
      );

      // Cursor-based pagination: if a startAfterId is provided, start after that doc
      if (startAfterId) {
        const cursorDoc = await getDoc(doc(db, ORDERS_COLLECTION, startAfterId));
        if (cursorDoc.exists()) {
          q = query(q, startAfter(cursorDoc));
        }
      }

      const querySnapshot = await getDocs(q);
      const orders = querySnapshot.docs.map(doc => {
        const data = doc.data() as any;
        return { ...data, id: doc.id } as DeliveryOrder;
      });
      return orders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error) {
      console.error("Error fetching user orders:", error);
      throw error;
    }
  },

  /**
   * Temporary utility to fetch ALL user orders without sorting.
   * Useful for finding and fixing legacy orders with missing date fields.
   */
  getUserOrdersUnsorted: async (userId: string): Promise<(DeliveryOrder & { docId: string })[]> => {
    const q = query(
      collection(db, ORDERS_COLLECTION),
      where('userId', '==', userId)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ ...d.data(), docId: d.id } as any));
  },

  /**
   * Fetch orders for the Driver Marketplace (Pending Status).
   */
  getMarketplaceOrders: async (): Promise<DeliveryOrder[]> => {
    try {
      const q = query(
        collection(db, ORDERS_COLLECTION),
        where('status', '==', 'pending')
        // orderBy('date', 'desc') // Removed to avoid needing a specific composite index for now
      );

      const querySnapshot = await getDocs(q);
      const orders = querySnapshot.docs.map(doc => ({ ...doc.data() as any, id: doc.id } as DeliveryOrder));

      // Sort in memory by date desc
      return orders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error) {
      console.error("Error fetching marketplace orders:", error);
      throw error;
    }
  },

  /**
   * Fetch active jobs for a specific driver.
   */
  getDriverJobs: async (driverId: string): Promise<DeliveryOrder[]> => {
    try {
      const q = query(
        collection(db, ORDERS_COLLECTION),
        where('driver.id', '==', driverId)
      );

      const querySnapshot = await getDocs(q);
      const allJobs = querySnapshot.docs.map(doc => ({ ...doc.data() as any, id: doc.id } as DeliveryOrder));

      allJobs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Filter out delivered jobs to show only active ones
      return allJobs.filter(job => job.status !== 'delivered');
    } catch (error) {
      console.error("Error fetching driver jobs:", error);
      throw error;
    }
  },

  /**
   * Get Driver Dashboard Metrics
   */
  getDriverMetrics: async (driverId: string): Promise<DriverMetrics> => {
    try {
      // ── Fast path: read aggregated counters from the driver doc ──
      // The updateOrderStatus CF increments these atomically on delivery.
      // Falls back to the slow scan path only for legacy drivers without counters.
      const driverDoc = await getDoc(doc(db, 'drivers', driverId));
      const dData = driverDoc.exists() ? driverDoc.data() : null;
      if (dData) {
        const hasCounters = dData.deliveredCount !== undefined && dData.totalEarnings !== undefined;

        if (hasCounters) {
          // Compute time-based earnings from a recent orders scan (last 50 only)
          const recentQ = query(
            collection(db, ORDERS_COLLECTION),
            where('driver.id', '==', driverId),
            where('status', '==', 'delivered'),
            limit(50)
          );
          const recentSnap = await getDocs(recentQ);
          const recentOrders = recentSnap.docs.map(doc => ({ ...doc.data() as any, id: doc.id } as DeliveryOrder));
          const deliveredOrders = recentOrders.sort((a, b) =>
            new Date(b.deliveredAt || b.date).getTime() - new Date(a.deliveredAt || a.date).getTime()
          );

          const now = new Date();
          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
          const currentDay = now.getDay();
          const diff = now.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
          const weekStart = new Date(now.setDate(diff));
          weekStart.setHours(0, 0, 0, 0);
          const weekStartStr = weekStart.toISOString();
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

          const calculatePayout = (o: DeliveryOrder) => {
            const rate = o.driverRate || (o.price ? Math.floor(Number(o.price) * 0.8) : 0);
            return isNaN(rate) ? 0 : rate;
          };

          const earningsToday = deliveredOrders
            .filter(o => (o.deliveredAt || o.date) >= todayStart)
            .reduce((sum, o) => sum + calculatePayout(o), 0);
          const earningsWeek = deliveredOrders
            .filter(o => (o.deliveredAt || o.date) >= weekStartStr)
            .reduce((sum, o) => sum + calculatePayout(o), 0);
          const earningsMonth = deliveredOrders
            .filter(o => (o.deliveredAt || o.date) >= monthStart)
            .reduce((sum, o) => sum + calculatePayout(o), 0);

          const totalDistanceKm = Math.round(((dData.totalDistanceMeters || 0) / 1000) * 10) / 10;
          const hoursOnline = Math.round((dData.totalOnlineMinutes || 0) / 60 * 10) / 10;

          const ratings = deliveredOrders
            .filter(o => o.reviewForDriver)
            .map(o => o.reviewForDriver!.rating);
          const avgRating = ratings.length > 0
            ? ratings.reduce((a, b) => a + b, 0) / ratings.length
            : 5.0;

          const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          const weeklyData = [1, 2, 3, 4, 5, 6, 0].map(dayIdx => {
            const dayName = days[dayIdx];
            const dayOrders = deliveredOrders.filter(o => {
              const d = new Date(o.deliveredAt || o.date);
              return d >= weekStart && d.getDay() === dayIdx;
            });
            const dayEarnings = dayOrders.reduce((sum, o) => sum + calculatePayout(o), 0);
            return { day: dayName, value: dayEarnings, trips: dayOrders.length, amount: `KES ${dayEarnings.toLocaleString()}` };
          });

          const recentReviews = deliveredOrders
            .filter(o => o.reviewForDriver)
            .slice(0, 5)
            .map(o => ({
              id: o.id, rating: o.reviewForDriver!.rating, comment: o.reviewForDriver!.comment,
              date: o.reviewForDriver!.date, customerName: o.sender.name
            }));

          return {
            earnings: { today: earningsToday, week: earningsWeek, month: earningsMonth, balance: dData.totalEarnings || 0 },
            performance: {
              tripsCompleted: dData.deliveredCount || 0,
              acceptanceRate: 100,
              rating: Math.round(avgRating * 10) / 10,
              hoursOnline,
              totalDistanceKm
            },
            recentReviews,
            weeklyChart: weeklyData,
            recentTransactions: deliveredOrders.slice(0, 10).map(o => ({
              id: o.id, amount: calculatePayout(o),
              date: new Date(o.deliveredAt || o.date).toLocaleDateString(), type: 'trip'
            }))
          };
        }
      }

      // ── Slow path: scan all orders (legacy drivers without counters) ──
      const q = query(
        collection(db, ORDERS_COLLECTION),
        where('driver.id', '==', driverId)
      );

      const querySnapshot = await getDocs(q);
      const orders = querySnapshot.docs.map(doc => ({ ...doc.data() as any, id: doc.id } as DeliveryOrder));

      const deliveredOrders = orders.filter(o => o.status === 'delivered')
        .sort((a, b) => new Date(b.deliveredAt || b.date).getTime() - new Date(a.deliveredAt || a.date).getTime());

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

      const calculatePayout = (o: DeliveryOrder) => {
        const rate = o.driverRate || (o.price ? Math.floor(Number(o.price) * 0.8) : 0);
        return isNaN(rate) ? 0 : rate;
      };

      const earningsToday = deliveredOrders
        .filter(o => (o.deliveredAt || o.date) >= todayStart)
        .reduce((sum, o) => sum + calculatePayout(o), 0);

      // This Week (Since Monday)
      const now_week = new Date();
      const currentDay = now_week.getDay();
      const diff = now_week.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
      const weekStart = new Date(now_week.setDate(diff));
      weekStart.setHours(0, 0, 0, 0);
      const weekStartStr = weekStart.toISOString();

      const earningsWeek = deliveredOrders
        .filter(o => (o.deliveredAt || o.date) >= weekStartStr)
        .reduce((sum, o) => sum + calculatePayout(o), 0);

      // This Month (Since 1st)
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const earningsMonth = deliveredOrders
        .filter(o => (o.deliveredAt || o.date) >= monthStart)
        .reduce((sum, o) => sum + calculatePayout(o), 0);

      const totalDistanceMeters = deliveredOrders.reduce((sum, o) => sum + (o.distance || 0), 0);
      const totalDistanceKm = Math.round((totalDistanceMeters / 1000) * 10) / 10;

      // Calculate total earnings (using stored driverRate with fallback)
      const totalEarnings = deliveredOrders.reduce((sum, o) => sum + calculatePayout(o), 0);

      // Populate Weekly Chart with actual data
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const weeklyData = [1, 2, 3, 4, 5, 6, 0].map(dayIdx => {
        const dayName = days[dayIdx];
        // Find orders delivered on this specific day of the CURRENT week
        const dayOrders = deliveredOrders.filter(o => {
          const d = new Date(o.deliveredAt || o.date);
          return d >= weekStart && d.getDay() === dayIdx;
        });

        const dayEarnings = dayOrders.reduce((sum, o) => sum + calculatePayout(o), 0);

        return {
          day: dayName,
          value: dayEarnings,
          trips: dayOrders.length,
          amount: `KES ${dayEarnings.toLocaleString()}`
        };
      });

      // Fetch Driver Document to get hours online (if tracked there)
      // Reuse the driver doc already fetched at the top of this function
      let hoursOnline = 0;
      if (dData) {
        hoursOnline = Math.round((dData.totalOnlineMinutes || 0) / 60 * 10) / 10;
      }

      const ratings = deliveredOrders
        .filter(o => o.reviewForDriver)
        .map(o => o.reviewForDriver!.rating);
      const avgRating = ratings.length > 0
        ? ratings.reduce((a, b) => a + b, 0) / ratings.length
        : 5.0;

      const recentReviews = deliveredOrders
        .filter(o => o.reviewForDriver)
        .slice(0, 5)
        .map(o => ({
          id: o.id,
          rating: o.reviewForDriver!.rating,
          comment: o.reviewForDriver!.comment,
          date: o.reviewForDriver!.date,
          customerName: o.sender.name
        }));

      return {
        earnings: {
          today: earningsToday,
          week: earningsWeek,
          month: earningsMonth,
          balance: totalEarnings
        },
        performance: {
          tripsCompleted: deliveredOrders.length,
          acceptanceRate: 100, // Placeholder
          rating: Math.round(avgRating * 10) / 10,
          hoursOnline: hoursOnline,
          totalDistanceKm: totalDistanceKm
        },
        recentReviews,
        weeklyChart: weeklyData,
        recentTransactions: deliveredOrders.slice(0, 10).map(o => ({
          id: o.id,
          amount: calculatePayout(o),
          date: new Date(o.deliveredAt || o.date).toLocaleDateString(),
          type: 'trip'
        }))
      };
    } catch (error) {
      console.error("Error fetching driver metrics:", error);
      return {
        earnings: { today: 0, week: 0, month: 0, balance: 0 },
        performance: { tripsCompleted: 0, acceptanceRate: 0, rating: 0, hoursOnline: 0, totalDistanceKm: 0 },
        weeklyChart: [],
        recentTransactions: []
      };
    }
  },

  /**
   * Get Business Dashboard Metrics
   */
  getBusinessMetrics: async (businessId: string) => {
    try {
      const q = query(
        collection(db, ORDERS_COLLECTION),
        where('userId', '==', businessId)
      );

      const querySnapshot = await getDocs(q);
      const orders = querySnapshot.docs.map(doc => ({ ...doc.data() as any, id: doc.id } as DeliveryOrder));

      const deliveredCount = orders.filter(o => o.status === 'delivered').length;
      const activeCount = orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length;
      const totalSpend = orders
        .filter(o => o.status === 'delivered')
        .reduce((sum, o) => sum + (o.price || 0), 0);

      const successRate = orders.length > 0 ? (deliveredCount / orders.length) * 100 : 0;

      const recentReviews = orders
        .filter(o => o.reviewForDriver)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5)
        .map(o => ({
          id: o.id,
          rating: o.reviewForDriver!.rating,
          comment: o.reviewForDriver!.comment,
          date: o.reviewForDriver!.date,
          driverName: o.driver?.name || 'Driver'
        }));

      return {
        spend: totalSpend,
        deliveries: deliveredCount,
        successRate: Math.round(successRate * 10) / 10,
        activeOrders: activeCount,
        recentReviews
      };
    } catch (error) {
      console.error("Error fetching business metrics:", error);
      return { spend: 0, deliveries: 0, successRate: 0, activeOrders: 0, recentReviews: [] };
    }
  },

  /**
   * Get a single order by ID.
   */
  getOrder: async (orderId: string): Promise<DeliveryOrder | undefined> => {
    try {
      const docRef = doc(db, ORDERS_COLLECTION, orderId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as DeliveryOrder;
      } else {
        return undefined;
      }
    } catch (error) {
      console.error("Error fetching order:", error);
      throw error;
    }
  },

  /**
   * Create a new order.
   * Delivery verification codes are stored in orders/{id}/private/codes
   * (customer-only per Firestore rules) so drivers can never read them —
   * they must prove knowledge of the code via the verifyDeliveryCode CF.
   */
  createOrder: async (order: Omit<DeliveryOrder, 'id'>): Promise<DeliveryOrder> => {
    try {
      const orderCode = (order as any).verificationCode || generateSecureCode(6);

      // Extract per-stop codes into the private doc; strip them from the public order doc
      const stopCodes: Record<string, string> = {};
      const sanitizedStops = (order.stops || []).map((stop: any) => {
        const code = stop.verificationCode || generateSecureCode(6);
        stopCodes[stop.id] = code;
        const { verificationCode, ...rest } = stop;
        return rest;
      });

      // Clean undefined values for Firestore
      const now = new Date().toISOString();
      const cleanOrder = JSON.parse(JSON.stringify({
        ...order,
        stops: sanitizedStops,
        date: now,
        createdAt: now,
        updatedAt: now,
        status: 'pending',
        driverRate: Math.floor(Number(order.price || 0) * 0.8)
      }));
      delete cleanOrder.verificationCode;

      const docRef = await addDoc(collection(db, ORDERS_COLLECTION), cleanOrder);

      // Write codes to the customer-only private subcollection
      const { setDoc } = await import('firebase/firestore');
      await setDoc(doc(db, ORDERS_COLLECTION, docRef.id, 'private', 'codes'), {
        orderCode,
        stopCodes,
        createdAt: now,
      });

      return { ...order, id: docRef.id, verificationCode: orderCode } as DeliveryOrder;
    } catch (error) {
      console.error("Error creating order:", error);
      throw error;
    }
  },

  /**
   * Update an order
   */
  updateOrder: async (orderId: string, updates: Partial<DeliveryOrder>): Promise<void> => {
    try {
      const docRef = doc(db, ORDERS_COLLECTION, orderId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error updating order:", error);
      throw error;
    }
  },

  /**
   * Atomic Job Acceptance
   * Uses a transaction to ensure no two drivers accept the same job.
   */
  acceptOrder: async (orderId: string, driver: Driver): Promise<void> => {
    const orderRef = doc(db, ORDERS_COLLECTION, orderId);

    try {
      await runTransaction(db, async (transaction) => {
        const orderDoc = await transaction.get(orderRef);
        if (!orderDoc.exists()) {
          throw new Error("Order does not exist");
        }

        const orderData = orderDoc.data();
        if (orderData.status !== 'pending') {
          throw new Error("Job has already been taken or is no longer available");
        }

        transaction.update(orderRef, {
          status: 'driver_assigned',
          driver: driver,
          assignedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      });
    } catch (error) {
      console.error("Error accepting job:", error);
      throw error;
    }
  },

  /**
   * Update Order Status (Wrapper for updateOrder)
   */
  updateOrderStatus: async (orderId: string, status: DeliveryOrder['status'], extraData?: Partial<DeliveryOrder>): Promise<void> => {
    const updates: Partial<DeliveryOrder> = {
      status,
      ...extraData,
      updatedAt: new Date().toISOString()
    };

    if (status === 'in_transit') {
      updates.startedAt = new Date().toISOString();
      updates.startTime = updates.startedAt;
    } else if (status === 'delivered') {
      updates.deliveredAt = new Date().toISOString();
      updates.endTime = updates.deliveredAt;
    }

    await orderService.updateOrder(orderId, updates);
  },

  updateDriverLocation: async (orderId: string, location: { lat: number, lng: number, bearing: number }, remainingDistance?: number, remainingDuration?: number, routeGeometry?: string, totalDistance?: number, totalDuration?: number) => {
    try {
      const orderRef = doc(db, ORDERS_COLLECTION, orderId);
      const updates: any = { driverLocation: location };
      if (remainingDistance !== undefined) updates.remainingDistance = remainingDistance;
      if (remainingDuration !== undefined) updates.remainingDuration = remainingDuration;
      if (totalDistance !== undefined) updates.totalRemainingDistance = totalDistance;
      if (totalDuration !== undefined) updates.totalRemainingDuration = totalDuration;
      if (routeGeometry !== undefined) updates.routeGeometry = routeGeometry;
      await updateDoc(orderRef, updates);
    } catch (error) {
      console.error("Error updating driver location:", error);
    }
  },

  /**
   * Estimate Delivery Time based on distance and service type
   */
  estimateDeliveryTime: (distanceMeters: number, serviceType: ServiceType, scheduledTime?: string, durationSeconds?: number, pickupDurationSeconds?: number): { arrivalTime: string, arrivalDate: string } => {
    const now = (scheduledTime && scheduledTime !== 'ASAP') ? new Date(scheduledTime) : new Date();

    let travelTimeMs = 0;
    if (durationSeconds !== undefined && durationSeconds > 0) {
      // Use high-precision duration (including traffic) from Google Routes API V2
      travelTimeMs = durationSeconds * 1000;
    } else {
      // Fallback to distance-based estimation
      const distanceKm = distanceMeters / 1000;
      const avgSpeedKmH = 35;
      const travelTimeHours = distanceKm / avgSpeedKmH;
      travelTimeMs = travelTimeHours * 60 * 60 * 1000;
    }

    // Add pickup duration if provided (e.g. time for driver to reach pickup)
    const pickupMs = (pickupDurationSeconds || 0) * 1000;

    let estimatedArrival = new Date(now.getTime() + travelTimeMs + pickupMs);

    // Add processing/pickup buffer based on service
    if (serviceType === ServiceType.EXPRESS) {
      // Direct pickup immediately (pickupMs already included above)
      estimatedArrival = new Date(estimatedArrival.getTime());
    } else if (serviceType === ServiceType.STANDARD) {
      // 4 hour window for bundling logic
      estimatedArrival = new Date(estimatedArrival.getTime() + (4 * 60 * 60 * 1000));
      // If result is after 6 PM, push to tomorrow 10 AM
      if (estimatedArrival.getHours() >= 18) {
        estimatedArrival.setDate(estimatedArrival.getDate() + 1);
        estimatedArrival.setHours(10, 0, 0, 0);
      }
    } else if (serviceType === ServiceType.ECONOMY) {
      // Always next day delivery
      estimatedArrival.setDate(estimatedArrival.getDate() + 1);
      // If it's already next day from travel time, add more buffer
      estimatedArrival.setHours(15, 0, 0, 0);
    }

    const timeOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
    const dateOptions: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', weekday: 'short' };

    return {
      arrivalTime: estimatedArrival.toLocaleTimeString([], timeOptions),
      arrivalDate: estimatedArrival.toLocaleDateString([], dateOptions)
    };
  },

  /**
   * Update the status of a specific stop in a multi-stop order.
   */
  updateStopStatus: async (orderId: string, stopId: string, status: 'pending' | 'arrived' | 'completed', proofImage?: string): Promise<void> => {
    try {
      const orderRef = doc(db, ORDERS_COLLECTION, orderId);
      await runTransaction(db, async (transaction) => {
        const orderDoc = await transaction.get(orderRef);
        if (!orderDoc.exists()) throw new Error("Order not found");

        const orderData = orderDoc.data() as any;
        const currentStops = orderData.stops || [];

        const newStops = currentStops.map((stop: any) =>
          stop.id === stopId
            ? {
              ...stop,
              status,
              completedAt: status === 'completed' ? new Date().toISOString() : stop.completedAt,
              proofImage: proofImage || stop.proofImage
            }
            : stop
        );

        transaction.update(orderRef, {
          stops: newStops,
          updatedAt: new Date().toISOString()
        });
      });
    } catch (error) {
      console.error("Error updating stop status:", error);
      throw error;
    }
  },

  /**
   * Update driver online status in Firestore.
   */
  updateDriverStatus: async (driverId: string, status: 'online' | 'offline'): Promise<void> => {
    try {
      const driverRef = doc(db, 'drivers', driverId);
      await updateDoc(driverRef, {
        status,
        lastStatusUpdate: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error updating driver status:", error);
    }
  },

  /**
   * Increment driver's total online time.
   */
  incrementDriverOnlineTime: async (driverId: string, minutes: number): Promise<void> => {
    try {
      const driverRef = doc(db, 'drivers', driverId);
      await updateDoc(driverRef, {
        totalOnlineMinutes: increment(minutes),
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error incrementing online time:", error);
    }
  }
};
