import React, { useEffect, useState, useRef, useCallback } from 'react';
import type { DeliveryOrder, Driver, RouteStop } from '../types';
import { ChevronUp, ArrowLeft, ArrowRight, Share2, ShieldAlert, Copy, Check, Phone, X, Loader2, MapPin, Pencil, Trash2, ChevronDown, Camera, ShieldCheck, AlertTriangle, Plus, Users } from 'lucide-react';
import { useMapState } from '@/context/MapContext';
import { DriverCard } from './tracking/DriverCard';
import { PostDelivery } from './tracking/PostDelivery';
import { motion, AnimatePresence } from 'framer-motion';
import { mapService } from '@/services/mapService';
import { VEHICLES } from './booking/constants';
import { useChat } from '../context/ChatContext';
import { httpsCallable } from 'firebase/functions';

interface TrackingProps {
  order: DeliveryOrder;
  onUpdateStatus: (orderId: string, status: DeliveryOrder['status'], driverDetails?: Driver) => void;
  onUpdateOrder: (orderId: string, updates: Partial<DeliveryOrder>) => void;
  onBack: () => void;
}

const Tracking: React.FC<TrackingProps> = ({ order, onUpdateStatus, onUpdateOrder, onBack }) => {
  const { pickupCoords, dropoffCoords, fitBounds, setPickupCoords, setDropoffCoords, setWaypointCoords, setRoutePolyline, setMapCenter, waypointCoords, setBottomSheetHeight } = useMapState();
  const bottomSheetRef = useRef<HTMLDivElement>(null);
  const { setIsOpen: openKifaru } = useChat();

  const [isCollapsed, setIsCollapsed] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [editField, setEditField] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [routeExpanded, setRouteExpanded] = useState(false);
  const [editMenuOpen, setEditMenuOpen] = useState(false);

  // ── Location edit state ────────────────────────────────
  const [editingStopId, setEditingStopId] = useState<string | null>(null);
  const [addressQuery, setAddressQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Array<{ label: string; lat: number; lng: number }>>([]);
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const addressInputRef = useRef<HTMLInputElement>(null);
  const suggestionsTimer = useRef<ReturnType<typeof setTimeout>>();

  // ── Receiver edit state ────────────────────────────────
  const [editReceiverName, setEditReceiverName] = useState('');
  const [editReceiverPhone, setEditReceiverPhone] = useState('');
  const [editReceiverId, setEditReceiverId] = useState('');

  // ── Package edit state ─────────────────────────────────
  const [editCategory, setEditCategory] = useState<'A' | 'B'>('A');
  const [editSubCategory, setEditSubCategory] = useState('');
  const [editFragile, setEditFragile] = useState(false);
  const [editValue, setEditValue] = useState(0);
  const [editImage, setEditImage] = useState<string | undefined>(undefined);
  const [editDimensions, setEditDimensions] = useState({ length: '', width: '', height: '', weight: '' });
  const [editHandlingNotes, setEditHandlingNotes] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Add stop state ─────────────────────────────────────
  const [addingStop, setAddingStop] = useState(false);
  const [optimizingRoute, setOptimizingRoute] = useState(false);

  // ── Vehicle edit state ─────────────────────────────────
  const [editVehicle, setEditVehicle] = useState('');
  const [editServiceType, setEditServiceType] = useState('');
  const [editHelpersCount, setEditHelpersCount] = useState(0);

  // ── Price change state ─────────────────────────────────
  const [priceChange, setPriceChange] = useState<{ oldPrice: number; newPrice: number; newEta: string } | null>(null);
  const [requoting, setRequoting] = useState(false);
  const [payingDifference, setPayingDifference] = useState(false);
  const [paymentSettled, setPaymentSettled] = useState(false);

  // ── Pending route changes (held until payment is confirmed) ──
  const [pendingRouteUpdate, setPendingRouteUpdate] = useState<any | null>(null);

  // ── Bottom sheet height reporting (map refit) ─────
  useEffect(() => {
    if (!bottomSheetRef.current || !setBottomSheetHeight) return;
    const observer = new ResizeObserver((entries) => {
      const height = entries[0]?.borderBoxSize?.[0]?.blockSize ?? entries[0]?.contentRect.height;
      if (height) setBottomSheetHeight(height + 10);
    });
    observer.observe(bottomSheetRef.current);
    return () => observer.disconnect();
  }, [isCollapsed, setBottomSheetHeight]);

  const SUBCATEGORIES = {
    A: [
      { id: 'Document', label: 'Document', desc: 'Max 0.5kg', examples: 'e.g. passports, keys, envelopes', img: '/icons3d/page_facing_up.png' },
      { id: 'Small Box', label: 'Small Box', desc: 'Max 2kg', examples: 'e.g. phones, clothes, books', img: '/icons3d/package.png' },
      { id: 'Medium Box', label: 'Medium Box', desc: 'Max 5kg', examples: 'e.g. shoes, laptops, toasters', img: '/icons3d/package.png' },
      { id: 'Large Box', label: 'Large Box', desc: 'Max 15kg', examples: 'e.g. microwaves, desktop pcs', img: '/icons3d/package.png' },
      { id: 'Jumbo Box', label: 'Jumbo Box', desc: 'Max 30kg', examples: 'e.g. mini-fridges, seating', img: '/icons3d/package.png' },
      { id: 'Custom Dimensions', label: 'Custom', desc: 'Custom', examples: 'enter sizes below', img: '/icons3d/triangular_ruler.png' },
    ],
    B: [
      { id: 'TVs', label: 'TVs (All Sizes)', desc: 'Secure transit', img: '/icons3d/television.png' },
      { id: 'Fridges & Freezers', label: 'Fridges & Freezers', desc: 'Upright handling', img: '/icons3d/ice.png' },
      { id: 'Washing Machines', label: 'Washing Machines', desc: 'Heavy appliances', img: '/icons3d/gear.png' },
      { id: 'Sofas & Seats', label: 'Sofas & Seats', desc: 'Furniture delivery', img: '/icons3d/couch_and_lamp.png' },
      { id: 'Beds & Mattresses', label: 'Beds & Mattresses', desc: 'Bedroom furniture', img: '/icons3d/bed.png' },
      { id: 'Hardware', label: 'Hardware/Construction', desc: 'Raw materials', img: '/icons3d/hammer.png' },
      { id: 'Agricultural Sacks', label: '90kg Ag Sacks', desc: 'Cereals & Produce', img: '/icons3d/sheaf_of_rice.png' },
      { id: 'LPG & Gas', label: 'LPG / Gas (Bulk)', desc: 'Tanker transport', img: '/icons3d/fuel_pump.png' },
      { id: 'Petroleum & Oil', label: 'Petroleum / Oil', desc: 'Liquid bulk', img: '/icons3d/oil_drum.png' },
      { id: 'Loose Aggregate', label: 'Loose Aggregate', desc: 'Sand, gravel, ballast', img: '/icons3d/rock.png' },
    ],
  };

  const isPending = order.status === 'pending';
  const isAssigned = order.status === 'driver_assigned';
  const isInTransit = order.status === 'in_transit';
  const isDelivered = order.status === 'delivered';

  // ── Editability logic ──────────────────────────────────
  // A stop is editable if the driver hasn't started delivery to it
  const canEditStop = (stop: RouteStop): boolean => {
    if (isPending) return true;
    if (isDelivered || order.status === 'cancelled' || order.status === 'expired') return false;
    // After driver assigned: only stops still pending (minor changes auto-apply, major need driver consent)
    return stop.status === 'pending';
  };

  const canEditPickup = (): boolean => {
    return isPending; // pickup only editable before driver assigned
  };

  const canEditDropoff = (): boolean => {
    if (isPending) return true;
    if (isDelivered || order.status === 'cancelled' || order.status === 'expired') return false;
    if (order.status === 'driver_assigned' || order.status === 'arriving_pickup') return true; // needs driver consent if >1km change
    if (isInTransit) {
      // In transit: only if dropoff stop is still pending AND distance change < 1km (auto-apply)
      const dropoffStop = order.stops?.find(s => s.type === 'dropoff');
      return !dropoffStop || dropoffStop.status === 'pending';
    }
    return false;
  };

  const canEditField = (field: string) => {
    if (isPending) return true;
    if (order.status === 'cancelled' || order.status === 'expired') return false;
    // After driver assigned: receiver details always editable (no price impact)
    if ((order.status === 'driver_assigned' || order.status === 'arriving_pickup') && field === 'receiver') return true;
    // Item details editable before pickup (requires requote)
    if ((order.status === 'driver_assigned' || order.status === 'arriving_pickup') && field === 'items') return true;
    // Vehicle/service locked once driver is assigned
    if (field === 'vehicle') return isPending;
    // In transit: receiver still editable (phone might change)
    if (isInTransit && field === 'receiver') return true;
    return false;
  };

  const canRemoveStop = (stop: RouteStop): boolean => {
    if (stop.type === 'dropoff') return false; // can't remove final dropoff
    return canEditStop(stop);
  };

  const canAddStop = (): boolean => {
    if (isDelivered) return false;
    const totalStops = (order.stops || []).length;
    return totalStops < 5 && (isPending || isAssigned);
  };

  const getStatusText = () => {
    if (isPending) return 'Finding your driver...';
    if (isAssigned) return 'Driver en route to pickup';
    if (isInTransit) return 'Package in transit';
    return 'Processing';
  };

  const getStatusColor = () => {
    if (isPending) return 'bg-amber-500';
    if (isAssigned) return 'bg-blue-500';
    if (isInTransit) return 'bg-brand-600';
    return 'bg-gray-400';
  };

  const etaMinutes = order.remainingDuration ? Math.ceil(order.remainingDuration / 60) : null;

  // ── Journey step info for header ───────────────────────
  const getJourneyStep = () => {
    if (isPending) return { label: 'Order Placed', sublabel: 'Finding your driver...', gradient: 'from-amber-500 to-amber-600', textColor: 'text-amber-100', dotColor: 'bg-white', step: 1 };
    if (isAssigned) return { label: 'Driver En Route', sublabel: `Heading to ${order.pickup.split(',')[0]}`, gradient: 'from-blue-500 to-blue-600', textColor: 'text-blue-100', dotColor: 'bg-white', step: 2 };
    if (isInTransit) return { label: 'In Transit', sublabel: `To ${order.dropoff.split(',')[0]}`, gradient: 'from-brand-600 to-emerald-600', textColor: 'text-emerald-100', dotColor: 'bg-white', step: 4 };
    return { label: 'Processing', sublabel: '', gradient: 'from-gray-500 to-gray-600', textColor: 'text-gray-200', dotColor: 'bg-white', step: 0 };
  };
  const journeyStep = getJourneyStep();

  // ── Stop editing handlers ──────────────────────────────
  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 3) { setSuggestions([]); return; }
    clearTimeout(suggestionsTimer.current);
    suggestionsTimer.current = setTimeout(async () => {
      try {
        const results = await mapService.getSuggestions(query);
        setSuggestions(results);
      } catch { setSuggestions([]); }
    }, 300);
  }, []);

  const handleAddressQueryChange = (val: string) => {
    setAddressQuery(val);
    setSelectedCoords(null);
    fetchSuggestions(val);
  };

  const handleSuggestionSelect = async (sug: { label: string; lat: number; lng: number }) => {
    setAddressQuery(sug.label);
    setSuggestions([]);
    // Geocode to get precise coords
    const resolved = await mapService.geocodeAddress(sug.label);
    setSelectedCoords(resolved ? { lat: resolved.lat, lng: resolved.lng } : { lat: sug.lat, lng: sug.lng });
  };

  // ── Inline location editing ────────────────────────────
  const isLocationEditing = editField === 'pickup' || editField === 'dropoff' || editField === 'stop' || editField === 'addStop';

  const openLocationEdit = (type: 'pickup' | 'dropoff' | 'stop', stopId?: string) => {
    if (type === 'pickup') {
      if (!canEditPickup()) return;
      setAddressQuery(order.pickup);
    } else if (type === 'dropoff') {
      if (!canEditDropoff()) return;
      setAddressQuery(order.dropoff);
    } else if (type === 'stop' && stopId) {
      const stop = order.stops?.find(s => s.id === stopId);
      if (!stop || !canEditStop(stop)) return;
      setEditingStopId(stopId);
      setAddressQuery(stop.address);
    }
    setSelectedCoords(null);
    setSuggestions([]);
    setEditField(type === 'stop' ? 'stop' : type);
    setRouteExpanded(true);
    setTimeout(() => addressInputRef.current?.focus(), 150);
  };

  const handleRemoveStop = async (stopId: string) => {
    const stop = order.stops?.find(s => s.id === stopId);
    if (!stop || !canRemoveStop(stop)) return;
    if (!confirm(`Remove stop "${stop.address.split(',')[0]}"?`)) return;

    setSaving(true);
    try {
      const updatedStops = (order.stops || [])
        .filter(s => s.id !== stopId)
        .map((s, idx) => ({ ...s, sequenceOrder: idx + 1 }));
      await onUpdateOrder(order.id, { stops: updatedStops } as any);
      // Refresh map immediately
      refreshMapAfterEdit(order.pickupCoords || null, order.dropoffCoords || null, updatedStops);
      // Auto-optimize after removal
      optimizeCurrentRoute(updatedStops);
      // Requote with fewer stops
      requoteAfterEdit({ stops: updatedStops });
    } catch (e) {
      console.error('Failed to remove stop:', e);
    }
    setSaving(false);
  };

  // ── Refresh map markers & route after location edits ───
  const refreshMapAfterEdit = async (
    pCoords: { lat: number; lng: number } | null,
    dCoords: { lat: number; lng: number } | null,
    stops: RouteStop[]
  ) => {
    try {
      if (pCoords) setPickupCoords(pCoords);
      if (dCoords) setDropoffCoords(dCoords);
      const wpCoords = stops.map(s => ({ lat: s.lat, lng: s.lng }));
      setWaypointCoords(wpCoords.length > 0 ? wpCoords : []);

      // Recalculate route
      if (pCoords && dCoords) {
        const waypoints = stops
          .filter(s => s.type !== 'dropoff')
          .sort((a, b) => (a.sequenceOrder || 0) - (b.sequenceOrder || 0))
          .map(s => ({ lat: s.lat, lng: s.lng }));
        const route = await mapService.getRoute(pCoords, dCoords, waypoints, order.vehicle, false);
        if (route) setRoutePolyline(route.geometry);
        fitBounds([pCoords, dCoords, ...wpCoords]);
      }
    } catch (e) {
      console.error('Failed to refresh map:', e);
    }
  };

  const saveLocationEdit = async () => {
    if (!addressQuery.trim()) return;
    setSaving(true);
    try {
      let coords = selectedCoords;
      if (!coords) {
        const resolved = await mapService.geocodeAddress(addressQuery.trim());
        coords = resolved ? { lat: resolved.lat, lng: resolved.lng } : null;
      }

      // Truncate address to 20 chars for display
      const shortAddress = addressQuery.trim().length > 20
        ? addressQuery.trim().substring(0, 20) + '…'
        : addressQuery.trim();

      // Build the pending update object WITHOUT saving to Firestore yet.
      // The map preview is updated immediately so the user sees the new route,
      // but the order (and driver) won't see changes until payment is confirmed.
      let pendingUpdate: any = {};
      let requoteOverrides: any = {};

      if (editField === 'pickup') {
        pendingUpdate = { pickup: shortAddress };
        if (coords) pendingUpdate.pickupCoords = coords;
        const newPickup = coords || order.pickupCoords;
        requoteOverrides = { pickupCoords: newPickup || undefined };
        // Refresh map preview immediately (visual only, not saved to Firestore)
        if (newPickup) refreshMapAfterEdit(newPickup, order.dropoffCoords || null, order.stops || []);
      } else if (editField === 'dropoff') {
        pendingUpdate = { dropoff: shortAddress };
        if (coords) pendingUpdate.dropoffCoords = coords;
        const dropoffStop = order.stops?.find(s => s.type === 'dropoff');
        const updatedStops = dropoffStop
          ? (order.stops || []).map(s =>
            s.type === 'dropoff' ? { ...s, address: shortAddress, ...(coords ? { lat: coords.lat, lng: coords.lng } : {}) } : s
          )
          : order.stops || [];
        if (dropoffStop) pendingUpdate.stops = updatedStops;
        const newDropoff = coords || order.dropoffCoords;
        requoteOverrides = { dropoffCoords: newDropoff || undefined, stops: updatedStops };
        if (newDropoff) refreshMapAfterEdit(order.pickupCoords || null, newDropoff, updatedStops);
      } else if (editField === 'stop' && editingStopId) {
        const updatedStops = (order.stops || []).map(s =>
          s.id === editingStopId ? { ...s, address: shortAddress, ...(coords ? { lat: coords.lat, lng: coords.lng } : {}) } : s
        );
        pendingUpdate = { stops: updatedStops };
        requoteOverrides = { stops: updatedStops };
        refreshMapAfterEdit(order.pickupCoords || null, order.dropoffCoords || null, updatedStops);
      } else if (editField === 'addStop') {
        // Adding a stop — handled by saveNewStop, not here
        return;
      }

      // Requote to get the new price (this also shows the price change banner)
      // The requote will set priceChange state. If the price increased,
      // the pending update is held until payment. If same or decreased, commit now.
      setPendingRouteUpdate(pendingUpdate);
      await requoteAfterEdit(requoteOverrides, pendingUpdate);
    } catch (e) {
      console.error('Failed to update location:', e);
    }
    setSaving(false);
    closeEdit();
  };

  // ── Package editing ────────────────────────────────────
  const openPackageEdit = () => {
    if (!canEditField('items')) return;
    const desc = order.items?.itemDesc || '';
    const isBulky = SUBCATEGORIES.B.some(s => desc.includes(s.id));
    setEditCategory(isBulky ? 'B' : 'A');
    const allSubs = [...SUBCATEGORIES.A, ...SUBCATEGORIES.B];
    const match = allSubs.find(s => desc.includes(s.id));
    setEditSubCategory(match?.id || '');
    setEditFragile(order.items?.fragile || false);
    setEditValue(order.items?.value || 0);
    setEditImage(order.items?.image);
    setEditDimensions({
      length: order.items?.dimensions?.l?.toString() || '',
      width: order.items?.dimensions?.w?.toString() || '',
      height: order.items?.dimensions?.h?.toString() || '',
      weight: order.items?.weightKg?.toString() || '',
    });
    setEditHandlingNotes(order.items?.handlingNotes || '');
    setEditField('items');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setEditImage(reader.result as string);
      setUploadingImage(false);
    };
    reader.readAsDataURL(file);
  };

  const savePackageEdit = async () => {
    if (!editSubCategory) return;
    setSaving(true);
    try {
      const catLabel = editCategory === 'A' ? 'A' : 'B';
      await onUpdateOrder(order.id, {
        items: {
          ...order.items,
          itemDesc: `${catLabel} - ${editSubCategory}`,
          category: catLabel,
          subCategory: editSubCategory,
          fragile: editFragile,
          value: editValue,
          image: editImage,
          weightKg: parseFloat(editDimensions.weight) || order.items?.weightKg || 1,
          dimensions: editCategory === 'A' ? {
            l: parseFloat(editDimensions.length) || 0,
            w: parseFloat(editDimensions.width) || 0,
            h: parseFloat(editDimensions.height) || 0,
          } : order.items?.dimensions,
          handlingNotes: editHandlingNotes.trim(),
        }
      } as any);
    } catch (e) {
      console.error('Failed to update package:', e);
    }
    setSaving(false);
    closeEdit();
  };

  // ── Receiver editing ───────────────────────────────────
  const openReceiverEdit = () => {
    if (!canEditField('receiver')) return;
    setEditReceiverName(order.recipient?.name || '');
    setEditReceiverPhone(order.recipient?.phone || '');
    setEditReceiverId(order.recipient?.idNumber || '');
    setEditField('receiver');
  };

  const saveReceiverEdit = async () => {
    if (!editReceiverName.trim() || !editReceiverPhone.trim() || !editReceiverId.trim()) return;
    setSaving(true);
    try {
      await onUpdateOrder(order.id, {
        recipient: {
          ...order.recipient,
          name: editReceiverName.trim(),
          phone: editReceiverPhone.trim(),
          idNumber: editReceiverId.trim(),
        }
      } as any);
    } catch (e) {
      console.error('Failed to update receiver:', e);
    }
    setSaving(false);
    closeEdit();
  };

  // ── Add stop handler ───────────────────────────────────
  const openAddStop = () => {
    if (!canAddStop()) return;
    setAddressQuery('');
    setSuggestions([]);
    setSelectedCoords(null);
    setAddingStop(true);
    setEditField('addStop');
    setRouteExpanded(true);
    setTimeout(() => addressInputRef.current?.focus(), 150);
  };

  const saveNewStop = async () => {
    if (!addressQuery.trim() || !selectedCoords) return;
    setSaving(true);
    try {
      const generateCode = () => Math.floor(1000 + Math.random() * 9000).toString();
      const currentStops = order.stops || [];
      const dropoffStop = currentStops.find(s => s.type === 'dropoff');
      const nonDropoffStops = currentStops.filter(s => s.type !== 'dropoff');

      const newStop: RouteStop = {
        id: `wp-${Date.now()}`,
        address: addressQuery.trim(),
        lat: selectedCoords.lat,
        lng: selectedCoords.lng,
        type: 'waypoint',
        status: 'pending',
        verificationCode: generateCode(),
        sequenceOrder: nonDropoffStops.length + 1,
      };

      const updatedStops = [
        ...nonDropoffStops,
        newStop,
        ...(dropoffStop ? [{ ...dropoffStop, sequenceOrder: nonDropoffStops.length + 2 }] : []),
      ];

      await onUpdateOrder(order.id, { stops: updatedStops } as any);
      // Refresh map immediately
      refreshMapAfterEdit(order.pickupCoords || null, order.dropoffCoords || null, updatedStops);
      // Auto-optimize after adding a stop
      optimizeCurrentRoute(updatedStops);
      // Requote with new stop
      requoteAfterEdit({ stops: updatedStops });
    } catch (e) {
      console.error('Failed to add stop:', e);
    }
    setSaving(false);
    setAddingStop(false);
    closeEdit();
  };

  // ── Route optimization ─────────────────────────────────
  const optimizeCurrentRoute = async (stopsOverride?: RouteStop[]) => {
    const currentStops = stopsOverride || order.stops || [];
    const pendingStops = currentStops.filter(s => s.status === 'pending' && s.lat && s.lng);
    if (pendingStops.length < 2) return;

    const pickup = order.pickupCoords || (pickupCoords ? { lat: pickupCoords.lat, lng: pickupCoords.lng } : null);
    if (!pickup) return;

    setOptimizingRoute(true);
    try {
      const allStopCoords = pendingStops.map(s => ({ lat: s.lat, lng: s.lng }));
      const result = await mapService.getFullyOptimizedRoute(pickup, allStopCoords, order.vehicle);

      if (result?.full_optimized_order) {
        const optimizedStops = result.full_optimized_order.map((idx: number, seqIdx: number) => ({
          ...pendingStops[idx],
          sequenceOrder: seqIdx + 1,
        }));
        // Keep completed/arrived stops in their original order, then add optimized pending stops
        const completedStops = currentStops.filter(s => s.status !== 'pending');
        const updatedStops = [
          ...completedStops.map((s, i) => ({ ...s, sequenceOrder: i + 1 })),
          ...optimizedStops.map((s: any, i: number) => ({ ...s, sequenceOrder: completedStops.length + i + 1 })),
        ];
        await onUpdateOrder(order.id, { stops: updatedStops } as any);
        // Refresh map immediately
        refreshMapAfterEdit(pickup, order.dropoffCoords || null, updatedStops);
      }
    } catch (e) {
      console.error('Route optimization failed:', e);
    }
    setOptimizingRoute(false);
  };

  // ── Vehicle editing ────────────────────────────────────
  const openVehicleEdit = () => {
    if (!canEditField('vehicle')) return;
    setEditVehicle(order.vehicle || '');
    setEditServiceType(order.serviceType || 'Express');
    setEditHelpersCount((order as any).helpersCount || 0);
    setEditField('vehicle');
  };

  const saveVehicleEdit = async () => {
    if (!editVehicle && editServiceType !== 'Standard') return;
    setSaving(true);
    try {
      const newVehicle = editServiceType === 'Standard' ? 'standard' : editVehicle;
      await onUpdateOrder(order.id, {
        vehicle: newVehicle,
        serviceType: editServiceType,
        helpersCount: editHelpersCount,
      } as any);
      // Requote with new vehicle/service
      requoteAfterEdit({ vehicle: newVehicle, serviceType: editServiceType, helpersCount: editHelpersCount });
    } catch (e) {
      console.error('Failed to update vehicle:', e);
    }
    setSaving(false);
    closeEdit();
  };

  const closeEdit = () => {
    setEditField(null);
    setEditingStopId(null);
    setAddressQuery('');
    setSuggestions([]);
    setSelectedCoords(null);
    setAddingStop(false);
  };

  // ── Requote after edit — recalculates price + ETA ──────
  const requoteAfterEdit = async (overrides?: {
    pickupCoords?: { lat: number; lng: number };
    dropoffCoords?: { lat: number; lng: number };
    stops?: RouteStop[];
    vehicle?: string;
    serviceType?: string;
    helpersCount?: number;
  }, routeUpdate?: any) => {
    const pCoords = overrides?.pickupCoords || order.pickupCoords;
    const dCoords = overrides?.dropoffCoords || order.dropoffCoords;
    if (!pCoords || !dCoords) return;

    const stops = overrides?.stops || order.stops || [];
    const waypoints = stops
      .filter(s => s.type !== 'dropoff' && s.lat && s.lng)
      .sort((a, b) => (a.sequenceOrder || 0) - (b.sequenceOrder || 0))
      .map(s => ({ lat: s.lat, lng: s.lng }));

    const vehicle = overrides?.vehicle || order.vehicle || 'boda';
    const serviceType = overrides?.serviceType || order.serviceType || 'Express';
    const helpersCount = overrides?.helpersCount ?? (order as any).helpersCount ?? 0;
    const isReturnTrip = (order as any).isReturnTrip || false;
    const isFragile = order.items?.fragile || false;
    const category = order.items?.category || 'A';
    const subCategory = order.items?.subCategory || order.items?.itemDesc?.split(' - ')[1] || '';

    setRequoting(true);
    try {
      const { functions } = await import('../firebase');
      if (!functions) return;
      const calculateQuote = httpsCallable(functions, 'calculateQuote');
      const response: any = await calculateQuote({
        pickupCoords: pCoords,
        dropoffCoords: dCoords,
        waypoints,
        vehicle,
        serviceType,
        helpersCount,
        isReturnTrip,
        isFragile,
        category,
        subCategory,
      });

      const { price: newPrice, driverRate, durationMinutes, quoteId } = response.data;
      const oldPrice = order.price || 0;
      const etaMin = Math.ceil(durationMinutes || 0);
      const newEta = etaMin > 60 ? `${Math.floor(etaMin / 60)}h ${etaMin % 60}m` : `${etaMin} min`;

      // Determine whether to commit now or hold for payment
      if (newPrice > oldPrice) {
        // Price increased — hold the route update until payment is confirmed.
        // Show the price change banner with the pay button.
        setPriceChange({ oldPrice, newPrice, newEta });
        setPaymentSettled(false);
        // Do NOT save to Firestore yet — pendingRouteUpdate holds the changes.
      } else {
        // Price same or decreased (refund) — commit immediately.
        // Use the routeUpdate parameter (not state, which may be stale)
        await onUpdateOrder(order.id, {
          price: newPrice,
          driverRate,
          quoteId,
          estimatedDuration: newEta,
          ...(routeUpdate || {}),
        } as any);
        setPendingRouteUpdate(null);

        if (newPrice !== oldPrice) {
          setPriceChange({ oldPrice, newPrice, newEta });
          setPaymentSettled(true);
        }
      }
    } catch (e) {
      console.error('Requote failed:', e);
    }
    setRequoting(false);
  };

  // ── Pay the price difference after an edit ─────────────
  const handlePayDifference = async () => {
    if (!priceChange || !order) return;
    const difference = priceChange.newPrice - priceChange.oldPrice;
    if (difference <= 0) return;

    const paymentPhone = order.sender?.phone || (order as any).paymentPhone || '';
    if (!paymentPhone) {
      setPriceChange({ ...priceChange, newEta: priceChange.newEta + ' (Add phone to pay)' });
      return;
    }

    setPayingDifference(true);
    try {
      const { paymentService } = await import('../services/paymentService');
      const response = await paymentService.initiateMpesaPayment(
        paymentPhone,
        difference,
        `${order.id}-adjust`
      );

      if (response.success && response.checkoutRequestId) {
        // Poll for completion
        let attempts = 0;
        const poll = async () => {
          attempts++;
          const status = await paymentService.checkPaymentStatus(response.checkoutRequestId!);
          if (status.status === 'COMPLETED') {
            setPaymentSettled(true);
            setPayingDifference(false);
            // Commit the pending route update + new price to Firestore now that payment is confirmed
            await onUpdateOrder(order.id, {
              price: priceChange.newPrice,
              priceAdjustmentPaid: true,
              ...pendingRouteUpdate,
            } as any);
            setPendingRouteUpdate(null);
          } else if (status.status === 'FAILED') {
            setPayingDifference(false);
          } else if (attempts < 12) {
            setTimeout(poll, 3000);
          } else {
            setPayingDifference(false);
          }
        };
        setTimeout(poll, 3000);
      }
    } catch (e) {
      console.error('Payment difference failed:', e);
      setPayingDifference(false);
    }
  };

  // ── Other handlers ─────────────────────────────────────
  const copyCode = () => {
    if (order.verificationCode) {
      navigator.clipboard.writeText(order.verificationCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleShare = () => {
    const url = `https://axon-8b0a8.web.app/track/${order.id}`;
    if (navigator.share) {
      navigator.share({ title: 'Track my Axon Delivery', url });
    } else {
      navigator.clipboard.writeText(url);
    }
  };

  const handleFocusDriver = () => {
    if (order.driverLocation) {
      const driverPos = { lat: order.driverLocation.lat, lng: order.driverLocation.lng };
      if (pickupCoords && isAssigned) fitBounds([driverPos, pickupCoords]);
      else if (dropoffCoords && isInTransit) fitBounds([driverPos, dropoffCoords]);
      else fitBounds([driverPos]);
    }
  };

  const handleCancel = async () => {
    if (isDelivered || order.status === 'cancelled' || order.status === 'expired') return;

    const isAssignedStatus = order.status === 'driver_assigned' || order.status === 'arriving_pickup';
    const cancelMsg = isAssignedStatus
      ? 'Cancel this order? A 100 KES cancellation fee will be charged to compensate your driver. This cannot be undone.'
      : 'Cancel this order? This cannot be undone.';

    if (!confirm(cancelMsg)) return;

    try {
      // Use the cancelOrder Cloud Function for structured cancel + refund
      const { httpsCallable } = await import('firebase/functions');
      const { functions } = await import('../firebase');
      if (functions) {
        const cancelFn = httpsCallable(functions, 'cancelOrder');
        await cancelFn({ orderId: order.id, reason: 'Customer cancelled from tracking' });
      } else {
        await onUpdateStatus(order.id, 'cancelled');
      }
    } catch (e: any) {
      console.error('Cancel failed:', e);
    }
  };

  // ── Helpers for route display ──────────────────────────
  const getStopStatusBadge = (stop: RouteStop) => {
    if (stop.status === 'completed') return { text: 'Done', color: 'bg-emerald-100 text-emerald-700' };
    if (stop.status === 'arrived') return { text: 'Arrived', color: 'bg-blue-100 text-blue-700' };
    return null;
  };

  const sortedStops = [...(order.stops || [])].sort((a, b) => (a.sequenceOrder || 0) - (b.sequenceOrder || 0));
  const waypoints = sortedStops.filter(s => s.type === 'waypoint');
  const hasEditableRoute = canEditPickup() || canEditDropoff() || waypoints.some(s => canEditStop(s));

  // Delivered → PostDelivery
  if (isDelivered) {
    return (
      <div className="fixed bottom-0 inset-x-0 md:inset-x-auto md:right-4 md:top-4 md:bottom-4 md:w-[400px] pointer-events-none z-[100] flex flex-col justify-end mx-auto max-w-lg md:max-w-none md:mx-0">
        <div className="pointer-events-auto bg-white rounded-t-[2.5rem] md:rounded-2xl shadow-[0_-15px_40px_rgba(0,0,0,0.12)] md:shadow-2xl border-t border-gray-100 md:border overflow-hidden pb-[env(safe-area-inset-bottom,0)]">
          <PostDelivery
            orderId={order.id}
            driverName={order.driver?.name}
            onComplete={onBack}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 inset-x-0 md:inset-x-auto md:right-4 md:top-4 md:bottom-4 md:w-[400px] pointer-events-none z-[100] flex flex-col justify-end mx-auto max-w-lg md:max-w-none md:mx-0 pb-[env(safe-area-inset-bottom,0)]">
      <div
        ref={bottomSheetRef}
        className={`w-full bg-white shadow-[0_-15px_40px_rgba(0,0,0,0.12)] md:shadow-2xl rounded-t-[2.5rem] md:rounded-2xl overflow-hidden pointer-events-auto border-t border-gray-100 md:border flex flex-col transition-all duration-300 ${isLocationEditing ? 'max-h-[75vh]' : isCollapsed ? 'max-h-[180px]' : 'max-h-[85vh] md:max-h-[calc(100vh-2rem)]'}`}
      >
        {/* ── Colored Header with Journey Animation ────────── */}
        <div
          className={`bg-gradient-to-r ${journeyStep.gradient} px-5 pt-3 pb-4 flex flex-col items-center w-full z-10 flex-shrink-0 cursor-pointer rounded-t-[2.5rem] md:rounded-t-2xl`}
          onClick={() => { if (!isLocationEditing) setIsCollapsed(!isCollapsed); }}
        >
          <div className="w-12 h-1 bg-white/30 rounded-full mb-3 md:hidden" />

          {/* Status + ETA + Price row */}
          <div className="w-full flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white/80">{journeyStep.label}</span>
            </div>
            <div className="flex items-center gap-2">
              {order.price && (
                <div className="bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-full">
                  <span className="text-xs font-black text-white">{order.paymentMethod} · KES {order.price.toLocaleString()}</span>
                </div>
              )}
              {etaMinutes && (
                <div className="bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-full">
                  <span className="text-xs font-black text-white">{etaMinutes} min</span>
                </div>
              )}
              <ChevronUp className={`w-5 h-5 text-white/60 transition-transform duration-300 ${!isCollapsed && !isLocationEditing ? 'rotate-180' : ''}`} />
            </div>
          </div>

          {/* Route summary */}
          <div className="w-full flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <div className="text-white font-black text-sm truncate flex items-center gap-1.5">
                {order.pickup.split(',')[0]}
                <ArrowRight size={12} className="text-white/50 flex-shrink-0" />
                {order.dropoff.split(',')[0]}
              </div>
              <p className={`text-[11px] font-bold ${journeyStep.textColor} mt-0.5`}>{journeyStep.sublabel}</p>
            </div>
          </div>

          {/* Journey progress steps */}
          <div className="w-full mt-3">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(s => (
                <div key={s} className="flex-1 h-1 rounded-full overflow-hidden bg-white/20">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${s <= journeyStep.step ? 'bg-white' : ''} ${s === journeyStep.step ? 'animate-pulse' : ''}`}
                    style={{ width: s <= journeyStep.step ? '100%' : '0%' }}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-1.5">
              {['Placed', 'Assigned', 'Collected', 'In Transit', 'Delivered'].map((label, i) => (
                <span key={label} className={`text-[7px] font-bold ${i < journeyStep.step ? 'text-white/70' : i === journeyStep.step ? 'text-white' : 'text-white/30'}`}>{label}</span>
              ))}
            </div>
          </div>

          {/* Driver info (inline when assigned) */}
          {order.driver && (isAssigned || isInTransit) && (
            <div className="w-full flex items-center gap-3 mt-3 bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2">
              <img
                src={order.driver.avatar || 'https://via.placeholder.com/150'}
                className="w-9 h-9 rounded-lg object-cover border-2 border-white/30 flex-shrink-0"
                alt={order.driver.name}
              />
              <div className="flex-1 min-w-0">
                <h4 className="text-white font-black text-xs truncate">{order.driver.name}</h4>
                <p className="text-white/60 text-[10px] font-bold truncate">{order.driver.plate} · {order.vehicle}</p>
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                <button onClick={(e) => { e.stopPropagation(); handleFocusDriver(); }} className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center active:scale-90 transition-all">
                  <MapPin size={14} className="text-white" />
                </button>
                {order.driver.phone && (
                  <a href={`tel:${order.driver.phone}`} onClick={e => e.stopPropagation()} className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center active:scale-90 transition-all">
                    <Phone size={14} className="text-white" />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Searching animation (pending — no driver yet) */}
          {isPending && (
            <div className="w-full flex items-center gap-3 mt-3 bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2.5">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Loader2 size={16} className="text-white animate-spin" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-white font-black text-[11px]">Finding your Axon Pro</h4>
                <p className="text-white/60 text-[9px] font-bold">Matching with nearest driver...</p>
              </div>
              <div className="flex gap-1">
                {[1, 2, 3].map(i => (
                  <div key={i} className="w-1.5 h-1.5 bg-white/40 rounded-full animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Inline Route Editor (booking-style) ──────────── */}
        <AnimatePresence>
          {isLocationEditing && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-2">
                {/* Route Builder Card — matches booking Step1Where */}
                <div className="rounded-2xl border border-gray-200 bg-gray-50 overflow-visible">

                  {/* PICKUP ROW */}
                  <div className="px-3 pt-3 pb-0">
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-emerald-200 z-10" />
                      {editField === 'pickup' ? (
                        <>
                          <input
                            ref={editField === 'pickup' ? addressInputRef : undefined}
                            type="text"
                            placeholder="Search pickup address..."
                            className="w-full pl-9 pr-10 py-3 rounded-xl bg-white border border-emerald-300 ring-2 ring-emerald-500/20 text-gray-900 text-sm font-bold transition-all outline-none"
                            value={addressQuery}
                            onChange={e => handleAddressQueryChange(e.target.value)}
                          />
                          <button onClick={closeEdit} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-gray-100">
                            <X size={14} className="text-gray-400" />
                          </button>
                        </>
                      ) : (
                        <div
                          onClick={() => canEditPickup() && openLocationEdit('pickup')}
                          className={`w-full pl-9 pr-10 py-3 rounded-xl bg-white border border-gray-200 text-sm font-bold text-gray-900 truncate ${canEditPickup() ? 'cursor-pointer hover:border-emerald-300' : ''}`}
                        >
                          {order.pickup || 'Pickup Location'}
                        </div>
                      )}
                    </div>
                    {/* Suggestions for pickup */}
                    {editField === 'pickup' && suggestions.length > 0 && (
                      <div className="mt-1.5 w-full bg-white rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-gray-100 overflow-hidden max-h-[30vh] overflow-y-auto relative z-20">
                        {suggestions.map((sug, i) => (
                          <button
                            key={i}
                            onClick={() => handleSuggestionSelect(sug)}
                            className="w-full p-3 hover:bg-gray-50 border-b border-gray-50 last:border-none flex items-center gap-3 transition-colors text-left"
                          >
                            <MapPin className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                            <span className="text-sm font-semibold text-gray-700 truncate">{sug.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {editField === 'pickup' && selectedCoords && (
                      <div className="flex items-center gap-2 mt-1.5 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200">
                        <Check size={14} className="text-emerald-600 flex-shrink-0" />
                        <span className="text-xs font-bold text-emerald-700 truncate flex-1">{addressQuery}</span>
                      </div>
                    )}
                  </div>

                  {/* Connector + Waypoints */}
                  <div className="flex items-stretch px-3 mt-0.5">
                    <div className="flex flex-col items-center w-[14px] flex-shrink-0 mr-2.5 pt-1 pb-1">
                      <div className="w-px flex-1 bg-gray-300" style={{ minHeight: 12 }} />
                    </div>
                    {waypoints.length > 0 && (
                      <div className="flex-1 py-1 space-y-1.5 min-w-0">
                        {waypoints.map((stop, idx) => {
                          const badge = getStopStatusBadge(stop);
                          const isEditingThis = editField === 'stop' && editingStopId === stop.id;
                          return (
                            <div key={stop.id}>
                              {isEditingThis ? (
                                <div className="space-y-1.5">
                                  <div className="relative">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-amber-400 ring-1 ring-amber-200 z-10" />
                                    <input
                                      ref={addressInputRef}
                                      type="text"
                                      placeholder="Search stop address..."
                                      className="w-full pl-8 pr-10 py-2.5 rounded-lg bg-white border border-amber-300 ring-2 ring-amber-500/20 text-gray-900 text-xs font-bold transition-all outline-none"
                                      value={addressQuery}
                                      onChange={e => handleAddressQueryChange(e.target.value)}
                                    />
                                    <button onClick={closeEdit} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-gray-100">
                                      <X size={12} className="text-gray-400" />
                                    </button>
                                  </div>
                                  {suggestions.length > 0 && (
                                    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden max-h-[25vh] overflow-y-auto relative z-20">
                                      {suggestions.map((sug, i) => (
                                        <button
                                          key={i}
                                          onClick={() => handleSuggestionSelect(sug)}
                                          className="w-full p-2.5 hover:bg-gray-50 border-b border-gray-50 last:border-none flex items-center gap-2 transition-colors text-left"
                                        >
                                          <MapPin className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                                          <span className="text-xs font-semibold text-gray-700 truncate">{sug.label}</span>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                  {selectedCoords && (
                                    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200">
                                      <Check size={12} className="text-amber-600 flex-shrink-0" />
                                      <span className="text-[11px] font-bold text-amber-700 truncate">{addressQuery}</span>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-100 px-2 py-2 overflow-hidden min-w-0">
                                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${stop.status === 'completed' ? 'bg-emerald-400' : stop.status === 'arrived' ? 'bg-blue-400' : 'bg-amber-400'} ring-1 ring-amber-200`} />
                                  <span className="text-xs font-semibold text-gray-800 truncate flex-1">{stop.address}</span>
                                  {badge && <span className={`text-[7px] font-black px-1 py-0.5 rounded flex-shrink-0 ${badge.color}`}>{badge.text}</span>}
                                  {canEditStop(stop) && (
                                    <button onClick={() => openLocationEdit('stop', stop.id)} className="text-[10px] font-bold text-brand-600 hover:text-brand-700 flex-shrink-0">
                                      Edit
                                    </button>
                                  )}
                                  {canRemoveStop(stop) && (
                                    <button onClick={() => handleRemoveStop(stop.id)} className="p-0.5 rounded-full text-red-400 hover:text-red-600 flex-shrink-0">
                                      <X size={10} />
                                    </button>
                                  )}
                                  {!canEditStop(stop) && <span className="text-[8px] font-bold text-gray-300 flex-shrink-0">Locked</span>}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Add Stop inline */}
                  {editField === 'addStop' && (
                    <div className="px-3 pb-1 space-y-1.5">
                      <div className="relative">
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-blue-400 ring-2 ring-blue-200 z-10" />
                        <input
                          ref={addressInputRef}
                          type="text"
                          placeholder="Search new stop address..."
                          className="w-full pl-9 pr-10 py-3 rounded-xl bg-white border border-blue-300 ring-2 ring-blue-500/20 text-gray-900 text-sm font-bold transition-all outline-none"
                          value={addressQuery}
                          onChange={e => handleAddressQueryChange(e.target.value)}
                        />
                        <button onClick={closeEdit} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-gray-100">
                          <X size={14} className="text-gray-400" />
                        </button>
                      </div>
                      {suggestions.length > 0 && (
                        <div className="bg-white rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-gray-100 overflow-hidden max-h-[30vh] overflow-y-auto relative z-20">
                          {suggestions.map((sug, i) => (
                            <button
                              key={i}
                              onClick={() => handleSuggestionSelect(sug)}
                              className="w-full p-3 hover:bg-gray-50 border-b border-gray-50 last:border-none flex items-center gap-3 transition-colors text-left"
                            >
                              <MapPin className="w-4 h-4 text-blue-500 flex-shrink-0" />
                              <span className="text-sm font-semibold text-gray-700 truncate">{sug.label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {selectedCoords && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50 border border-blue-200">
                          <Check size={14} className="text-blue-600 flex-shrink-0" />
                          <span className="text-xs font-bold text-blue-700 truncate">{addressQuery}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* DROPOFF ROW */}
                  <div className="px-3 pt-0 pb-3">
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-red-500 ring-2 ring-red-200 z-10" />
                      {editField === 'dropoff' ? (
                        <>
                          <input
                            ref={editField === 'dropoff' ? addressInputRef : undefined}
                            type="text"
                            placeholder="Search dropoff address..."
                            className="w-full pl-9 pr-10 py-3 rounded-xl bg-white border border-red-300 ring-2 ring-red-500/20 text-gray-900 text-sm font-bold transition-all outline-none"
                            value={addressQuery}
                            onChange={e => handleAddressQueryChange(e.target.value)}
                          />
                          <button onClick={closeEdit} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-gray-100">
                            <X size={14} className="text-gray-400" />
                          </button>
                        </>
                      ) : (
                        <div
                          onClick={() => canEditDropoff() && openLocationEdit('dropoff')}
                          className={`w-full pl-9 pr-10 py-3 rounded-xl bg-white border border-gray-200 text-sm font-bold text-gray-900 truncate ${canEditDropoff() ? 'cursor-pointer hover:border-red-300' : ''}`}
                        >
                          {order.dropoff || 'Dropoff Location'}
                        </div>
                      )}
                    </div>
                    {/* Suggestions for dropoff */}
                    {editField === 'dropoff' && suggestions.length > 0 && (
                      <div className="mt-1.5 w-full bg-white rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-gray-100 overflow-hidden max-h-[30vh] overflow-y-auto relative z-20">
                        {suggestions.map((sug, i) => (
                          <button
                            key={i}
                            onClick={() => handleSuggestionSelect(sug)}
                            className="w-full p-3 hover:bg-gray-50 border-b border-gray-50 last:border-none flex items-center gap-3 transition-colors text-left"
                          >
                            <MapPin className="w-4 h-4 text-red-500 flex-shrink-0" />
                            <span className="text-sm font-semibold text-gray-700 truncate">{sug.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {editField === 'dropoff' && selectedCoords && (
                      <div className="flex items-center gap-2 mt-1.5 px-3 py-2 rounded-xl bg-red-50 border border-red-200">
                        <Check size={14} className="text-red-600 flex-shrink-0" />
                        <span className="text-xs font-bold text-red-700 truncate flex-1">{addressQuery}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Add Stop + Optimize buttons */}
                {editField !== 'addStop' && canAddStop() && (
                  <div className="flex gap-2">
                    <button
                      onClick={openAddStop}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-[11px] font-bold transition-colors"
                    >
                      <Plus size={13} /> Add Stop
                      <span className="text-[9px] text-emerald-500 ml-0.5">({(order.stops || []).length}/5)</span>
                    </button>
                  </div>
                )}
                {optimizingRoute && (
                  <div className="flex items-center justify-center gap-2 py-1.5 text-[10px] font-bold text-blue-600">
                    <Loader2 size={12} className="animate-spin" /> Optimizing route...
                  </div>
                )}

                {/* Save / Cancel bar */}
                <div className="flex gap-2">
                  <button
                    onClick={closeEdit}
                    className="flex-1 h-[44px] bg-gray-100 text-gray-700 rounded-xl text-sm font-bold active:scale-95 transition-all"
                  >
                    Done
                  </button>
                  {(editField === 'pickup' || editField === 'dropoff' || editField === 'stop' || editField === 'addStop') && selectedCoords && (
                    <button
                      onClick={editField === 'addStop' ? saveNewStop : saveLocationEdit}
                      disabled={saving || !addressQuery.trim()}
                      className="flex-1 h-[44px] bg-gray-900 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-95 transition-all shadow-md"
                    >
                      {saving ? <Loader2 size={16} className="animate-spin" /> : editField === 'addStop' ? 'Add Stop' : 'Save'}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Expanded content ──────────────────────────────── */}
        <div className={`px-5 pb-4 space-y-3 overflow-y-auto no-scrollbar flex-1 ${isCollapsed || isLocationEditing ? 'hidden' : ''}`}>

          {/* Verification PIN */}
          {order.verificationCode && (isAssigned || isInTransit) && (
            <div className="flex items-center justify-between bg-gray-900 rounded-xl px-4 py-3">
              <div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Delivery PIN</div>
                <div className="text-xl font-black text-white tracking-[0.3em]">{order.verificationCode}</div>
              </div>
              <button onClick={copyCode} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                {copiedCode ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} className="text-gray-400" />}
              </button>
            </div>
          )}



          {/* Price change banner */}
          <AnimatePresence>
            {requoting && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-blue-50 border border-blue-200">
                <Loader2 size={14} className="text-blue-500 animate-spin flex-shrink-0" />
                <span className="text-[11px] font-bold text-blue-700">Recalculating price & ETA...</span>
              </motion.div>
            )}
            {priceChange && !requoting && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className={`px-3 py-2.5 rounded-xl border ${priceChange.newPrice > priceChange.oldPrice ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[9px] font-black uppercase tracking-wider text-gray-500">Price Updated</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400 line-through">KES {priceChange.oldPrice.toLocaleString()}</span>
                      <ArrowRight size={10} className="text-gray-400" />
                      <span className="text-sm font-black text-gray-900">KES {priceChange.newPrice.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xs font-black ${priceChange.newPrice > priceChange.oldPrice ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {priceChange.newPrice > priceChange.oldPrice ? '+' : ''}KES {(priceChange.newPrice - priceChange.oldPrice).toLocaleString()}
                    </div>
                    <div className="text-[9px] font-bold text-gray-400">ETA: {priceChange.newEta}</div>
                  </div>
                </div>
                {/* Pay difference or refund notice */}
                {priceChange.newPrice > priceChange.oldPrice && (
                  <div className="mt-2 pt-2 border-t border-amber-100">
                    {paymentSettled ? (
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600">
                        <Check size={12} /> Difference paid — order updated
                      </div>
                    ) : payingDifference ? (
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-600">
                        <Loader2 size={12} className="animate-spin" /> M-Pesa STK push sent — check your phone...
                      </div>
                    ) : (
                      <button
                        onClick={handlePayDifference}
                        className="w-full py-2 bg-amber-500 text-white rounded-lg text-[11px] font-bold hover:bg-amber-600 transition-colors flex items-center justify-center gap-1.5"
                      >
                        Pay KES {(priceChange.newPrice - priceChange.oldPrice).toLocaleString()} via M-Pesa
                      </button>
                    )}
                  </div>
                )}
                {priceChange.newPrice < priceChange.oldPrice && (
                  <div className="mt-2 pt-2 border-t border-emerald-100">
                    <div className="text-[11px] font-bold text-emerald-600">
                      Refund of KES {(priceChange.oldPrice - priceChange.newPrice).toLocaleString()} will be sent to your M-Pesa
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>


          {/* ── Edit Order (collapsed section) ────────────── */}
          {(canEditField('items') || canEditField('vehicle') || canEditField('receiver') || hasEditableRoute) && (
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <button
                onClick={() => setEditMenuOpen(!editMenuOpen)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Pencil size={14} className="text-gray-500" />
                  <span className="text-xs font-black text-gray-700">Edit Order</span>
                </div>
                <ChevronDown size={14} className={`text-gray-400 transition-transform duration-200 ${editMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {editMenuOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="overflow-hidden"
                  >
                    <div className="p-3 space-y-1.5 border-t border-gray-200">
                      {/* Route */}
                      {hasEditableRoute && (
                        <div className="rounded-xl bg-emerald-50 border border-emerald-200/60 overflow-hidden">
                          <button
                            onClick={() => setRouteExpanded(!routeExpanded)}
                            className="w-full flex items-center justify-between px-3 py-2.5 text-left"
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <MapPin size={14} className="text-emerald-600 flex-shrink-0" />
                              <span className="text-xs font-bold text-gray-900 truncate">
                                {order.pickup.split(',')[0]} → {order.dropoff.split(',')[0]}
                              </span>
                              {waypoints.length > 0 && (
                                <span className="text-[9px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded flex-shrink-0">
                                  +{waypoints.length}
                                </span>
                              )}
                            </div>
                            <ChevronDown size={14} className={`text-emerald-400 transition-transform ${routeExpanded ? 'rotate-180' : ''}`} />
                          </button>
                          {routeExpanded && (
                            <div className="px-3 pb-3 space-y-0">
                              <div className="flex items-center gap-2 py-2 border-t border-emerald-200/40">
                                <div className="w-5 flex justify-center flex-shrink-0">
                                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-emerald-300" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-[8px] font-black text-emerald-500 uppercase tracking-wider">Pickup</div>
                                  <div className="text-[11px] font-bold text-gray-900 truncate">{order.pickup}</div>
                                </div>
                                {canEditPickup() && (
                                  <button onClick={() => openLocationEdit('pickup')} className="p-1.5 rounded-lg hover:bg-emerald-100 transition-colors flex-shrink-0">
                                    <Pencil size={12} className="text-emerald-500" />
                                  </button>
                                )}
                              </div>
                              {waypoints.map((stop, idx) => {
                                const badge = getStopStatusBadge(stop);
                                const editable = canEditStop(stop);
                                const removable = canRemoveStop(stop);
                                return (
                                  <div key={stop.id} className="flex items-center gap-2 py-2 border-t border-emerald-200/40">
                                    <div className="w-5 flex justify-center flex-shrink-0">
                                      <div className={`w-2 h-2 rounded-full ${stop.status === 'completed' ? 'bg-emerald-400' : stop.status === 'arrived' ? 'bg-blue-400' : 'bg-amber-400'}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[8px] font-black text-amber-500 uppercase tracking-wider">Stop {idx + 1}</span>
                                        {badge && <span className={`text-[7px] font-black px-1 py-0.5 rounded ${badge.color}`}>{badge.text}</span>}
                                        {stop.verificationCode && stop.status !== 'completed' && (
                                          <span className="text-[7px] font-mono font-bold text-gray-400">PIN: {stop.verificationCode}</span>
                                        )}
                                      </div>
                                      <div className="text-[11px] font-bold text-gray-900 truncate">{stop.address}</div>
                                    </div>
                                    {editable && (
                                      <div className="flex items-center gap-0.5 flex-shrink-0">
                                        <button onClick={() => openLocationEdit('stop', stop.id)} className="p-1.5 rounded-lg hover:bg-emerald-100 transition-colors">
                                          <Pencil size={11} className="text-emerald-500" />
                                        </button>
                                        {removable && (
                                          <button onClick={() => handleRemoveStop(stop.id)} className="p-1.5 rounded-lg hover:bg-red-100 transition-colors">
                                            <Trash2 size={11} className="text-red-400" />
                                          </button>
                                        )}
                                      </div>
                                    )}
                                    {!editable && <div className="text-[8px] font-bold text-gray-300 uppercase flex-shrink-0">Locked</div>}
                                  </div>
                                );
                              })}
                              <div className="flex items-center gap-2 py-2 border-t border-emerald-200/40">
                                <div className="w-5 flex justify-center flex-shrink-0">
                                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-red-300" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[8px] font-black text-red-500 uppercase tracking-wider">Dropoff</span>
                                    {order.verificationCode && (isAssigned || isInTransit) && (
                                      <button onClick={(e) => { e.stopPropagation(); copyCode(); }} className="flex items-center gap-1 text-[7px] font-mono font-bold text-gray-400 hover:text-gray-600 transition-colors">
                                        PIN: {order.verificationCode}
                                        {copiedCode ? <Check size={8} className="text-emerald-400" /> : <Copy size={8} className="text-gray-300" />}
                                      </button>
                                    )}
                                  </div>
                                  <div className="text-[11px] font-bold text-gray-900 truncate">{order.dropoff}</div>
                                </div>
                                {canEditDropoff() && (
                                  <button onClick={() => openLocationEdit('dropoff')} className="p-1.5 rounded-lg hover:bg-emerald-100 transition-colors flex-shrink-0">
                                    <Pencil size={12} className="text-emerald-500" />
                                  </button>
                                )}
                                {!canEditDropoff() && !isPending && (
                                  <div className="text-[8px] font-bold text-gray-300 uppercase flex-shrink-0">Locked</div>
                                )}
                              </div>
                              {canAddStop() && (
                                <div className="flex gap-2 pt-2 border-t border-emerald-200/40">
                                  <button onClick={openAddStop} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-[10px] font-bold transition-colors">
                                    <Plus size={12} /> Add Stop <span className="text-[8px] text-emerald-500 ml-0.5">({(order.stops || []).length}/5)</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Package + Vehicle */}
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => openPackageEdit()}
                          className={`flex-1 flex items-center justify-between px-3 py-2.5 rounded-xl bg-blue-50 border transition-colors text-left ${canEditField('items') ? 'border-blue-300 hover:bg-blue-100/70 cursor-pointer' : 'border-blue-200/60 cursor-default'}`}
                        >
                          <div className="min-w-0">
                            <div className="text-[9px] font-bold uppercase tracking-wider text-blue-400">Package</div>
                            <div className="text-xs font-bold text-gray-900 truncate">{order.items?.itemDesc || 'Package'}</div>
                          </div>
                          {canEditField('items') && <Pencil size={11} className="text-blue-400 flex-shrink-0" />}
                        </button>
                        <button
                          onClick={() => openVehicleEdit()}
                          className={`flex-1 flex items-center justify-between px-3 py-2.5 rounded-xl bg-amber-50 border transition-colors text-left ${canEditField('vehicle') ? 'border-amber-300 hover:bg-amber-100/70 cursor-pointer' : 'border-amber-200/60 cursor-default'}`}
                        >
                          <div className="min-w-0">
                            <div className="text-[9px] font-bold uppercase tracking-wider text-amber-500">Vehicle</div>
                            <div className="text-xs font-bold text-gray-900 truncate">{order.vehicle}</div>
                          </div>
                          {canEditField('vehicle') && <Pencil size={11} className="text-amber-400 flex-shrink-0" />}
                        </button>
                      </div>

                      {/* Receiver */}
                      <button
                        onClick={() => openReceiverEdit()}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-purple-50 border transition-colors text-left ${canEditField('receiver') ? 'border-purple-300 hover:bg-purple-100/70 cursor-pointer' : 'border-purple-200/60 cursor-default'}`}
                      >
                        <div className="min-w-0">
                          <div className="text-[9px] font-bold uppercase tracking-wider text-purple-400">Receiver</div>
                          <div className="text-xs font-bold text-gray-900">
                            {order.recipient?.name || 'Not set'}
                            <span className="font-normal text-gray-500 ml-1">{order.recipient?.phone}</span>
                          </div>
                        </div>
                        {canEditField('receiver') && (
                          <Pencil size={11} className="text-purple-400 flex-shrink-0" />
                        )}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleShare}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 active:scale-95 transition-all"
            >
              <Share2 size={14} /> Share
            </button>
            {order.driver?.phone && (
              <a
                href={`tel:${order.driver.phone}`}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-brand-600 rounded-xl text-xs font-bold text-white hover:bg-brand-700 active:scale-95 transition-all"
              >
                <Phone size={14} /> Call Driver
              </a>
            )}
            {(isPending || order.status === 'driver_assigned' || order.status === 'arriving_pickup') && (
              <button
                onClick={handleCancel}
                className="flex items-center justify-center gap-2 py-3 px-4 bg-red-50 border border-red-100 rounded-xl text-xs font-bold text-red-600 hover:bg-red-100 active:scale-95 transition-all"
              >
                <X size={14} /> Cancel
              </button>
            )}
            <button
              onClick={() => openKifaru(true)}
              className="flex items-center justify-center gap-2 py-3 px-4 bg-red-50 border border-red-100 rounded-xl text-xs font-bold text-red-600 hover:bg-red-100 active:scale-95 transition-all"
            >
              <ShieldAlert size={14} /> SOS
            </button>
          </div>


        </div>
      </div>

      {/* ── Edit Modals (package / receiver / vehicle only) ── */}
      <AnimatePresence>
        {editField && !isLocationEditing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-end md:items-center justify-center pointer-events-auto"
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeEdit} />
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="relative bg-white rounded-t-2xl md:rounded-2xl p-5 w-full max-w-md mx-auto md:mx-0 shadow-2xl max-h-[85vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-0.5">
                    {editField === 'items' ? 'Step 2 of 4' : editField === 'vehicle' ? 'Step 3 of 4' : 'Step 4 of 4'}
                  </div>
                  <h3 className="text-sm font-black text-gray-900">
                    {editField === 'receiver' ? 'Receiver Details'
                      : editField === 'items' ? 'What are you sending?'
                        : 'How should we deliver?'}
                  </h3>
                </div>
                <button onClick={closeEdit} className="p-1.5 rounded-lg hover:bg-gray-100">
                  <X size={16} className="text-gray-400" />
                </button>
              </div>

              {/* ── Package Edit (full details) ───────────── */}
              {editField === 'items' && (
                <div className="space-y-4">
                  {/* Category tabs */}
                  <div className="grid grid-cols-2 gap-1 pb-2 pt-2 px-0 text-center w-full">
                    {[
                      { id: 'A' as const, label: '📦 Standard' },
                      { id: 'B' as const, label: '🏗️ Bulky / Heavy' },
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => { setEditCategory(tab.id); setEditSubCategory(''); }}
                        className={`flex-1 px-1 py-3 rounded-xl text-[11px] sm:text-sm font-bold whitespace-nowrap transition-all border ${editCategory === tab.id
                          ? 'bg-brand-50 border-brand-500 text-brand-700 shadow-sm ring-1 ring-brand-500'
                          : 'bg-gray-100 border-gray-200 text-gray-500 hover:bg-gray-200'
                          }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Subcategory grid */}
                  <div className="min-h-[160px]">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={editCategory}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="grid grid-cols-2 gap-3 max-h-[34vh] overflow-y-auto no-scrollbar p-1 pb-4"
                      >
                        {SUBCATEGORIES[editCategory].map((item) => {
                          const isSelected = editSubCategory === item.id;
                          const isA = editCategory === 'A';
                          return (
                            <button
                              key={item.id}
                              onClick={() => setEditSubCategory(item.id)}
                              className={`relative text-left p-2.5 rounded-xl border transition-all flex flex-col ${isSelected
                                ? 'border-brand-500 bg-brand-50 shadow-sm scale-[1.02] ring-1 ring-brand-500'
                                : 'border-gray-200 bg-white hover:border-brand-200 hover:bg-gray-50'
                                } ${isA ? 'min-h-[85px] justify-start gap-1' : ''}`}
                            >
                              <img src={item.img} alt={item.label} className="w-5 h-5 object-contain" />
                              <div className="w-full">
                                <div className={`text-[13px] font-bold ${isA ? 'pr-12' : ''} ${isSelected ? 'text-brand-900' : 'text-gray-900'}`}>{item.label}</div>
                                {!isA && <div className={`text-xs mt-0.5 ${isSelected ? 'text-brand-600' : 'text-gray-500'}`}>{item.desc}</div>}
                              </div>
                              {isA && (
                                <div className="w-full mt-auto flex flex-col">
                                  {item.desc !== 'Custom' && <span className={`absolute top-2.5 right-2.5 text-[9px] font-bold px-1.5 py-0.5 rounded ${isSelected ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-500'}`}>{item.desc.replace('Max ', 'MAX ')}</span>}
                                  <span className={`text-[10px] lowercase leading-tight block ${isSelected ? 'text-brand-600' : 'text-gray-500'}`}>{item.examples}</span>
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  {/* Dimensions + Package Details (shown after subcategory selected) */}
                  <AnimatePresence>
                    {editSubCategory !== '' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        className="overflow-hidden space-y-4"
                      >
                        {editCategory === 'A' && (
                          <div className="grid grid-cols-2 gap-3 px-1">
                            {['Length', 'Width', 'Height', 'Weight'].map((dim) => {
                              const prop = dim.toLowerCase() as keyof typeof editDimensions;
                              return (
                                <div key={dim} className="space-y-1">
                                  <label className="text-[10px] font-bold text-gray-500 uppercase">{dim} {dim === 'Weight' ? '(kg)' : '(cm)'}</label>
                                  <input
                                    type="number"
                                    value={editDimensions[prop]}
                                    onChange={e => setEditDimensions(prev => ({ ...prev, [prop]: e.target.value }))}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        )}

                        <div className="bg-white border border-gray-200 rounded-2xl p-3 shadow-sm space-y-4">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand-600">Package Details</p>
                            <h4 className="text-sm font-black text-gray-900">Add proof, value and handling notes</h4>
                          </div>

                          <div className="w-full">
                            <label className="text-[10px] font-bold text-gray-500 uppercase mb-2 block">Item Photo (Recommended)</label>
                            <div
                              onClick={() => fileInputRef.current?.click()}
                              className={`relative w-full aspect-video rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${editImage ? 'border-brand-500 bg-brand-50' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'}`}
                            >
                              {editImage ? (
                                <>
                                  <img src={editImage} className="w-full h-full object-cover rounded-2xl" alt="Item" />
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setEditImage(undefined); }}
                                    className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-md text-red-500 hover:bg-red-50"
                                  >
                                    <X size={16} />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-brand-600 mb-2">
                                    {uploadingImage ? <Loader2 size={24} className="animate-spin" /> : <Camera size={24} />}
                                  </div>
                                  <span className="text-xs font-bold text-gray-600">Snap or Upload Item Photo</span>
                                  <span className="text-[10px] text-gray-400 mt-1">Helps with insurance and verification</span>
                                </>
                              )}
                            </div>
                            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                          </div>

                          <div className="grid grid-cols-2 gap-3 w-full">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1">
                                <ShieldCheck size={10} className="text-blue-500" /> Est. Value (KES)
                              </label>
                              <input
                                type="number"
                                placeholder="e.g. 5000"
                                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-500 transition-all"
                                value={editValue || ''}
                                onChange={e => setEditValue(parseInt(e.target.value) || 0)}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1">
                                <AlertTriangle size={10} className="text-amber-500" /> Handle with care?
                              </label>
                              <button
                                onClick={() => setEditFragile(!editFragile)}
                                className={`w-full py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${editFragile ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-gray-200 bg-white text-gray-500'}`}
                              >
                                <div className={`w-3 h-3 rounded-full ${editFragile ? 'bg-amber-500 animate-pulse' : 'bg-gray-200'}`} />
                                {editFragile ? 'Fragile' : 'Standard'}
                              </button>
                            </div>
                          </div>

                          <div className="w-full">
                            <label className="text-[10px] font-bold text-gray-500 uppercase mb-2 block">Handling Notes</label>
                            <textarea
                              placeholder="e.g. Please use a blanket, keep it upright..."
                              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold min-h-[80px] focus:ring-2 focus:ring-brand-500 transition-all"
                              value={editHandlingNotes}
                              onChange={e => setEditHandlingNotes(e.target.value)}
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex gap-2 sticky bottom-0 bg-white z-10">
                    <button onClick={closeEdit} className="w-12 h-[48px] bg-gray-100 text-gray-700 rounded-xl flex items-center justify-center hover:bg-gray-200"><ArrowLeft size={16} /></button>
                    <button
                      onClick={savePackageEdit}
                      disabled={saving || !editSubCategory}
                      className="flex-1 h-[48px] bg-gray-900 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 transition-all"
                    >
                      {saving ? <Loader2 size={16} className="animate-spin" /> : <>Confirm Cargo <ArrowRight size={16} /></>}
                    </button>
                  </div>
                </div>
              )}

              {/* ── Receiver Edit ────────────────── */}
              {editField === 'receiver' && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <input
                      type="text" placeholder="Receiver Name"
                      className="w-full px-3.5 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-brand-500 text-sm font-bold transition-all"
                      value={editReceiverName} onChange={e => setEditReceiverName(e.target.value)}
                    />
                    <input
                      type="tel" placeholder="Phone Number"
                      className="w-full px-3.5 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-brand-500 text-sm font-bold transition-all"
                      value={editReceiverPhone} onChange={e => setEditReceiverPhone(e.target.value)}
                    />
                    <input
                      type="text" placeholder="Recipient ID Number"
                      className="w-full px-3.5 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-brand-500 text-sm font-bold transition-all"
                      value={editReceiverId} onChange={e => setEditReceiverId(e.target.value)}
                    />
                  </div>

                  <div className="flex gap-2 sticky bottom-0 bg-white z-10">
                    <button onClick={closeEdit} className="w-12 h-[48px] bg-gray-100 text-gray-700 rounded-xl flex items-center justify-center hover:bg-gray-200"><ArrowLeft size={16} /></button>
                    <button
                      onClick={saveReceiverEdit}
                      disabled={saving || !editReceiverName.trim() || !editReceiverPhone.trim() || !editReceiverId.trim()}
                      className="flex-1 h-[48px] bg-gray-900 text-white rounded-xl text-sm font-bold flex items-center gap-1.5 justify-center disabled:opacity-50"
                    >
                      {saving ? <Loader2 size={16} className="animate-spin" /> : <>Confirm Receiver <ArrowRight size={16} /></>}
                    </button>
                  </div>
                </div>
              )}

              {/* ── Vehicle / Service Edit ───────────────── */}
              {editField === 'vehicle' && (
                <div className="space-y-4">
                  {/* Service Type Toggle */}
                  <div className="grid grid-cols-2 gap-2 px-0.5 pt-1">
                    {[
                      { id: 'Standard', label: '📦 Standard', desc: 'Consolidated & affordable', accent: 'brand' },
                      { id: 'Express', label: '⚡ Express', desc: 'Dedicated vehicle, fast', accent: 'orange' }
                    ].map(svc => (
                      <button
                        key={svc.id}
                        onClick={() => { setEditServiceType(svc.id); if (svc.id === 'Standard') setEditVehicle(''); }}
                        className={`text-left p-3 rounded-xl border-2 transition-all ${editServiceType === svc.id
                          ? svc.accent === 'orange'
                            ? 'border-orange-500 bg-orange-50 ring-1 ring-orange-500'
                            : 'border-brand-500 bg-brand-50 ring-1 ring-brand-500'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                      >
                        <div className={`text-sm font-bold ${editServiceType === svc.id
                          ? svc.accent === 'orange' ? 'text-orange-700' : 'text-brand-700'
                          : 'text-gray-700'
                          }`}>{svc.label}</div>
                        <div className={`text-[10px] mt-0.5 ${editServiceType === svc.id
                          ? svc.accent === 'orange' ? 'text-orange-600' : 'text-brand-600'
                          : 'text-gray-400'
                          }`}>{svc.desc}</div>
                      </button>
                    ))}
                  </div>

                  {/* Vehicle Grid - Only for Express */}
                  <AnimatePresence>
                    {editServiceType !== 'Standard' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="relative">
                          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 pt-0.5 px-0.5">
                            {VEHICLES.map(v => (
                              <button
                                key={v.id}
                                onClick={() => setEditVehicle(v.id)}
                                className={`flex-shrink-0 w-[80px] p-2 rounded-[1rem] border flex flex-col items-center text-center transition-all duration-200 ${editVehicle === v.id ? `border-gray-300 ${v.bgLight} shadow-sm ring-1 ring-gray-300 scale-[1.02]` : 'border-gray-200 bg-white hover:border-gray-300 scale-100'}`}
                              >
                                <img src={v.img} alt={v.label} className="w-10 h-10 object-contain mb-0.5" />
                                <div className="font-bold text-[11px] leading-tight text-gray-900 line-clamp-1">{v.label}</div>
                                <div className="text-[9px] font-medium text-gray-500 mt-0.5">≤ {v.maxWeight >= 1000 ? `${v.maxWeight / 1000}T` : `${v.maxWeight}kg`}</div>
                              </button>
                            ))}
                          </div>
                          {/* Scroll fade hint */}
                          {VEHICLES.length > 3 && (
                            <div className="pointer-events-none absolute right-0 top-0 bottom-2 w-10 bg-gradient-to-l from-white to-transparent" />
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Need Helpers? Toggle */}
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-600">
                        <Users size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-900">Need Loaders?</h4>
                        <p className="text-[10px] text-gray-500">+KES 500 per helper</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditHelpersCount(Math.max(0, editHelpersCount - 1))}
                        className="w-8 h-8 rounded-full bg-white border border-gray-200 font-bold text-gray-700 hover:bg-gray-100 flex items-center justify-center"
                      >-</button>
                      <span className="font-bold text-sm w-4 text-center">{editHelpersCount}</span>
                      <button
                        onClick={() => setEditHelpersCount(editHelpersCount + 1)}
                        className="w-8 h-8 rounded-full bg-white border border-gray-200 font-bold text-gray-700 hover:bg-gray-100 flex items-center justify-center"
                      >+</button>
                    </div>
                  </div>

                  <div className="flex gap-2 sticky bottom-0 bg-white z-10">
                    <button onClick={closeEdit} className="w-12 h-[48px] bg-gray-100 text-gray-700 rounded-xl flex items-center justify-center hover:bg-gray-200"><ArrowLeft size={16} /></button>
                    <button
                      onClick={saveVehicleEdit}
                      disabled={saving || (editServiceType === 'Express' && !editVehicle)}
                      className="flex-1 h-[48px] bg-gray-900 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {saving ? <Loader2 size={16} className="animate-spin" /> : <>{editServiceType === 'Standard' ? 'Confirm Service' : 'Confirm Vehicle'} <ArrowRight size={16} /></>}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Tracking;
