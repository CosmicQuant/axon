
import React, { useEffect, useState } from 'react';
import type { DeliveryOrder, Driver, DriverMetrics, User } from '../types';
import { VehicleType } from '../types';
import { orderService } from '../services/orderService';
import { mapService } from '../services/mapService';
import { storageService } from '../services/storageService';
import MapLayer from './MapLayer';
import { MapProvider, useMapState } from '@/context/MapContext';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { usePrompt } from '../context/PromptContext';
import { LOCATION_COORDINATES } from '../constants';
import { useLocation } from 'react-router-dom';
import {
   LayoutDashboard, Map, Package, Wallet, User as UserIcon, LogOut,
   ChevronRight, Star, TrendingUp, Clock, MapPin, Navigation, CheckCircle,
   Truck, DollarSign, Bell, Search, Menu, X, ArrowUpRight, AlertCircle, AlertTriangle,
   FileText, Home, Phone, Mail, CreditCard, Shield, Edit2, Save, Bike, Car,
   Activity, MessageSquare, ChevronDown, ChevronUp, List, Copy, Check, Image, Camera,
   Lock, ShieldCheck, Key, QrCode, RefreshCw, Power, Smartphone, ShieldAlert, FileCheck, Eye, EyeOff
} from 'lucide-react';

interface DriverDashboardProps {
   user: User;
   onGoHome: () => void;
}

type DashboardView = 'OVERVIEW' | 'MARKET' | 'JOBS' | 'DELIVERIES' | 'EARNINGS' | 'PROFILE';

const DriverDashboardContent: React.FC<DriverDashboardProps> = ({ user, onGoHome }) => {
   const { logout, updateUser, deleteAccount } = useAuth();
   const { showAlert } = usePrompt();
   const { isLoaded, setPickupCoords, setDropoffCoords, setWaypointCoords, setOrderState, fitBounds, setDriverCoords, setDriverBearing, setDriverVehicleType, setRoutePolyline, requestUserLocation, driverCoords } = useMapState();
   const [currentView, setCurrentView] = useState<DashboardView>('OVERVIEW');
   const location = useLocation();

   useEffect(() => {
      const params = new URLSearchParams(location.search);
      const view = params.get('view') as DashboardView;
      const openMenu = params.get('menu');

      if (view && ['OVERVIEW', 'MARKET', 'JOBS', 'DELIVERIES', 'EARNINGS', 'PROFILE'].includes(view)) {
         setCurrentView(view);
      }

      if (openMenu === 'open') {
         setIsSidebarOpen(true);
      }
   }, [location.search]);

   const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile toggle
   const [isOnline, setIsOnline] = useState(true);
   const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
   const [copiedId, setCopiedId] = useState<string | null>(null);

   const handleCopyId = (id: string) => {
      navigator.clipboard.writeText(id);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
   };

   // Set Vehicle Type
   useEffect(() => {
      if (user.vehicleType) {
         setDriverVehicleType(user.vehicleType);
      }
   }, [user.vehicleType, setDriverVehicleType]);

   // Data State
   const [availableOrders, setAvailableOrders] = useState<DeliveryOrder[]>([]);
   const [myJobs, setMyJobs] = useState<DeliveryOrder[]>([]);
   const [metrics, setMetrics] = useState<DriverMetrics | null>(null);
   const [loading, setLoading] = useState(false);

   // Edit State
   const [isEditingProfile, setIsEditingProfile] = useState(false);
   const [profileForm, setProfileForm] = useState({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      idNumber: user.idNumber || '',
      address: user.address || '',
      plateNumber: user.plateNumber || '',
      licenseNumber: user.licenseNumber || ''
   });

   // Marketplace Filters
   const [searchQuery, setSearchQuery] = useState('');

   // Settings & Security States
   const [expandedSection, setExpandedSection] = useState<string | null>(null);
   const [is2FAEnabled, setIs2FAEnabled] = useState(false);
   const [isUpdating2FA, setIsUpdating2FA] = useState(false);
   const [showPasswordFields, setShowPasswordFields] = useState(false);
   const [passwords, setPasswords] = useState({ new: '', confirm: '' });
   const [showPass, setShowPass] = useState(false);
   const [deleteConfirmation, setDeleteConfirmation] = useState('');
   const [showDeleteInput, setShowDeleteInput] = useState(false);
   const [notifications, setNotifications] = useState({
      email: true,
      sms: true,
      push: true
   });

   // Map State for Active Job
   const [activeJobCoords, setActiveJobCoords] = useState<{ pickup: { lat: number, lng: number } | null, dropoff: { lat: number, lng: number } | null }>({ pickup: null, dropoff: null });
   const [routeDuration, setRouteDuration] = useState<number | null>(null);
   const [routeDistance, setRouteDistance] = useState<number | null>(null);
   const [isDrawerCollapsed, setIsDrawerCollapsed] = useState(false);

   // Track Driver Online Status & Time
   useEffect(() => {
      if (!user?.id) return;
      orderService.updateDriverStatus(user.id, isOnline ? 'online' : 'offline');
   }, [isOnline, user.id]);

   useEffect(() => {
      if (!isOnline || !user.id) return;

      // Update online time every 1 minute for better accuracy
      const interval = setInterval(async () => {
         try {
            await orderService.incrementDriverOnlineTime(user.id, 1);
         } catch (e) {
            console.error("Failed to update online time", e);
         }
      }, 60 * 1000);

      return () => clearInterval(interval);
   }, [isOnline, user.id]);

   // Verification State
   const [verifyingOrder, setVerifyingOrder] = useState<DeliveryOrder | null>(null);
   const [verifyingStopId, setVerifyingStopId] = useState<string | null>(null);
   const [verificationInput, setVerificationInput] = useState('');
   const [verificationError, setVerificationError] = useState('');
   const [deliveryConfirmationImage, setDeliveryConfirmationImage] = useState<string | null>(null);
   const [deliveryConfirmationFile, setDeliveryConfirmationFile] = useState<File | null>(null);

   // Review State
   const [reviewingOrder, setReviewingOrder] = useState<DeliveryOrder | null>(null);
   const [reviewRating, setReviewRating] = useState(5);
   const [reviewComment, setReviewComment] = useState('');
   const [selectedTags, setSelectedTags] = useState<string[]>([]);

   const customerTags = ["Polite", "Quick Handover", "Accurate Location", "Easy to Reach", "Respectful"];

   // Derived State
   const activeJob = myJobs.find(j => j.status !== 'delivered');
   const hasActiveJob = !!activeJob;

   // Multi-stop Logic: Create a unified sequential list of all stops
   // Sorted by sequenceOrder for optimized routing
   const allStops = React.useMemo(() => {
      if (!activeJob) return [];

      const hasDropoffInStops = activeJob.stops?.some(s => s.type === 'dropoff');

      const stops = [
         {
            id: 'pickup-start',
            address: activeJob.pickup,
            type: 'pickup' as const,
            status: (activeJob.status === 'driver_assigned') ? 'pending' : 'completed',
            coords: activeJob.pickupCoords || activeJobCoords.pickup,
            label: 'Pickup',
            verificationCode: activeJob.verificationCode, // Main order code for pickup
            sequenceOrder: 0
         },
         ...(activeJob.stops || []).map(s => ({
            ...s,
            coords: { lat: s.lat, lng: s.lng },
            label: s.type === 'dropoff' ? 'Final Dropoff' : `Stop ${s.sequenceOrder || ''}`,
            verificationCode: s.verificationCode || activeJob.verificationCode
         }))
      ];

      // If final dropoff is not in stops array, add it manually
      if (!hasDropoffInStops) {
         stops.push({
            id: 'dropoff-end',
            address: activeJob.dropoff,
            type: 'dropoff' as const,
            status: (activeJob.status === 'delivered') ? 'completed' : 'pending',
            coords: activeJob.dropoffCoords || activeJobCoords.dropoff,
            label: 'Final Dropoff',
            verificationCode: activeJob.verificationCode,
            sequenceOrder: 999
         });
      }

      // Sort by sequenceOrder for optimized route
      return stops.sort((a, b) => (a.sequenceOrder || 0) - (b.sequenceOrder || 0));
   }, [activeJob, activeJobCoords.pickup, activeJobCoords.dropoff]);

   const nextStop = allStops.find(s => s.status !== 'completed');

   // Geocode Active Job and Sync with Global Map
   useEffect(() => {
      const syncMap = async () => {
         // Changed so that it syncs even if currentView isn't 'JOBS' (for 'OVERVIEW')
         if (activeJob && (currentView === 'JOBS' || currentView === 'OVERVIEW') && isLoaded) {
            const p = activeJob.pickupCoords || await mapService.geocodeAddress(activeJob.pickup);
            const d = activeJob.dropoffCoords || await mapService.geocodeAddress(activeJob.dropoff);
            setActiveJobCoords({ pickup: p, dropoff: d });

            if (p && d) {
               setPickupCoords(p);
               setDropoffCoords(d);

               // Set Waypoints for multi-stop visualization
               if (activeJob.stops && activeJob.stops.length > 0) {
                  const wpCoords = activeJob.stops
                     .filter(s => s.type === 'waypoint')
                     .map(s => ({ lat: s.lat, lng: s.lng }));
                  setWaypointCoords(wpCoords);
               } else {
                  setWaypointCoords([]);
               }

               setOrderState('IN_TRANSIT');

               // Determine navigation target based on multi-stop logic
               const userLoc = await requestUserLocation();
               const remainingStops = allStops.filter(s => s.status !== 'completed');

               if (remainingStops.length > 0) {
                  const startPoint = userLoc || (activeJob.status === 'in_transit' ? p : p);
                  const endPoint = remainingStops[remainingStops.length - 1].coords;
                  const waypoints = remainingStops.slice(0, -1).map(s => s.coords);

                  if (startPoint && endPoint) {
                     // Fit bounds to include current location and all stops for the "entire route" view
                     const allPoints = [startPoint, p, d, ...allStops.map(s => s.coords!)].filter(pt => !!pt);
                     fitBounds(allPoints);
                     const route = await mapService.getRoute(startPoint, endPoint, waypoints);
                     if (route) {
                        setRoutePolyline(route.geometry);
                        setRouteDuration(Math.ceil(route.duration / 60));
                        setRouteDistance(Math.round((route.distance / 1000) * 10) / 10);
                     }
                  }
               } else {
                  fitBounds([p, d]);
                  const route = await mapService.getRoute(p, d);
                  if (route) {
                     setRoutePolyline(route.geometry);
                     setRouteDuration(Math.ceil(route.duration / 60));
                     setRouteDistance(Math.round((route.distance / 1000) * 10) / 10);
                  }
               }
            }
         } else if (!activeJob) {
            setPickupCoords(null);
            setDropoffCoords(null);
            setWaypointCoords([]);
            setRoutePolyline(null);
            setOrderState('IDLE');
            setRouteDuration(null);
            setRouteDistance(null);
         }
      };
      syncMap();
   }, [activeJob?.id, activeJob?.pickup, activeJob?.dropoff, nextStop?.id, currentView, isLoaded, setPickupCoords, setDropoffCoords, setWaypointCoords, setOrderState, fitBounds, setRoutePolyline]);

   // Real-time Driver Tracking
   useEffect(() => {
      if (hasActiveJob && currentView === 'JOBS' && isLoaded) {
         let lastRouteUpdate = 0;
         const ROUTE_UPDATE_INTERVAL = 15000; // Update route every 15 seconds

         const watchId = navigator.geolocation.watchPosition(
            async (position) => {
               const { latitude, longitude, heading } = position.coords;
               const currentCoords = { lat: latitude, lng: longitude };
               setDriverCoords(currentCoords);
               if (heading) setDriverBearing(heading);

               // Update Firestore with live location
               if (activeJob) {
                  // Update Route and ETA
                  const now = Date.now();
                  let remDist: number | undefined;
                  let remDur: number | undefined;
                  let currentRouteGeometry: string | undefined;

                  if (now - lastRouteUpdate > ROUTE_UPDATE_INTERVAL) {
                     lastRouteUpdate = now;

                     // Determine destination based on status and stops
                     const remainingStops = allStops.filter(s => s.status !== 'completed');
                     if (remainingStops.length > 0) {
                        const endPoint = remainingStops[remainingStops.length - 1].coords;
                        const waypoints = remainingStops.slice(0, -1).map(s => s.coords);

                        if (endPoint) {
                           const route = await mapService.getRoute(currentCoords, endPoint, waypoints);
                           if (route) {
                              currentRouteGeometry = route.geometry;
                              setRoutePolyline(route.geometry);
                              remDur = Math.ceil(route.duration / 60);
                              remDist = Math.round((route.distance / 1000) * 10) / 10;
                              setRouteDuration(remDur);
                              setRouteDistance(remDist);
                           }
                        }
                     }
                  }

                  orderService.updateDriverLocation(activeJob.id, {
                     lat: latitude,
                     lng: longitude,
                     bearing: heading || 0
                  }, remDist, remDur, currentRouteGeometry);
               }
            },
            (error) => console.error("Geolocation error:", error),
            { enableHighAccuracy: true }
         );
         return () => navigator.geolocation.clearWatch(watchId);
      }
   }, [hasActiveJob, currentView, isLoaded, setDriverCoords, setDriverBearing, activeJob?.id, activeJob?.status, activeJobCoords.pickup, activeJobCoords.dropoff, setRoutePolyline, nextStop?.coords, allStops]);

   // Filtered Orders Logic
   const filteredOrders = availableOrders.filter(order => {
      const matchesSearch =
         order.pickup.toLowerCase().includes(searchQuery.toLowerCase()) ||
         order.dropoff.toLowerCase().includes(searchQuery.toLowerCase()) ||
         order.items.description.toLowerCase().includes(searchQuery.toLowerCase());

      // Only show orders that match the driver's vehicle type and are still pending
      const matchesVehicle = order.vehicle === user?.vehicleType;
      const isPending = order.status === 'pending';

      return matchesSearch && matchesVehicle && isPending;
   });

   // Helper for Icons
   const getVehicleIcon = (type: string) => {
      if (type === VehicleType.BODA) return Bike;
      if (type === VehicleType.TUKTUK) return Car;
      return Truck;
   };

   // Fetch Logic
   const fetchData = async () => {
      // Only set loading on initial fetch, not polling
      if (!metrics) setLoading(true);
      try {
         const [market, jobs, driverMetrics] = await Promise.all([
            orderService.getMarketplaceOrders(),
            orderService.getDriverJobs(user.id),
            orderService.getDriverMetrics(user.id)
         ]);

         setAvailableOrders(market);
         setMyJobs(jobs);
         setMetrics(driverMetrics);
      } catch (e) {
         console.error(e);
      } finally {
         if (!metrics) setLoading(false);
      }
   };

   // --- REAL-TIME DATA LISTENERS ---
   useEffect(() => {
      if (!user || !user.id) return;
      setLoading(true);

      // 1. Listen for Marketplace Orders (status == 'pending')
      const qMarket = query(collection(db, 'orders'), where('status', '==', 'pending'));
      const unsubMarket = onSnapshot(qMarket, (snapshot) => {
         const marketOrders = snapshot.docs.map(doc => ({ ...doc.data() as any, id: doc.id } as DeliveryOrder));
         // Deduplicate by ID
         const uniqueOrders = marketOrders.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
         setAvailableOrders(uniqueOrders.sort((a, b) => {
            const dateA = a.date ? new Date(a.date).getTime() : 0;
            const dateB = b.date ? new Date(b.date).getTime() : 0;
            return dateB - dateA;
         }));
         setLoading(false);
      }, (error) => {
         console.error("Marketplace Listener Error:", error);
         setLoading(false);
      });

      // 2. Listen for My Jobs (driver.id == user.id)
      const qJobs = query(collection(db, 'orders'), where('driver.id', '==', user.id));
      const unsubJobs = onSnapshot(qJobs, async (snapshot) => {
         const jobs = snapshot.docs.map(doc => ({ ...doc.data() as any, id: doc.id } as DeliveryOrder));
         // Deduplicate by ID
         const uniqueJobs = jobs.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
         setMyJobs(uniqueJobs.sort((a, b) => {
            const dateA = a.date ? new Date(a.date).getTime() : 0;
            const dateB = b.date ? new Date(b.date).getTime() : 0;
            return dateB - dateA;
         }));

         // Refresh metrics when jobs change (e.g., a delivery is completed)
         const m = await orderService.getDriverMetrics(user.id);
         setMetrics(m);
      }, (error) => {
         console.error("Jobs Listener Error:", error);
      });

      // 3. Real-time Metrics
      const loadMetrics = async () => {
         const m = await orderService.getDriverMetrics(user.id);
         setMetrics(m);
      };
      loadMetrics();

      return () => {
         unsubMarket();
         unsubJobs();
      };
   }, [user.id]);

   // Handlers
   const handleAcceptJob = async (order: DeliveryOrder) => {
      if (hasActiveJob) {
         showAlert("Active Delivery", "You have an active delivery! Please complete it before accepting a new one.", "warning");
         return;
      }

      const driverDetails: Driver = {
         id: user.id,
         name: user.name,
         phone: user.phone || '0700000000',
         plate: user.plateNumber || 'UNKNOWN',
         rating: 5.0,
         avatar: user.avatar || user.profileImage
      };

      try {
         await orderService.acceptOrder(order.id, driverDetails);
         setCurrentView('JOBS');
      } catch (e: any) {
         console.error("Failed to accept job", e);
         const msg = e.message || "Could not accept job. It might have been taken.";
         showAlert('Job Unavailable', msg, 'error'); // Replaced alert with showAlert
      }
   };

   const handleStartDelivery = async (order: DeliveryOrder) => {
      let pickup = order.pickupCoords || activeJobCoords.pickup;
      if (!pickup) {
         pickup = await mapService.geocodeAddress(order.pickup);
      }

      if (!pickup) {
         showAlert("Location Error", "Could not verify pickup location coordinates.", "error");
         return;
      }

      navigator.geolocation.getCurrentPosition(
         async (position) => {
            const currentCoords = { lat: position.coords.latitude, lng: position.coords.longitude };
            const distance = mapService.calculateDistance(currentCoords, pickup!);

            if (distance > 0.05) { // 50 meters
               showAlert("Not at Pickup", `You must be within 50m of the pickup location to start the delivery. You are currently ${Math.round(distance * 1000)}m away.`, "warning");
               return;
            }

            try {
               await orderService.updateOrderStatus(order.id, 'in_transit');
               // Also mark the pickup stop as completed if multi-stop
               if (order.stops?.some(s => s.id === 'pickup-start')) {
                  await orderService.updateStopStatus(order.id, 'pickup-start', 'completed');
               }
            } catch (e) {
               showAlert("Update Failed", "Failed to start delivery. Please try again.", "error");
            }
         },
         (error) => {
            console.error("Geolocation error:", error);
            showAlert("Location Error", "Could not get your current location. Please enable GPS.", "error");
         },
         { enableHighAccuracy: true }
      );
   };

   const handleUpdateStatus = async (orderId: string, newStatus: DeliveryOrder['status']) => {
      if (newStatus === 'delivered') {
         const order = myJobs.find(j => j.id === orderId);
         if (order) {
            // Check if all intermediate waypoints are completed first
            const pendingWaypoints = (order.stops || []).filter(s => s.type === 'waypoint' && s.status !== 'completed');
            if (pendingWaypoints.length > 0) {
               showAlert("Pending Stops", `You must complete all ${pendingWaypoints.length} intermediate stops before final delivery.`, "warning");
               return;
            }

            // Check distance to dropoff before allowing completion
            let dropoff = order.dropoffCoords || (activeJob?.id === order.id ? activeJobCoords.dropoff : null);
            if (!dropoff) {
               dropoff = await mapService.geocodeAddress(order.dropoff);
            }

            if (!dropoff) {
               showAlert("Location Error", "Could not verify dropoff location coordinates.", "error");
               return;
            }

            navigator.geolocation.getCurrentPosition(
               async (position) => {
                  const currentCoords = { lat: position.coords.latitude, lng: position.coords.longitude };
                  const distance = mapService.calculateDistance(currentCoords, dropoff!);

                  if (distance > 0.05) { // 50 meters
                     showAlert("Too Far", `You must be within 50m of the dropoff location to complete delivery.`, "warning");
                     return;
                  }

                  closeVerificationModal();
                  setVerifyingOrder(order);
               },
               (error) => {
                  console.error("Geolocation error:", error);
                  showAlert("Location Error", "Could not get your current location. Please enable GPS to complete delivery.", "error");
               },
               { enableHighAccuracy: true }
            );
            return;
         }
      }

      try {
         await orderService.updateOrderStatus(orderId, newStatus);
      } catch (e: any) {
         console.error("Failed to update status", e);
         showAlert("Update Failed", "Failed to update order status. Please try again.", "error");
      }
   };

   const handleUpdateStopStatus = async (orderId: string, stopId: string, status: 'pending' | 'arrived' | 'completed') => {
      const stop = allStops.find(s => s.id === stopId);
      if (!stop) return;

      // If marking as completed, verify location and code
      if (status === 'completed') {
         const checkLocation = (coords: { lat: number, lng: number }) => {
            const distance = mapService.calculateDistance(coords, stop.coords!);
            if (distance <= 0.05) { // 50 meters
               const order = myJobs.find(j => j.id === orderId);
               if (order) {
                  setVerifyingOrder(order);
                  setVerifyingStopId(stopId);
               }
               return true;
            }
            return false;
         };

         // Try using context coords first for instant response if they are fresh
         if (driverCoords && checkLocation(driverCoords)) {
            return;
         }

         // Otherwise request fresh location with a timeout to avoid long waits
         navigator.geolocation.getCurrentPosition(
            async (position) => {
               const currentCoords = { lat: position.coords.latitude, lng: position.coords.longitude };
               if (!checkLocation(currentCoords)) {
                  showAlert("Too Far", `You must be within 50m of the stop to mark it as completed.`, "warning");
               }
            },
            () => showAlert("Location Error", "GPS required. Please ensure location services are enabled."),
            {
               enableHighAccuracy: true,
               timeout: 5000,
               maximumAge: 10000
            }
         );
         return;
      }

      try {
         await orderService.updateStopStatus(orderId, stopId, status);
      } catch (e) {
         showAlert("Error", "Failed to update stop status.", "error");
      }
   };

   const handleVerifyAndComplete = async () => {
      if (!verifyingOrder) return;

      // Determine which code to check
      let targetCode = verifyingOrder.verificationCode;
      let targetStop: any = null;

      if (verifyingStopId) {
         targetStop = allStops.find(s => s.id === verifyingStopId);
         if (targetStop) {
            targetCode = targetStop.verificationCode;
         }
      }

      if (verificationInput !== targetCode) {
         setVerificationError('Incorrect passcode. Please ask the recipient for the correct 4-digit code.');
         return;
      }

      if (!deliveryConfirmationImage || !deliveryConfirmationFile) {
         setVerificationError('Please take a photo of the delivered goods to complete verification.');
         return;
      }

      try {
         setLoading(true);

         // Upload image to Firebase Storage instead of storing base64 in Firestore
         const storagePath = `deliveries/${verifyingOrder.id}_${verifyingStopId || 'final'}_${Date.now()}.jpg`;
         const imageUrl = await storageService.uploadFile(deliveryConfirmationFile, storagePath);

         if (verifyingStopId) {
            // Complete individual stop
            await orderService.updateStopStatus(verifyingOrder.id, verifyingStopId, 'completed', imageUrl);
            showAlert("Stop Completed", "Verification confirmed. Heading to next stop!", "success");
         } else {
            // Complete whole order
            const orderToReview = verifyingOrder;
            await orderService.updateOrderStatus(verifyingOrder.id, 'delivered', {
               deliveryConfirmationImage: imageUrl
            });

            // Also mark the final stop as completed if multi-stop
            if (verifyingOrder.stops?.some(s => s.id === 'dropoff-end')) {
               await orderService.updateStopStatus(verifyingOrder.id, 'dropoff-end', 'completed', imageUrl);
            }

            showAlert("Delivery Successful", "Verification confirmed. Delivery has been completed!", "success");

            // Trigger review for customer
            setReviewingOrder(orderToReview);
            setReviewRating(5);
            setReviewComment('');
            setSelectedTags([]);
         }

         closeVerificationModal();
      } catch (e: any) {
         console.error("Verification error", e);
         setVerificationError("Failed to complete verification. Please try again.");
      } finally {
         setLoading(false);
      }
   };

   const handleSaveProfile = async () => {
      try {
         // Security: Only allow updating safe fields. Documents and IDs are locked.
         const { idNumber, plateNumber, licenseNumber, ...safeFields } = profileForm;
         await updateUser(safeFields);
         setIsEditingProfile(false);
         showAlert("Profile Updated", "Your profile details have been updated successfully.", "success");
      } catch (e: any) {
         showAlert("Error", e.message || "Failed to update profile", "error");
      }
   };

   const handleToggle2FA = async () => {
      setIsUpdating2FA(true);
      try {
         await new Promise(resolve => setTimeout(resolve, 1500));
         setIs2FAEnabled(!is2FAEnabled);
         showAlert(is2FAEnabled ? '2FA Disabled' : '2FA Enabled Successfully', 'success');
      } catch (error) {
         showAlert('Failed to update security settings', 'error');
      } finally {
         setIsUpdating2FA(false);
      }
   };

   const handlePasswordUpdate = async () => {
      if (passwords.new !== passwords.confirm) {
         showAlert("Passwords do not match!", 'error');
         return;
      }
      if (passwords.new.length < 6) {
         showAlert("Password must be at least 6 characters.", 'error');
         return;
      }

      setLoading(true);
      try {
         if (updatePassword) {
            await updatePassword(passwords.new);
            showAlert("Password updated successfully!", 'success');
            setShowPasswordFields(false);
            setPasswords({ new: '', confirm: '' });
         }
      } catch (error: any) {
         showAlert(error.message || "Failed to update password", 'error');
      } finally {
         setLoading(false);
      }
   };

   const handleDeactivateAccount = async () => {
      if (!window.confirm('Are you sure you want to deactivate your driver account? You can reactivate anytime by logging back in.')) return;

      try {
         await updateUser({ status: 'deactivated' });
         showAlert('Account deactivated. Powering down...', 'info');
         logout();
         navigate('/');
      } catch (error) {
         showAlert('Failed to deactivate account', 'error');
      }
   };

   const handleDeleteAccount = async () => {
      if (deleteConfirmation !== 'DELETE') return;

      try {
         await deleteAccount();
         showAlert('All driver data has been erased.', 'success');
         logout();
         navigate('/');
      } catch (error: any) {
         if (error.code === 'auth/requires-recent-login') {
            showAlert('Action Required', 'Please log out and log back in to perform this security-sensitive action.', 'error');
         } else {
            showAlert('Error', error.message || "Failed to delete account", 'error');
         }
      } finally {
         setIsDeleteModalOpen(false);
      }
   };

   const handleReviewSubmit = async () => {
      if (!reviewingOrder) return;

      try {
         setLoading(true);
         const finalComment = selectedTags.length > 0
            ? `${selectedTags.join(', ')}${reviewComment ? ': ' : ''}${reviewComment}`.trim()
            : reviewComment;

         await orderService.submitReview(reviewingOrder.id, 'customer', {
            rating: reviewRating,
            comment: finalComment,
            date: new Date().toISOString()
         });
         setReviewingOrder(null);
         setSelectedTags([]);
         showAlert("Review Submitted", "Thank you for rating the customer!", "success");
      } catch (e) {
         showAlert("Error", "Failed to submit review.", "error");
      } finally {
         setLoading(false);
      }
   };

   const closeVerificationModal = () => {
      setVerifyingOrder(null);
      setVerifyingStopId(null);
      setVerificationInput('');
      setVerificationError('');
      setDeliveryConfirmationImage(null);
      setDeliveryConfirmationFile(null);
   };

   const openGoogleMaps = (locationName: string) => {
      const normalize = (s: string) => s.toLowerCase().trim();
      const target = normalize(locationName);
      const keys = Object.keys(LOCATION_COORDINATES).sort((a, b) => b.length - a.length);
      const match = keys.find(k => target.includes(normalize(k)));

      let destinationQuery = encodeURIComponent(locationName);

      if (match) {
         const [lat, lng] = LOCATION_COORDINATES[match];
         destinationQuery = `${lat},${lng}`;
      }

      const url = `https://www.google.com/maps/dir/?api=1&destination=${destinationQuery}`;
      window.open(url, '_blank');
   };

   // --- SUB-COMPONENTS ---

   const SidebarItem = ({ view, icon: Icon, label }: { view: DashboardView, icon: any, label: string }) => (
      <button
         onClick={() => {
            setCurrentView(view);
            setIsSidebarOpen(false);
         }}
         className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all mb-1 ${currentView === view
            ? 'bg-brand-50 text-brand-600 font-bold border border-brand-100'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium'
            }`}
      >
         <Icon className={`w-5 h-5 ${currentView === view ? 'stroke-[2.5px]' : ''}`} />
         <span>{label}</span>
         {view === 'MARKET' && availableOrders.length > 0 && (
            <span className="ml-auto bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
               {availableOrders.length}
            </span>
         )}
      </button>
   );

   const StatCard = ({ title, value, icon: Icon, color, trend, onClick }: any) => (
      <div
         onClick={onClick}
         className={`bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-start justify-between transition-all ${onClick ? 'cursor-pointer hover:border-brand-200 hover:shadow-md active:scale-[0.98]' : ''}`}
      >
         <div>
            <p className="text-gray-500 text-sm font-medium mb-1">{title}</p>
            <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
            {trend && (
               <p className="text-emerald-600 text-xs font-bold mt-2 flex items-center">
                  <TrendingUp className="w-3 h-3 mr-1" /> {trend}
               </p>
            )}
         </div>
         <div className={`p-3 rounded-xl ${color}`}>
            <Icon className="w-6 h-6" />
         </div>
      </div>
   );

   return (
      <div className={`min-h-screen flex relative ${hasActiveJob && currentView === 'JOBS' ? '' : 'bg-slate-50'}`}>
         {/* SIDEBAR (Desktop) - Always interactive */}
         <aside className={`fixed inset-y-0 left-0 bg-white border-r border-gray-100 w-64 z-50 transform transition-transform duration-300 lg:translate-x-0 pointer-events-auto ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="h-full flex flex-col">
               <div className="h-20 flex items-center px-6 border-b border-gray-100">
                  <button onClick={onGoHome} className="flex items-center hover:opacity-80 transition-opacity">
                     <div className="bg-brand-600 p-1.5 rounded-lg mr-3">
                        <Truck className="text-white w-5 h-5" />
                     </div>
                     <span className="text-xl font-bold text-gray-900 tracking-tight">Tuma<span className="text-brand-600">Drive</span></span>
                  </button>
               </div>

               <div className="p-4 space-y-2 flex-1 overflow-y-auto">
                  <button
                     onClick={onGoHome}
                     className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all mb-2 text-gray-600 hover:bg-gray-50 hover:text-brand-600 font-medium border border-transparent"
                  >
                     <Home className="w-5 h-5 text-gray-400" />
                     <span>Back to Home</span>
                  </button>
                  <div className="h-px bg-gray-100 my-2 mx-4"></div>
                  <div className="text-xs font-bold text-gray-400 uppercase px-4 py-2">Menu</div>
                  <SidebarItem view="OVERVIEW" icon={LayoutDashboard} label="Dashboard" />
                  <SidebarItem view="MARKET" icon={Search} label="Marketplace" />
                  <SidebarItem view="JOBS" icon={Package} label="Active Job" />
                  <SidebarItem view="DELIVERIES" icon={List} label="My Deliveries" />
                  <SidebarItem view="EARNINGS" icon={Wallet} label="Earnings" />
                  <SidebarItem view="PROFILE" icon={UserIcon} label="Profile" />
               </div>

               <div className="p-4 border-t border-gray-100 bg-gray-50">
                  <div className="flex items-center space-x-3 mb-4 px-2">
                     <div className="w-10 h-10 rounded-full bg-brand-100 border border-brand-200 flex items-center justify-center text-brand-600 font-bold">
                        {user.name.charAt(0)}
                     </div>
                     <div className="overflow-hidden">
                        <p className="text-sm font-bold text-gray-900 truncate">{user.name}</p>
                        <div className="flex items-center space-x-2">
                           <p className="text-xs text-gray-500 truncate">{user.email}</p>
                           {metrics && (
                              <div className="flex items-center text-yellow-600 text-[10px] font-bold bg-yellow-50 px-1.5 py-0.5 rounded">
                                 <Star className="w-2.5 h-2.5 mr-0.5 fill-current" />
                                 {metrics.performance.rating}
                              </div>
                           )}
                        </div>
                     </div>
                  </div>
                  <button
                     onClick={logout}
                     className="w-full flex items-center justify-center space-x-2 text-red-600 bg-white border border-red-100 hover:bg-red-50 py-2 rounded-lg text-sm font-bold transition-colors"
                  >
                     <LogOut className="w-4 h-4" /> <span>Sign Out</span>
                  </button>
               </div>
            </div>
         </aside>

         {/* MOBILE OVERLAY */}
         {isSidebarOpen && (
            <div className="fixed inset-0 bg-black/20 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)}></div>
         )}

         {/* MAIN CONTENT */}
         <main className={`flex-1 lg:ml-64 flex flex-col min-h-screen transition-all relative ${currentView === 'JOBS' ? 'bg-transparent' : ''}`}>
            {/* Map Layer - Now inside main and relative to it */}
            {hasActiveJob && currentView === 'JOBS' && (
               <div className="absolute inset-0 z-0 pointer-events-auto">
                  <MapLayer />
                  {/* Locate Me Button */}
                  <div className="absolute top-24 right-4 z-20 pointer-events-auto">
                     <button
                        onClick={() => requestUserLocation()}
                        className="w-12 h-12 bg-white/80 backdrop-blur-md rounded-2xl shadow-xl flex items-center justify-center text-gray-600 hover:text-brand-600 transition-all active:scale-95 border border-gray-100"
                     >
                        <Navigation className="w-6 h-6" />
                     </button>
                  </div>
               </div>
            )}

            {/* TOP HEADER */}
            <header className={`h-20 sticky top-0 z-20 px-4 sm:px-8 flex items-center justify-between pointer-events-auto ${currentView === 'JOBS' ? 'bg-transparent' : 'bg-white/80 backdrop-blur-md border-b border-gray-100'}`}>
               <div className="flex items-center">
                  <button onClick={() => setIsSidebarOpen(true)} className="mr-4 lg:hidden text-gray-600 hover:text-gray-900">
                     <Menu className="w-6 h-6" />
                  </button>
                  {currentView !== 'JOBS' && (
                     <h2 className="text-xl font-bold capitalize text-gray-900">
                        {currentView === 'MARKET' ? 'Marketplace' : currentView.toLowerCase()}
                     </h2>
                  )}
               </div>

               <div className="flex items-center space-x-4">
                  {/* Online Toggle */}
                  <div
                     onClick={() => setIsOnline(!isOnline)}
                     className={`flex items-center px-3 py-1.5 rounded-full cursor-pointer transition-all border backdrop-blur-md ${isOnline ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-gray-100 border-gray-200 text-gray-500'}`}
                  >
                     <div className={`w-2.5 h-2.5 rounded-full mr-2 ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`}></div>
                     <span className="text-sm font-bold">{isOnline ? 'Online' : 'Offline'}</span>
                  </div>

                  <button className={`p-2.5 backdrop-blur-md border rounded-xl transition-all relative ${currentView === 'JOBS' ? 'bg-white/10 border-white/20 text-white/60 hover:text-white' : 'bg-white border-gray-100 text-gray-400 hover:text-gray-600'}`}>
                     <Bell className="w-5 h-5" />
                     <span className="absolute top-2 right-2 w-2 h-2 bg-brand-600 rounded-full border-2 border-white"></span>
                  </button>
               </div>
            </header>

            {/* VIEW CONTENT */}
            <div className={`relative z-10 p-4 sm:p-8 space-y-6 ${currentView === 'JOBS' ? 'hidden' : 'pointer-events-auto'}`}>

               {/* ... (Other Views OVERVIEW, EARNINGS, MARKET remain unchanged) ... */}
               {currentView === 'OVERVIEW' && metrics && (
                  <div className="space-y-8 animate-in fade-in duration-500 pointer-events-auto">
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard
                           title="Today's Earnings"
                           value={`KES ${metrics.earnings.today.toLocaleString()}`}
                           icon={DollarSign}
                           color="bg-emerald-50 text-emerald-600"
                           trend="+12%"
                           onClick={() => setCurrentView('EARNINGS')}
                        />
                        <StatCard
                           title="Completed Trips"
                           value={metrics.performance.tripsCompleted}
                           icon={CheckCircle}
                           color="bg-orange-50 text-orange-600"
                           trend="Lifetime"
                           onClick={() => setCurrentView('DELIVERIES')}
                        />
                        <StatCard
                           title="Hours Online"
                           value={`${metrics.performance.hoursOnline.toFixed(1)} hrs`}
                           icon={Clock}
                           color="bg-blue-50 text-blue-600"
                           trend="Live Track"
                        />
                        <StatCard
                           title="Distance (Today)"
                           value={`${(metrics.performance.totalDistanceKm || 0).toFixed(1)} km`}
                           icon={Navigation}
                           color="bg-purple-50 text-purple-600"
                           trend="Target: 50km"
                        />
                     </div>
                     {/* ... (Existing Overview Content) ... */}
                     <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                           <div className="flex justify-between items-center mb-6">
                              <h3 className="font-bold text-lg text-gray-900">Current Status</h3>
                              <button onClick={() => setCurrentView('JOBS')} className="text-brand-600 text-sm font-bold hover:underline">View All</button>
                           </div>
                           {hasActiveJob ? (
                              <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 flex items-center justify-between">
                                 <div className="flex items-center space-x-4">
                                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-brand-600 shadow-sm border border-gray-100">
                                       <Navigation className="w-6 h-6" />
                                    </div>
                                    <div>
                                       <h4 className="font-bold text-gray-900">Delivery in Progress</h4>
                                       <p className="text-sm text-gray-500">Heading to {activeJob?.status === 'driver_assigned' ? activeJob.pickup : activeJob?.dropoff}</p>
                                    </div>
                                 </div>
                                 <button onClick={() => setCurrentView('JOBS')} className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-bold hover:bg-brand-700 transition-colors">
                                    Manage
                                 </button>
                              </div>
                           ) : (
                              <div className="text-center py-8 text-gray-400">
                                 <p>No active delivery. Go to Marketplace to find work.</p>
                                 <button onClick={() => setCurrentView('MARKET')} className="mt-4 px-6 py-2 bg-gray-50 text-gray-900 rounded-lg font-bold hover:bg-gray-100 transition-colors border border-gray-200">
                                    Find Work
                                 </button>
                              </div>
                           )}
                        </div>
                        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                           <h3 className="font-bold text-lg text-gray-900 mb-4">Quick Stats</h3>
                           <div className="space-y-4">
                              <div className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors">
                                 <div className="flex items-center space-x-3">
                                    <Clock className="w-5 h-5 text-gray-400" />
                                    <span className="text-sm font-medium text-gray-600">Hours Online</span>
                                 </div>
                                 <span className="font-bold text-gray-900">{metrics.performance.hoursOnline}h</span>
                              </div>
                              <div className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors">
                                 <div className="flex items-center space-x-3">
                                    <Map className="w-5 h-5 text-gray-400" />
                                    <span className="text-sm font-medium text-gray-600">Distance</span>
                                 </div>
                                 <span className="font-bold text-gray-900">{metrics.performance.totalDistanceKm} km</span>
                              </div>
                           </div>
                        </div>

                        {/* Recent Reviews */}
                        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                           <h3 className="font-bold text-lg text-gray-900 mb-6">Recent Reviews</h3>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {metrics.recentReviews && metrics.recentReviews.length > 0 ? (
                                 metrics.recentReviews.map((review) => (
                                    <div key={review.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                       <div className="flex justify-between items-start mb-2">
                                          <div className="flex items-center space-x-2">
                                             <div className="flex text-yellow-400">
                                                {[...Array(5)].map((_, i) => (
                                                   <Star key={i} className={`w-3 h-3 ${i < review.rating ? 'fill-current' : 'text-gray-200'}`} />
                                                ))}
                                             </div>
                                             <span className="text-xs font-bold text-gray-900">{review.customerName || 'Customer'}</span>
                                          </div>
                                          <span className="text-[10px] text-gray-400">{new Date(review.date).toLocaleDateString()}</span>
                                       </div>
                                       {review.comment && (
                                          <p className="text-sm text-gray-600 italic line-clamp-2">"{review.comment}"</p>
                                       )}
                                    </div>
                                 ))
                              ) : (
                                 <div className="col-span-full text-center py-8 text-gray-400 text-sm">
                                    No reviews yet. Complete deliveries to earn ratings!
                                 </div>
                              )}
                           </div>
                        </div>
                     </div>
                  </div>
               )}

               {currentView === 'DELIVERIES' && (
                  <div className="space-y-6 animate-in fade-in duration-500 pb-12 pointer-events-auto">
                     <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Delivery History</h2>
                        <div className="flex items-center space-x-3">
                           <div className="px-4 py-2 text-[10px] font-black text-brand-600 bg-brand-50 rounded-xl border border-brand-100 uppercase tracking-widest">
                              Jobs: {myJobs.length}
                           </div>
                           <div className="px-4 py-2 text-[10px] font-black text-emerald-600 bg-emerald-50 rounded-xl border border-emerald-100 uppercase tracking-widest">
                              Earned: KES {myJobs.filter(j => j.status === 'delivered').reduce((sum, j) => sum + (j.driverRate || Math.floor((j.price || 0) * 0.8)), 0).toLocaleString()}
                           </div>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 gap-4">
                        {myJobs.length === 0 ? (
                           <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
                              <Package className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                              <h3 className="text-lg font-bold text-gray-900">No deliveries yet</h3>
                              <p className="text-gray-500">Your accepted and completed jobs will appear here.</p>
                           </div>
                        ) : (
                           myJobs.map((job) => {
                              const Icon = getVehicleIcon(job.vehicle);
                              const isCompleted = job.status === 'delivered';
                              return (
                                 <div key={job.id} className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm hover:border-brand-200 transition-all group">
                                    <div className="flex flex-col md:flex-row justify-between gap-6">
                                       <div className="flex-1 min-w-0">
                                          <div className="flex items-center space-x-2 mb-3">
                                             <button
                                                onClick={() => handleCopyId(job.id)}
                                                className="flex items-center space-x-1 px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-[10px] font-mono font-bold hover:bg-brand-50 hover:text-brand-600 transition-all"
                                                title="Copy Tracking ID"
                                             >
                                                <span>ID: {job.id}</span>
                                                {copiedId === job.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 opacity-40" />}
                                             </button>
                                             <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${isCompleted ? 'bg-emerald-50 text-emerald-600' : 'bg-brand-50 text-brand-600'
                                                }`}>
                                                {job.status.replace('_', ' ')}
                                             </span>
                                          </div>
                                          <h3 className="text-lg font-black text-gray-900 mb-4">{job.items.description}</h3>

                                          <div className="space-y-3">
                                             <div className="flex items-center space-x-3">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                                <p className="text-xs font-bold text-gray-600 truncate">{job.pickup}</p>
                                             </div>
                                             <div className="flex items-center space-x-3">
                                                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                                <p className="text-xs font-bold text-gray-600 truncate">{job.dropoff}</p>
                                             </div>
                                          </div>
                                       </div>

                                       <div className="flex flex-col justify-between items-end">
                                          <div className="text-right">
                                             <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Your Earnings</p>
                                             <p className="text-xl font-black text-gray-900">KES {(job.driverRate || Math.floor((job.price || 0) * 0.8)).toLocaleString()}</p>
                                          </div>

                                          {!isCompleted && (
                                             <button
                                                onClick={() => setCurrentView('JOBS')}
                                                className="mt-4 bg-brand-600 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-brand-200 hover:scale-105 active:scale-95 transition-all"
                                             >
                                                Resume Job
                                             </button>
                                          )}

                                          {isCompleted && (
                                             <div className="flex flex-col items-end gap-2 mt-4">
                                                <div className="flex items-center text-emerald-600 text-[10px] font-black uppercase tracking-widest bg-emerald-50 px-3 py-1.5 rounded-lg">
                                                   <CheckCircle className="w-3 h-3 mr-2" /> Completed
                                                </div>
                                                {!job.reviewForCustomer && (
                                                   <button
                                                      onClick={() => {
                                                         setReviewingOrder(job);
                                                         setReviewRating(5);
                                                         setReviewComment('');
                                                      }}
                                                      className="flex items-center text-brand-600 text-[10px] font-black uppercase tracking-widest bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg transition-colors"
                                                   >
                                                      <Star className="w-3 h-3 mr-2 fill-brand-600" /> Review Customer
                                                   </button>
                                                )}
                                             </div>
                                          )}
                                       </div>
                                    </div>

                                    <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-between">
                                       <div className="flex items-center space-x-4">
                                          <div className="flex items-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                             <Icon className="w-3.5 h-3.5 mr-1.5 text-brand-600" />
                                             {job.vehicle}
                                          </div>
                                          <div className="w-1 h-1 rounded-full bg-gray-200"></div>
                                          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                             {new Date(job.createdAt || job.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                             {job.updatedAt && job.updatedAt !== (job.createdAt || job.date) && (
                                                <span className="ml-2 text-brand-600">
                                                   (Edited: {new Date(job.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                                                </span>
                                             )}
                                          </div>
                                       </div>
                                       <div className="flex items-center space-x-2">
                                          <UserIcon className="w-3 h-3 text-brand-500" />
                                          <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">{job.sender.name}</span>
                                       </div>
                                    </div>
                                 </div>
                              );
                           })
                        )}
                     </div>
                  </div>
               )}

               {currentView === 'EARNINGS' && metrics && (
                  <div className="space-y-6 animate-in fade-in duration-500 pb-12 pointer-events-auto">
                     <div className="bg-brand-600 text-white rounded-3xl p-8 border border-brand-500 shadow-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-white/20 transition-all"></div>
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-end relative z-10">
                           <div>
                              <p className="text-white/60 font-bold uppercase tracking-widest text-[10px] mb-2">Available Balance</p>
                              <div className="flex items-baseline space-x-2">
                                 <span className="text-xl font-medium text-white/60">KES</span>
                                 <h2 className="text-5xl font-black text-white">{(metrics?.earnings.balance || 0).toLocaleString()}</h2>
                              </div>
                              <div className="mt-8 flex items-center space-x-6">
                                 <div>
                                    <p className="text-white/60 text-xs font-bold uppercase">This Week</p>
                                    <p className="text-lg font-bold text-white">KES {(metrics?.earnings.week || 0).toLocaleString()}</p>
                                 </div>
                                 <div className="h-8 w-px bg-white/20"></div>
                                 <div>
                                    <p className="text-white/60 text-xs font-bold uppercase">Month</p>
                                    <p className="text-lg font-bold text-white">KES {(metrics?.earnings.month || 0).toLocaleString()}</p>
                                 </div>
                              </div>
                           </div>
                           <div className="mt-8 md:mt-0 flex flex-col items-center md:items-end">
                              <button
                                 onClick={() => {
                                    if (metrics.earnings.balance < 500) {
                                       alert("Minimum withdrawal amount is KES 500");
                                       return;
                                    }
                                    alert("Withdrawal request sent to M-Pesa. You will receive funds within 24 hours.");
                                 }}
                                 className="bg-white text-brand-600 px-8 py-4 rounded-2xl font-black transition-all flex items-center shadow-lg hover:scale-105 active:scale-95"
                              >
                                 <DollarSign className="w-5 h-5 mr-3" /> Withdraw Funds
                              </button>
                              <p className="text-[10px] text-white/60 mt-3 font-bold uppercase tracking-tight">Manual withdrawal • Takes 1-24h</p>
                           </div>
                        </div>
                     </div>

                     {/* Weekly Activity Charts */}
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Earnings Bar Chart */}
                        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
                           <div className="flex justify-between items-center mb-6">
                              <h3 className="font-black text-gray-900 uppercase tracking-tight text-sm">Weekly Performance</h3>
                              <div className="text-[10px] font-bold text-gray-400 uppercase">Mon - Sun (KES)</div>
                           </div>
                           <div className="flex items-end justify-between h-32 px-2">
                              {metrics.weeklyChart.map((day, idx) => {
                                 const maxValue = Math.max(...metrics.weeklyChart.map(d => d.value), 500);
                                 const heightPercentage = Math.round((day.value / maxValue) * 100);
                                 return (
                                    <div key={idx} className="flex flex-col items-center flex-1 group gap-2">
                                       <div className="relative w-full flex justify-center items-end h-24">
                                          <div
                                             style={{ height: `${heightPercentage}%` }}
                                             className={`w-3/4 max-w-[20px] rounded-t-lg transition-all duration-500 ${day.value > 0 ? 'bg-brand-600' : 'bg-gray-100'} group-hover:bg-brand-700 shadow-sm`}
                                          ></div>
                                          {/* Tooltip */}
                                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[9px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none font-black">
                                             {day.amount}
                                          </div>
                                       </div>
                                       <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">{day.day}</span>
                                    </div>
                                 );
                              })}
                           </div>
                        </div>

                        {/* Trip Volume Line Chart (Trend) */}
                        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm overflow-hidden relative group">
                           <div className="flex justify-between items-center mb-6">
                              <h3 className="font-black text-gray-900 uppercase tracking-tight text-sm">Trip Volume Trend</h3>
                              <div className="text-[10px] font-bold text-gray-400 uppercase">Deliveries per Day</div>
                           </div>
                           <div className="relative h-32 px-2">
                              <svg className="w-full h-24 overflow-visible" viewBox="0 0 700 100" preserveAspectRatio="none">
                                 {/* Grid Lines */}
                                 <line x1="0" y1="20" x2="700" y2="20" stroke="#f3f4f6" strokeWidth="1" />
                                 <line x1="0" y1="50" x2="700" y2="50" stroke="#f3f4f6" strokeWidth="1" />
                                 <line x1="0" y1="80" x2="700" y2="80" stroke="#f3f4f6" strokeWidth="1" />

                                 {/* The Line */}
                                 {(() => {
                                    const maxTrips = Math.max(...metrics.weeklyChart.map(d => (d as any).trips || 0), 5);
                                    const points = metrics.weeklyChart.map((day, i) => {
                                       const x = (i * 100) + 50;
                                       const y = 100 - (((day as any).trips || 0) / maxTrips * 80);
                                       return `${x},${y}`;
                                    }).join(' ');

                                    return (
                                       <>
                                          {/* Area Under the Line */}
                                          <polyline
                                             points={`50,100 ${points} 650,100`}
                                             fill="url(#tripGradient)"
                                             className="opacity-20"
                                          />
                                          <defs>
                                             <linearGradient id="tripGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#3b82f6" />
                                                <stop offset="100%" stopColor="transparent" />
                                             </linearGradient>
                                          </defs>
                                          <polyline
                                             points={points}
                                             fill="none"
                                             stroke="#3b82f6"
                                             strokeWidth="4"
                                             strokeLinecap="round"
                                             strokeLinejoin="round"
                                             className="transition-all duration-1000"
                                          />
                                          {/* Data Points */}
                                          {metrics.weeklyChart.map((day, i) => {
                                             const x = (i * 100) + 50;
                                             const y = 100 - (((day as any).trips || 0) / maxTrips * 80);
                                             return (
                                                <circle
                                                   key={i}
                                                   cx={x}
                                                   cy={y}
                                                   r="5"
                                                   fill="#fff"
                                                   stroke="#3b82f6"
                                                   strokeWidth="3"
                                                   className="hover:r-7 transition-all cursor-pointer"
                                                />
                                             );
                                          })}
                                       </>
                                    );
                                 })()}
                              </svg>
                              <div className="flex justify-between mt-4 px-2">
                                 {metrics.weeklyChart.map((day, idx) => (
                                    <span key={idx} className="text-[10px] font-black text-gray-400 uppercase tracking-tighter w-[14.2%] text-center">{day.day}</span>
                                 ))}
                              </div>
                           </div>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-4">
                           <div className="flex justify-between items-center px-2">
                              <h3 className="font-black text-gray-900 uppercase tracking-tight">Recent Transactions</h3>
                              <button
                                 onClick={() => setCurrentView('DELIVERIES')}
                                 className="text-brand-600 text-xs font-bold hover:underline"
                              >
                                 View All Deliveries
                              </button>
                           </div>
                           <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50 overflow-hidden">
                              {myJobs.filter(j => j.status === 'delivered').length === 0 ? (
                                 <div className="p-12 text-center">
                                    <p className="text-gray-400">No transactions yet. Complete jobs to earn.</p>
                                 </div>
                              ) : (
                                 myJobs.filter(j => j.status === 'delivered').slice(0, 10).map((job) => (
                                    <div key={job.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                       <div className="flex items-center space-x-4">
                                          <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                                             <ArrowUpRight className="w-5 h-5" />
                                          </div>
                                          <div>
                                             <p className="font-bold text-gray-900 text-sm">{job.items.description}</p>
                                             <p className="text-[10px] text-gray-400 font-bold uppercase">
                                                {new Date(job.createdAt || job.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                                {job.updatedAt && job.updatedAt !== (job.createdAt || job.date) && (
                                                   <span className="ml-2 text-brand-600">
                                                      (Edited: {new Date(job.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                                                   </span>
                                                )}
                                                <span className="mx-2">•</span>
                                                {job.id}
                                             </p>
                                          </div>
                                       </div>
                                       <div className="text-right">
                                          <p className="font-black text-emerald-600">+ KES {(job.driverRate || Math.floor((job.price || 0) * 0.8)).toLocaleString()}</p>
                                          <p className="text-[10px] text-gray-400 font-bold uppercase">Settled</p>
                                       </div>
                                    </div>
                                 ))
                              )}
                           </div>
                        </div>

                        <div className="space-y-6">
                           <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                              <h3 className="font-black text-gray-900 uppercase tracking-tight text-sm mb-4">Earnings Tips</h3>
                              <div className="space-y-4">
                                 <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                                    <p className="text-blue-600 font-bold text-xs">Peak Hours (11 AM - 2 PM)</p>
                                    <p className="text-blue-500/70 text-[11px] mt-1">Accept jobs during lunch hours for 1.2x base pay multipliers.</p>
                                 </div>
                                 <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                                    <p className="text-amber-600 font-bold text-xs">Boda Boda Advantage</p>
                                    <p className="text-amber-500/70 text-[11px] mt-1">Small parcels reach destinations 20% faster in traffic.</p>
                                 </div>
                              </div>
                           </div>
                           <div className="bg-gradient-to-br from-brand-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg overflow-hidden relative">
                              <div className="absolute top-0 right-0 p-4 opacity-10">
                                 <Shield className="w-20 h-20" />
                              </div>
                              <h4 className="font-bold mb-2">Weekly Goal</h4>
                              {(() => {
                                 const weeklyTarget = 15000;
                                 const currentWeek = metrics?.earnings.week || 0;
                                 const percentage = Math.min(100, Math.round((currentWeek / weeklyTarget) * 100));
                                 return (
                                    <>
                                       <p className="text-xs text-white/80 mb-4">You're at {percentage}% of your KES {weeklyTarget.toLocaleString()} target!</p>
                                       <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                                          <div className="h-full bg-white transition-all duration-1000" style={{ width: `${percentage}%` }}></div>
                                       </div>
                                    </>
                                 );
                              })()}
                           </div>
                        </div>
                     </div>
                  </div>
               )}

               {currentView === 'MARKET' && (
                  // ... Existing Market code ...
                  <div className="space-y-6 animate-in fade-in duration-500 pointer-events-auto">
                     {/* ... Filter Logic same as before ... */}
                     <div className="flex flex-col space-y-4">
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                           {/* Search Bar */}
                           <div className="relative w-full">
                              <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                              <input
                                 type="text"
                                 placeholder="Search location or items..."
                                 value={searchQuery}
                                 onChange={(e) => setSearchQuery(e.target.value)}
                                 className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-brand-500 outline-none shadow-sm"
                              />
                           </div>
                        </div>
                     </div>
                     {/* ... Order List ... */}
                     {hasActiveJob && (
                        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-center text-amber-600 shadow-sm">
                           <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
                           <div>
                              <p className="font-bold text-sm">You have an active delivery</p>
                              <p className="text-xs text-amber-500/70">Complete your current job before accepting new requests.</p>
                           </div>
                           <button
                              onClick={() => setCurrentView('JOBS')}
                              className="ml-auto bg-amber-100 hover:bg-amber-200 text-amber-700 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors border border-amber-200"
                           >
                              Go to Job
                           </button>
                        </div>
                     )}
                     {/* ... Filtered List rendering ... */}
                     {filteredOrders.length === 0 ? (
                        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
                           <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                              <Search className="w-8 h-8 text-gray-300" />
                           </div>
                           <h3 className="font-bold text-gray-900 text-lg">No matching jobs found</h3>
                           <p className="text-gray-400 mt-2">Try searching for a different location or item description.</p>
                           <button
                              onClick={() => setSearchQuery('')}
                              className="mt-4 text-brand-600 font-bold text-sm hover:underline"
                           >
                              Clear Search
                           </button>
                        </div>
                     ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                           {filteredOrders.map(order => {
                              const Icon = getVehicleIcon(order.vehicle);
                              return (
                                 <div key={order.id} className={`bg-white rounded-xl p-5 border transition-all group shadow-sm ${hasActiveJob ? 'border-gray-100 opacity-50' : 'border-gray-100 hover:border-brand-200 hover:shadow-md'}`}>
                                    <div className="flex justify-between items-start mb-4">
                                       <div>
                                          <div className="flex items-center space-x-2 mb-1">
                                             <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-brand-50 text-brand-600 border border-brand-100">
                                                NEW
                                             </span>
                                             <button
                                                onClick={(e) => {
                                                   e.stopPropagation();
                                                   handleCopyId(order.id);
                                                }}
                                                className="flex items-center space-x-1 px-1.5 py-0.5 bg-gray-50 text-gray-400 rounded font-mono text-[10px] hover:text-brand-600 transition-colors"
                                                title="Copy Tracking ID"
                                             >
                                                <span>ID: {order.id}</span>
                                                {copiedId === order.id ? <Check className="w-2.5 h-2.5 text-emerald-500" /> : <Copy className="w-2.5 h-2.5 opacity-40" />}
                                             </button>
                                          </div>
                                          <h4 className="font-bold text-gray-900 line-clamp-1">{order.items.description}</h4>
                                       </div>
                                       <div className="text-right">
                                          <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Total Payout (You Earn)</p>
                                          <div className="font-bold text-xl text-brand-600">KES {(order.driverRate || Math.floor((order.price || 0) * 0.8)).toLocaleString()}</div>
                                          <div className="text-xs text-gray-400 mt-1">{order.estimatedDuration}</div>
                                       </div>
                                    </div>
                                    <div className="space-y-3 mb-5">
                                       <div className="flex items-start">
                                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 mr-2"></div>
                                          <div className="flex-1 min-w-0">
                                             <p className="text-xs text-gray-400 uppercase font-bold">Pickup</p>
                                             <button
                                                onClick={(e) => {
                                                   e.stopPropagation();
                                                   openGoogleMaps(order.pickup);
                                                }}
                                                className="text-sm text-gray-900 line-clamp-1 hover:text-brand-600 transition-colors text-left w-full"
                                             >
                                                {order.pickup}
                                             </button>
                                          </div>
                                       </div>
                                       <div className="flex items-start">
                                          <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 mr-2"></div>
                                          <div className="flex-1 min-w-0">
                                             <p className="text-xs text-gray-400 uppercase font-bold">Dropoff</p>
                                             <button
                                                onClick={(e) => {
                                                   e.stopPropagation();
                                                   openGoogleMaps(order.dropoff);
                                                }}
                                                className="text-sm text-gray-900 line-clamp-1 hover:text-brand-600 transition-colors text-left w-full"
                                             >
                                                {order.dropoff}
                                             </button>
                                          </div>
                                       </div>
                                       <div className="flex items-start">
                                          <Icon className="w-3.5 h-3.5 text-gray-400 mr-2 mt-0.5" />
                                          <span className="text-sm text-gray-600">{order.vehicle}</span>
                                       </div>
                                    </div>
                                    {(() => {
                                       const vehicleMismatch = user.vehicleType && order.vehicle !== user.vehicleType;
                                       const canAccept = !hasActiveJob && !vehicleMismatch;

                                       return (
                                          <button
                                             onClick={() => handleAcceptJob(order)}
                                             disabled={!canAccept}
                                             className={`w-full py-3 rounded-lg font-bold transition-all ${!canAccept
                                                ? 'bg-gray-50 text-gray-300 cursor-not-allowed border border-gray-100'
                                                : 'bg-brand-600 text-white hover:bg-brand-700 shadow-lg shadow-brand-100'
                                                }`}
                                          >
                                             {hasActiveJob
                                                ? 'Finish current job first'
                                                : vehicleMismatch
                                                   ? `Requires ${order.vehicle}`
                                                   : 'Accept Request'
                                             }
                                          </button>
                                       );
                                    })()}
                                 </div>
                              )
                           })}
                        </div>
                     )}
                  </div>
               )}

               {/* --- PROFILE VIEW --- */}
               {currentView === 'PROFILE' && metrics && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                     <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-10 bg-gradient-to-br from-brand-600 to-indigo-700 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-white/10 transition-all duration-700" />
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-brand-400/10 rounded-full -ml-24 -mb-24 blur-2xl" />

                        <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                           <div className="relative group/avatar">
                              <div className="w-32 h-32 rounded-[2.5rem] bg-indigo-50 border-4 border-white/30 overflow-hidden shadow-2xl transform group-hover/avatar:scale-105 transition-all duration-500">
                                 {user.photoURL ? (
                                    <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                                 ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-indigo-50">
                                       <UserIcon className="w-16 h-16 text-brand-300" />
                                    </div>
                                 )}
                              </div>
                           </div>
                           <div className="text-center md:text-left">
                              <h2 className="text-4xl font-black tracking-tight">{user.name || 'Professional Driver'}</h2>
                              <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-3">
                                 <span className="bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border border-white/10 flex items-center">
                                    <Shield className="w-3.5 h-3.5 mr-2" /> Verified Partner
                                 </span>
                                 <span className="bg-emerald-400 text-emerald-900 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest flex items-center">
                                    <div className="w-2 h-2 bg-emerald-900 rounded-full mr-2 animate-pulse" /> {metrics.status}
                                 </span>
                              </div>
                           </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 relative z-10 w-full md:w-auto">
                           <div className="bg-white/10 backdrop-blur-xl p-5 rounded-3xl border border-white/10 text-center hover:bg-white/20 transition-all">
                              <span className="block text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-1">Rating</span>
                              <span className="text-2xl font-black flex items-center justify-center gap-1.5">
                                 {metrics.performance.rating} <Star className="w-5 h-5 text-yellow-300 fill-yellow-300" />
                              </span>
                           </div>
                           <div className="bg-white/10 backdrop-blur-xl p-5 rounded-3xl border border-white/10 text-center hover:bg-white/20 transition-all">
                              <span className="block text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-1">Trips</span>
                              <span className="text-2xl font-black">{metrics.performance.tripsCompleted}</span>
                           </div>
                        </div>
                     </div>

                     <div className="space-y-6">
                        {/* Personal Details Card */}
                        <div className="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-sm">
                           <div className="p-8">
                              <div className="flex items-center justify-between mb-8">
                                 <h3 className="font-black text-slate-900 text-lg flex items-center gap-3">
                                    <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600">
                                       <UserIcon className="w-5 h-5" />
                                    </div>
                                    Profile Details
                                 </h3>
                                 <button
                                    onClick={() => setIsEditingProfile(!isEditingProfile)}
                                    className="px-5 py-2.5 bg-gray-50 text-gray-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 transition-all flex items-center gap-2"
                                 >
                                    {isEditingProfile ? 'Cancel Edit' : 'Modify Profile'}
                                 </button>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                 <div className="space-y-6">
                                    <div>
                                       <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 flex items-center">
                                          <Mail className="w-3.5 h-3.5 mr-2" /> Email Address
                                       </label>
                                       {isEditingProfile ? (
                                          <input
                                             value={profileForm.email}
                                             onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                                             className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-brand-500/20"
                                          />
                                       ) : (
                                          <p className="text-gray-900 font-bold ml-5.5 text-lg">{user.email}</p>
                                       )}
                                    </div>
                                    <div>
                                       <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 flex items-center">
                                          <Phone className="w-3.5 h-3.5 mr-2" /> Phone Number
                                       </label>
                                       {isEditingProfile ? (
                                          <input
                                             value={profileForm.phone}
                                             onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                                             className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-brand-500/20"
                                          />
                                       ) : (
                                          <p className="text-gray-900 font-bold ml-5.5 text-lg">{user.phone || 'N/A'}</p>
                                       )}
                                    </div>
                                 </div>

                                 <div className="space-y-6">
                                    <div>
                                       <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 flex items-center">
                                          <Truck className="w-3.5 h-3.5 mr-2" /> Vehicle Information
                                       </label>
                                       <div className="flex items-center gap-3">
                                          <div className="bg-yellow-50 text-yellow-700 font-black px-5 py-2.5 rounded-xl border-2 border-dashed border-yellow-200 inline-block uppercase tracking-widest text-sm shadow-sm">
                                             {user.plateNumber || 'TBD'}
                                          </div>
                                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">{user.vehicleType}</span>
                                       </div>
                                    </div>
                                    <div>
                                       <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 flex items-center">
                                          <Shield className="w-3.5 h-3.5 mr-2" /> Verification
                                       </label>
                                       <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 flex items-center justify-between">
                                          <div>
                                             <p className="text-xs font-black text-emerald-900 uppercase">Documents Verified</p>
                                             <p className="text-[10px] text-emerald-600/60 font-medium">Auto-renew in 184 days</p>
                                          </div>
                                          <ShieldCheck className="w-6 h-6 text-emerald-500" />
                                       </div>
                                    </div>
                                 </div>
                              </div>

                              {isEditingProfile && (
                                 <div className="mt-10 pt-8 border-t border-gray-50 flex justify-end">
                                    <button
                                       onClick={handleSaveProfile}
                                       className="px-10 py-4 bg-brand-600 text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-brand-200 hover:bg-brand-700 active:scale-95 transition-all flex items-center gap-3"
                                    >
                                       <Save className="w-4 h-4" /> Save Updated Profile
                                    </button>
                                 </div>
                              )}
                           </div>
                        </div>

                        {/* Professional Suite: Settings & Security */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                           <div className={`overflow-hidden border border-gray-50 rounded-[2.5rem] transition-all bg-white shadow-sm`}>
                              <div className="p-8">
                                 <div className="flex items-center gap-4 mb-6">
                                    <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 shadow-sm">
                                       <Bell className="w-5 h-5" />
                                    </div>
                                    <div>
                                       <h3 className="font-black text-slate-900">Notifications</h3>
                                       <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-0.5">Alert Preferences</p>
                                    </div>
                                 </div>

                                 <div className="space-y-3">
                                    {[
                                       { id: 'email', label: 'Invoices & Reports', icon: Mail },
                                       { id: 'sms', label: 'Real-time Job Alerts', icon: Smartphone },
                                       { id: 'push', label: 'Push App Notifications', icon: Navigation }
                                    ].map((notif) => (
                                       <div key={notif.id} className="flex items-center justify-between p-3.5 bg-gray-50 rounded-2xl border border-transparent hover:border-gray-100 transition-all">
                                          <div className="flex items-center gap-3">
                                             <notif.icon className="w-4 h-4 text-gray-400" />
                                             <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">{notif.label}</span>
                                          </div>
                                          <button
                                             onClick={() => setNotifications({ ...notifications, [notif.id]: !((notifications as any)[notif.id]) })}
                                             className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${(notifications as any)[notif.id] ? 'bg-emerald-500' : 'bg-gray-200'}`}
                                          >
                                             <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${(notifications as any)[notif.id] ? 'translate-x-[1.25rem]' : 'translate-x-[0.25rem]'}`} />
                                          </button>
                                       </div>
                                    ))}
                                 </div>
                              </div>
                           </div>

                           <div className={`overflow-hidden border border-gray-50 rounded-[2.5rem] transition-all ${expandedSection === 'SECURITY' ? 'ring-2 ring-brand-500/20 bg-[#FBFCFE]' : 'bg-white shadow-sm'}`}>
                              <button
                                 onClick={() => setExpandedSection(expandedSection === 'SECURITY' ? null : 'SECURITY')}
                                 className="w-full flex items-center justify-between p-8"
                              >
                                 <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm">
                                       <Lock className="w-5 h-5" />
                                    </div>
                                    <div className="text-left">
                                       <h3 className="font-black text-slate-900">Security</h3>
                                       <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-0.5">Two-Factor & Credentials</p>
                                    </div>
                                 </div>
                                 {expandedSection === 'SECURITY' ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                              </button>

                              {expandedSection === 'SECURITY' && (
                                 <div className="px-8 pb-8 space-y-6 animate-in slide-in-from-top-4 duration-300">
                                    <div className="space-y-4">
                                       <div className="p-5 bg-white rounded-2xl border border-gray-100 flex items-center justify-between group cursor-pointer hover:border-brand-200 transition-all">
                                          <div className="flex items-center gap-4">
                                             <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">
                                                <QrCode className="w-5 h-5" />
                                             </div>
                                             <div>
                                                <h4 className="font-bold text-slate-900 text-sm">Two-Factor Auth</h4>
                                                <p className="text-[10px] text-gray-400 font-medium">Protect your earnings wallet</p>
                                             </div>
                                          </div>
                                          <button
                                             onClick={handleToggle2FA}
                                             disabled={isUpdating2FA}
                                             className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${is2FAEnabled ? 'bg-emerald-500' : 'bg-gray-200'}`}
                                          >
                                             <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${is2FAEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                          </button>
                                       </div>

                                       <div className="p-5 bg-white rounded-2xl border border-gray-100 flex items-center justify-between group cursor-pointer hover:border-brand-200 transition-all" onClick={() => setShowPasswordFields(!showPasswordFields)}>
                                          <div className="flex items-center gap-4">
                                             <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                                                <Key className="w-5 h-5" />
                                             </div>
                                             <div>
                                                <h4 className="font-bold text-slate-900 text-sm">Authentication</h4>
                                                <p className="text-[10px] text-gray-400 font-medium">Reset driver credentials</p>
                                             </div>
                                          </div>
                                          <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-brand-500 transition-transform group-hover:translate-x-1" />
                                       </div>

                                       {showPasswordFields && (
                                          <div className="p-6 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-4 animate-in slide-in-from-top-2">
                                             <input
                                                type="password"
                                                placeholder="New Security Password"
                                                value={passwords.new}
                                                onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                                                className="w-full px-5 py-3 bg-white border border-gray-200 rounded-xl font-bold text-sm outline-none focus:border-brand-400"
                                             />
                                             <button
                                                onClick={handlePasswordUpdate}
                                                disabled={loading}
                                                className="w-full py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg"
                                             >
                                                {loading ? 'Processing...' : 'Update Password'}
                                             </button>
                                          </div>
                                       )}
                                    </div>
                                 </div>
                              )}
                           </div>
                        </div>

                        {/* Document Verification Display */}
                        <div className="bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-sm">
                           <h3 className="font-black text-slate-900 text-lg mb-8 flex items-center gap-3">
                              <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600">
                                 <FileCheck className="w-5 h-5" />
                              </div>
                              Uploaded Documentation
                           </h3>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              <div className="space-y-4">
                                 <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block ml-2">National Identity Card</label>
                                 <div className="relative aspect-[16/10] rounded-3xl overflow-hidden bg-gray-50 border-2 border-gray-100 group shadow-inner">
                                    {user.idImage ? (
                                       <img src={user.idImage} alt="ID" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                    ) : (
                                       <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                                          <FileText className="w-8 h-8 opacity-20 mb-2" />
                                          <span className="text-[10px] font-black uppercase tracking-tighter">Empty Slot</span>
                                       </div>
                                    )}
                                    <div className="absolute top-4 right-4 bg-emerald-500 text-white px-3 py-1 rounded-full text-[8px] font-black uppercase shadow-lg">Verified</div>
                                 </div>
                              </div>
                              <div className="space-y-4">
                                 <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block ml-2">Driving License</label>
                                 <div className="relative aspect-[16/10] rounded-3xl overflow-hidden bg-gray-50 border-2 border-gray-100 group shadow-inner">
                                    {user.licenseImage ? (
                                       <img src={user.licenseImage} alt="License" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                    ) : (
                                       <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                                          <FileText className="w-8 h-8 opacity-20 mb-2" />
                                          <span className="text-[10px] font-black uppercase tracking-tighter">Empty Slot</span>
                                       </div>
                                    )}
                                    <div className="absolute top-4 right-4 bg-emerald-500 text-white px-3 py-1 rounded-full text-[8px] font-black uppercase shadow-lg">Active</div>
                                 </div>
                              </div>
                           </div>
                        </div>

                        {/* Privacy & Erasure - VERY BOTTOM CABIZA */}
                        <div className="bg-red-50/20 rounded-[2.5rem] border border-red-100 p-8 shadow-sm flex flex-col justify-between">
                           <div className="flex items-center gap-4 mb-6">
                              <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 shadow-sm">
                                 <AlertTriangle className="w-5 h-5" />
                              </div>
                              <div>
                                 <h3 className="font-black text-slate-900">Privacy & Erasure</h3>
                                 <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-0.5">Account Status Control</p>
                              </div>
                           </div>

                           <div className="space-y-4">
                              <button
                                 onClick={handleDeactivateAccount}
                                 className="flex items-center justify-between w-full p-4 bg-white/50 rounded-2xl border border-red-50 hover:border-red-200 transition-all group"
                              >
                                 <div className="flex items-center gap-3">
                                    <Power className="w-4 h-4 text-gray-400 group-hover:text-red-500" />
                                    <span className="text-xs font-bold text-gray-600 group-hover:text-gray-900">Deactivate temporarily</span>
                                 </div>
                                 <ChevronRight className="w-4 h-4 text-gray-300" />
                              </button>

                              {showDeleteInput ? (
                                 <div className="space-y-3 animate-in zoom-in-95">
                                    <input
                                       value={deleteConfirmation}
                                       onChange={(e) => setDeleteConfirmation(e.target.value)}
                                       placeholder='Type "DELETE" to proceed'
                                       className="w-full px-4 py-3 bg-white border-2 border-red-100 rounded-xl font-black text-center text-red-600 outline-none uppercase text-xs"
                                    />
                                    <div className="grid grid-cols-2 gap-2">
                                       <button onClick={() => setShowDeleteInput(false)} className="py-2.5 bg-gray-100 text-gray-400 rounded-xl text-[10px] font-black uppercase">Cancel</button>
                                       <button disabled={deleteConfirmation !== 'DELETE'} onClick={handleDeleteAccount} className="py-2.5 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase disabled:opacity-50">Erase Everything</button>
                                    </div>
                                 </div>
                              ) : (
                                 <button
                                    onClick={() => setShowDeleteInput(true)}
                                    className="w-full py-4 bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-200"
                                 >
                                    Terminate Driver Account
                                 </button>
                              )}
                           </div>
                        </div>
                     </div>
                  </div>
               )}
            </div>

            {/* Delete Account Confirmation Modal */}
            {
               isDeleteModalOpen && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                     <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-8 text-center space-y-6">
                           <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mx-auto">
                              <AlertCircle className="w-10 h-10 text-red-600" />
                           </div>
                           <div>
                              <h3 className="text-2xl font-black text-gray-900">Delete Account?</h3>
                              <p className="text-gray-500 font-medium mt-2">
                                 This action is permanent. All your driver data, earnings history, and performance metrics will be permanently removed.
                              </p>
                           </div>
                           <div className="flex flex-col gap-3">
                              <button
                                 onClick={handleDeleteAccount}
                                 className="w-full bg-red-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-red-600/20 hover:bg-red-700 transition-all active:scale-95"
                              >
                                 Yes, Delete My Account
                              </button>
                              <button
                                 onClick={() => setIsDeleteModalOpen(false)}
                                 className="w-full bg-gray-100 text-gray-900 py-4 rounded-2xl font-black hover:bg-gray-200 transition-all active:scale-95"
                              >
                                 Cancel
                              </button>
                           </div>
                        </div>
                     </div>
                  </div>
               )
            }

            {/* Active Job Overlay (Map View) */}
            {currentView === 'JOBS' && (
               <div className="absolute inset-0 z-10 pointer-events-none">
                  {hasActiveJob ? (
                     <div className={`absolute bottom-8 left-4 right-4 md:left-auto md:right-8 md:w-96 bg-white/10 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/20 transition-all duration-300 pointer-events-auto ${isDrawerCollapsed ? 'p-4' : 'p-6'}`}>
                        <div className="flex items-center justify-between mb-4">
                           <div className="flex items-center space-x-2">
                              <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border shadow-sm ${activeJob.status === 'in_transit'
                                 ? 'bg-emerald-500 text-white border-emerald-400'
                                 : 'bg-brand-600 text-white border-brand-500'
                                 }`}>
                                 {activeJob.status === 'driver_assigned' ? 'Heading to Pickup' : 'Delivering'}
                              </span>
                              {routeDuration !== null && (
                                 <span className="bg-emerald-500 text-white text-sm font-black px-3 py-1.5 rounded-xl flex items-center shadow-lg border border-emerald-400 animate-pulse">
                                    <Clock className="w-4 h-4 mr-1.5" /> {routeDuration} MINS
                                 </span>
                              )}
                              {routeDistance !== null && (
                                 <span className="bg-brand-600 text-white text-sm font-black px-3 py-1.5 rounded-xl flex items-center shadow-lg border border-brand-500">
                                    <Navigation className="w-4 h-4 mr-1.5" /> {routeDistance} KM
                                 </span>
                              )}
                           </div>
                           <button
                              onClick={() => setIsDrawerCollapsed(!isDrawerCollapsed)}
                              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                           >
                              {isDrawerCollapsed ? <ChevronUp className="w-5 h-5 text-gray-600" /> : <ChevronDown className="w-5 h-5 text-gray-600" />}
                           </button>
                        </div>

                        {!isDrawerCollapsed ? (
                           <>
                              <div className="grid grid-cols-2 gap-3 mb-4">
                                 <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Distance & Time</p>
                                    <p className="text-sm font-bold text-gray-900">
                                       {(activeJob.remainingDistance ? (activeJob.remainingDistance / 1000) : 0).toLocaleString(undefined, { maximumFractionDigits: 1 })} km • {Math.ceil((activeJob.remainingDistance || 0) / 1000 * 2)} mins
                                    </p>
                                 </div>
                                 <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-100">
                                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Your Earnings</p>
                                    <p className="text-sm font-black text-emerald-700">
                                       KES {activeJob.total?.toLocaleString()}
                                    </p>
                                 </div>
                              </div>

                              <div className="space-y-6 relative max-h-80 overflow-y-auto pr-2 no-scrollbar py-2">
                                 {/* Connecting Line */}
                                 <div className="absolute left-[11px] top-4 bottom-4 w-0.5 bg-gray-100"></div>

                                 {allStops.map((stop, idx) => (
                                    <div key={stop.id} className="relative flex items-start space-x-4 group z-10">
                                       <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-300 shadow-sm ${stop.status === 'completed'
                                          ? 'bg-emerald-500 border-emerald-500'
                                          : stop.id === nextStop?.id
                                             ? 'bg-white border-brand-500 ring-4 ring-brand-500/10'
                                             : 'bg-white border-gray-200'
                                          }`}>
                                          {stop.status === 'completed' ? (
                                             <CheckCircle className="w-3.5 h-3.5 text-white" />
                                          ) : (
                                             <div className={`w-2 h-2 rounded-full ${stop.id === nextStop?.id ? 'bg-brand-500 animate-pulse' : 'bg-gray-300'}`}></div>
                                          )}
                                       </div>
                                       <div className={`flex-1 min-w-0 ${stop.status === 'completed' ? 'opacity-40' : ''}`}>
                                          <div className="flex items-center justify-between mb-0.5">
                                             <p className={`text-[9px] font-black uppercase tracking-widest ${stop.status === 'completed' ? 'text-emerald-600' : 'text-gray-400'}`}>
                                                {stop.label}
                                             </p>
                                             {stop.id === nextStop?.id && (
                                                <span className="text-[8px] font-black bg-brand-600 text-white px-2 py-0.5 rounded-full uppercase flex items-center shadow-sm">
                                                   <Navigation className="w-2 h-2 mr-1" /> Active
                                                </span>
                                             )}
                                          </div>
                                          <p className="text-xs font-bold text-gray-900 line-clamp-2 leading-tight">
                                             {stop.address}
                                          </p>
                                       </div>
                                    </div>
                                 ))}
                              </div>

                              <div className="mt-6 grid grid-cols-2 gap-3">
                                 {/* Multi-stop Aware Contextual Buttons */}
                                 {nextStop?.id === 'pickup-start' && (
                                    <button
                                       onClick={() => handleStartDelivery(activeJob)}
                                       className="col-span-2 w-full bg-brand-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-brand-700 transition-all shadow-xl shadow-brand-500/20 flex items-center justify-center space-x-3"
                                    >
                                       <Package className="w-5 h-5" />
                                       <span>Start Delivery (At Pickup)</span>
                                    </button>
                                 )}

                                 {nextStop && nextStop.id !== 'pickup-start' && nextStop.id !== 'dropoff-end' && (
                                    <button
                                       onClick={() => handleUpdateStopStatus(activeJob.id, nextStop.id, 'completed')}
                                       className="col-span-2 w-full bg-brand-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-brand-700 transition-all shadow-xl shadow-brand-500/20 flex items-center justify-center space-x-3"
                                    >
                                       <CheckCircle className="w-5 h-5" />
                                       <span>Complete Waystop</span>
                                    </button>
                                 )}

                                 {nextStop?.id === 'dropoff-end' && (
                                    <button
                                       onClick={() => handleUpdateStatus(activeJob.id, 'delivered')}
                                       className="col-span-2 w-full bg-emerald-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center space-x-3"
                                    >
                                       <CheckCircle className="w-5 h-5" />
                                       <span>Final Delivery Complete</span>
                                    </button>
                                 )}
                                 <button className="flex items-center justify-center py-3 bg-gray-100 text-gray-900 rounded-xl font-bold hover:bg-gray-200 border border-gray-200">
                                    <Phone className="w-4 h-4 mr-2" /> Call
                                 </button>
                                 <button className="flex items-center justify-center py-3 bg-gray-100 text-gray-900 rounded-xl font-bold hover:bg-gray-200 border border-gray-200">
                                    <MessageSquare className="w-4 h-4 mr-2" /> Chat
                                 </button>
                              </div>
                           </>
                        ) : (
                           <div className="flex items-center justify-between animate-in fade-in slide-in-from-bottom-2">
                              <div className="flex flex-col min-w-0">
                                 <p className="text-sm font-bold text-gray-900 line-clamp-1 max-w-[150px]">{activeJob.items.description}</p>
                                 <div className="flex items-center space-x-2 mt-0.5">
                                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                                       Earn: KES {(activeJob.driverRate || Math.floor((activeJob.price || 0) * 0.8)).toLocaleString()}
                                    </span>
                                    <span className="text-[10px] font-bold text-gray-400">
                                       {(activeJob.remainingDistance ? (activeJob.remainingDistance / 1000) : 0).toLocaleString(undefined, { maximumFractionDigits: 1 })} km
                                    </span>
                                 </div>
                              </div>
                              <div className="flex space-x-2">
                                 <button className="p-2 bg-gray-100 rounded-full text-gray-900 hover:bg-gray-200">
                                    <Phone className="w-4 h-4" />
                                 </button>
                                 <button className="p-2 bg-gray-100 rounded-full text-gray-900 hover:bg-gray-200">
                                    <Navigation className="w-4 h-4" />
                                 </button>
                              </div>
                           </div>
                        )}
                     </div>
                  ) : (
                     <div className="p-8 pointer-events-auto">
                        <div className="bg-white/10 backdrop-blur-2xl rounded-2xl p-12 text-center border border-white/20 shadow-sm max-w-md mx-auto">
                           <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                              <Package className="w-8 h-8 text-gray-400" />
                           </div>
                           <h3 className="font-bold text-gray-900 text-lg">No Active Jobs</h3>
                           <p className="text-gray-500 mt-2">Go to the Marketplace to find new delivery requests.</p>
                           <button
                              onClick={() => setCurrentView('MARKET')}
                              className="mt-6 px-6 py-3 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 transition-colors"
                           >
                              Browse Marketplace
                           </button>
                        </div>
                     </div>
                  )}
               </div>
            )}
         </main>

         {/* Verification Modal */}
         {verifyingOrder && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
               <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={closeVerificationModal}></div>
               <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100">
                  <div className="bg-brand-50 p-8 text-gray-900 text-center border-b border-gray-100">
                     <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-brand-200">
                        <Shield className="w-8 h-8 text-brand-600" />
                     </div>
                     <h3 className="text-xl font-bold">Verify {verifyingStopId ? 'Stop' : 'Delivery'}</h3>
                     <p className="text-gray-500 text-sm mt-2">
                        {verifyingStopId
                           ? `Enter the 4-digit passcode for ${allStops.find(s => s.id === verifyingStopId)?.address.split(',')[0] || 'this stop'}.`
                           : 'Enter the 4-digit passcode from the recipient to complete this delivery.'}
                     </p>
                  </div>
                  <div className="p-8">
                     <div className="flex flex-col items-center">
                        <input
                           type="text"
                           maxLength={4}
                           placeholder="0000"
                           value={verificationInput}
                           onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, '');
                              setVerificationInput(val);
                              setVerificationError('');
                           }}
                           className="text-center text-4xl font-extrabold tracking-[1rem] w-full py-4 border-2 border-gray-100 bg-gray-50 rounded-2xl focus:border-brand-500 focus:ring-0 outline-none transition-all tabular-nums text-gray-900 placeholder:text-gray-200"
                           autoFocus
                        />

                        {/* Delivery Photo Upload */}
                        <div className="w-full mt-6">
                           <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 text-center">Proof of Delivery (Photo)</label>
                           <div
                              onClick={() => document.getElementById('delivery-photo-upload')?.click()}
                              className={`w-full h-40 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden ${deliveryConfirmationImage ? 'border-emerald-500 bg-emerald-500/10' : 'border-gray-100 bg-gray-50 hover:border-brand-500/50'}`}
                           >
                              {deliveryConfirmationImage ? (
                                 <img src={deliveryConfirmationImage} alt="Delivery Proof" className="w-full h-full object-cover" />
                              ) : (
                                 <>
                                    <Truck className="w-8 h-8 text-gray-200 mb-2" />
                                    <span className="text-sm font-bold text-gray-400">Tap to take/upload photo</span>
                                 </>
                              )}
                           </div>
                           <input
                              id="delivery-photo-upload"
                              type="file"
                              accept="image/*"
                              capture="environment"
                              className="hidden"
                              onChange={(e) => {
                                 const file = e.target.files?.[0];
                                 if (file) {
                                    setDeliveryConfirmationFile(file);
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                       setDeliveryConfirmationImage(reader.result as string);
                                       setVerificationError('');
                                    };
                                    reader.readAsDataURL(file);
                                 }
                              }}
                           />
                        </div>

                        {verificationError && (
                           <p className="text-red-500 text-xs font-bold mt-4 flex items-center">
                              <AlertCircle className="w-3 h-3 mr-1" /> {verificationError}
                           </p>
                        )}
                     </div>

                     <div className="grid grid-cols-2 gap-3 mt-8">
                        <button
                           onClick={closeVerificationModal}
                           className="py-3 px-4 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-colors border border-gray-200"
                        >
                           Cancel
                        </button>
                        <button
                           onClick={handleVerifyAndComplete}
                           disabled={verificationInput.length !== 4 || loading}
                           className="py-3 px-4 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-brand-600/20"
                        >
                           {loading ? 'Verifying...' : 'Verify & Finish'}
                        </button>
                     </div>
                  </div>
               </div>
            </div>
         )}

         {/* Review Modal */}
         {reviewingOrder && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
               <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={() => setReviewingOrder(null)}></div>
               <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100">
                  <div className="bg-brand-50 p-8 text-gray-900 text-center border-b border-gray-100">
                     <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-brand-200">
                        <Star className="w-8 h-8 text-brand-600 fill-current" />
                     </div>
                     <h3 className="text-xl font-bold">Rate the Customer</h3>
                     <p className="text-gray-500 text-sm mt-2">How was your experience with {reviewingOrder.sender.name}?</p>
                  </div>
                  <div className="p-8">
                     <div className="flex flex-col items-center">
                        <div className="flex space-x-2 mb-6">
                           {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                 key={star}
                                 onClick={() => setReviewRating(star)}
                                 className="transition-transform active:scale-90"
                              >
                                 <Star
                                    className={`w-10 h-10 ${star <= reviewRating ? 'text-yellow-400 fill-current' : 'text-gray-200'}`}
                                 />
                              </button>
                           ))}
                        </div>

                        <div className="flex flex-wrap justify-center gap-2 mb-6">
                           {customerTags.map(tag => (
                              <button
                                 key={tag}
                                 onClick={() => {
                                    setSelectedTags(prev =>
                                       prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                                    );
                                 }}
                                 className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${selectedTags.includes(tag)
                                    ? 'bg-brand-600 text-white border-brand-600 shadow-md'
                                    : 'bg-white text-gray-500 border-gray-200 hover:border-brand-300'
                                    }`}
                              >
                                 {tag}
                              </button>
                           ))}
                        </div>

                        <textarea
                           placeholder="Add a comment (optional)..."
                           value={reviewComment}
                           onChange={(e) => setReviewComment(e.target.value)}
                           className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-brand-500 outline-none min-h-[100px] text-sm text-gray-900 placeholder:text-gray-300"
                        />
                     </div>

                     <div className="grid grid-cols-2 gap-3 mt-8">
                        <button
                           onClick={() => setReviewingOrder(null)}
                           className="py-3 px-4 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-colors border border-gray-200"
                        >
                           Skip
                        </button>
                        <button
                           onClick={handleReviewSubmit}
                           disabled={loading}
                           className="py-3 px-4 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 disabled:opacity-50 transition-all shadow-lg shadow-brand-600/20"
                        >
                           {loading ? 'Submitting...' : 'Submit Review'}
                        </button>
                     </div>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
};

const DriverDashboard: React.FC<DriverDashboardProps> = (props) => {
   return (
      <DriverDashboardContent {...props} />
   );
};

export default DriverDashboard;
