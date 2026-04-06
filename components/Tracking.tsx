import React, { useEffect, useState } from 'react';
import type { DeliveryOrder, Driver, RouteStop } from '../types';
import { ChevronUp, ArrowRight, Share2, ShieldAlert, Copy, Check, Phone, X, Loader2, MapPin, Pencil, Trash2, ChevronDown } from 'lucide-react';
import { useMapState } from '@/context/MapContext';
import { DriverCard } from './tracking/DriverCard';
import { JourneyTimeline } from './tracking/JourneyTimeline';
import { PostDelivery } from './tracking/PostDelivery';
import { motion, AnimatePresence } from 'framer-motion';

interface TrackingProps {
  order: DeliveryOrder;
  onUpdateStatus: (orderId: string, status: DeliveryOrder['status'], driverDetails?: Driver) => void;
  onUpdateOrder: (orderId: string, updates: Partial<DeliveryOrder>) => void;
  onBack: () => void;
}

const Tracking: React.FC<TrackingProps> = ({ order, onUpdateStatus, onUpdateOrder, onBack }) => {
  const { pickupCoords, dropoffCoords, fitBounds } = useMapState();

  const [isCollapsed, setIsCollapsed] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [editField, setEditField] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({ receiverName: '', receiverPhone: '', itemDesc: '' });
  const [saving, setSaving] = useState(false);
  const [routeExpanded, setRouteExpanded] = useState(false);
  const [editingStopId, setEditingStopId] = useState<string | null>(null);
  const [editStopAddress, setEditStopAddress] = useState('');
  const [editDropoffAddress, setEditDropoffAddress] = useState('');
  const [editPickupAddress, setEditPickupAddress] = useState('');

  const isPending = order.status === 'pending';
  const isAssigned = order.status === 'driver_assigned';
  const isInTransit = order.status === 'in_transit';
  const isDelivered = order.status === 'delivered';

  // ── Editability logic ──────────────────────────────────
  // A stop is editable if the driver hasn't started delivery to it
  const canEditStop = (stop: RouteStop): boolean => {
    if (isPending) return true; // all editable before driver assigned
    if (isDelivered) return false;
    // Assigned or in-transit: only stops still pending
    return stop.status === 'pending';
  };

  const canEditPickup = (): boolean => {
    return isPending; // pickup only editable before driver assigned
  };

  const canEditDropoff = (): boolean => {
    if (isPending) return true;
    if (isAssigned) return true; // driver heading to pickup, dropoff can still change
    if (isInTransit) {
      // Dropoff editable if it's still pending in stops
      const dropoffStop = order.stops?.find(s => s.type === 'dropoff');
      return !dropoffStop || dropoffStop.status === 'pending';
    }
    return false;
  };

  const canEditField = (field: string) => {
    if (isPending) return true;
    if (isAssigned && (field === 'items' || field === 'receiver')) return true;
    return false;
  };

  const canRemoveStop = (stop: RouteStop): boolean => {
    if (stop.type === 'dropoff') return false; // can't remove final dropoff
    return canEditStop(stop);
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

  // ── Stop editing handlers ──────────────────────────────
  const handleEditStop = (stop: RouteStop) => {
    if (!canEditStop(stop)) return;
    setEditingStopId(stop.id);
    setEditStopAddress(stop.address);
    setEditField('stop');
  };

  const handleEditPickup = () => {
    if (!canEditPickup()) return;
    setEditPickupAddress(order.pickup);
    setEditField('pickup');
  };

  const handleEditDropoff = () => {
    if (!canEditDropoff()) return;
    setEditDropoffAddress(order.dropoff);
    setEditField('dropoff');
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
    } catch (e) {
      console.error('Failed to remove stop:', e);
    }
    setSaving(false);
  };

  const saveStopEdit = async () => {
    if (!editingStopId || !editStopAddress.trim()) return;
    setSaving(true);
    try {
      const updatedStops = (order.stops || []).map(s =>
        s.id === editingStopId ? { ...s, address: editStopAddress.trim() } : s
      );
      await onUpdateOrder(order.id, { stops: updatedStops } as any);
    } catch (e) {
      console.error('Failed to update stop:', e);
    }
    setSaving(false);
    setEditField(null);
    setEditingStopId(null);
  };

  const savePickupEdit = async () => {
    if (!editPickupAddress.trim()) return;
    setSaving(true);
    try {
      await onUpdateOrder(order.id, { pickup: editPickupAddress.trim() });
    } catch (e) {
      console.error('Failed to update pickup:', e);
    }
    setSaving(false);
    setEditField(null);
  };

  const saveDropoffEdit = async () => {
    if (!editDropoffAddress.trim()) return;
    setSaving(true);
    try {
      const updates: any = { dropoff: editDropoffAddress.trim() };
      // Also update the dropoff stop address if it exists in stops array
      const dropoffStop = order.stops?.find(s => s.type === 'dropoff');
      if (dropoffStop) {
        const updatedStops = (order.stops || []).map(s =>
          s.type === 'dropoff' ? { ...s, address: editDropoffAddress.trim() } : s
        );
        updates.stops = updatedStops;
      }
      await onUpdateOrder(order.id, updates);
    } catch (e) {
      console.error('Failed to update dropoff:', e);
    }
    setSaving(false);
    setEditField(null);
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

  const saveFieldEdit = async (field: string) => {
    setSaving(true);
    try {
      if (field === 'receiver') {
        await onUpdateOrder(order.id, {
          recipient: {
            ...order.recipient,
            name: editValues.receiverName || order.recipient?.name,
            phone: editValues.receiverPhone || order.recipient?.phone,
          }
        } as any);
      } else if (field === 'items') {
        await onUpdateOrder(order.id, {
          items: { ...order.items, itemDesc: editValues.itemDesc || order.items?.itemDesc }
        } as any);
      }
    } catch (e) {
      console.error('Failed to update:', e);
    }
    setSaving(false);
    setEditField(null);
  };

  const startFieldEdit = (field: string) => {
    if (!canEditField(field)) return;
    setEditValues({
      receiverName: order.recipient?.name || '',
      receiverPhone: order.recipient?.phone || '',
      itemDesc: order.items?.itemDesc || '',
    });
    setEditField(field);
  };

  const handleCancel = async () => {
    if (!isPending) return;
    if (confirm('Cancel this order? This cannot be undone.')) {
      await onUpdateStatus(order.id, 'cancelled');
    }
  };

  // ── Helpers for route display ──────────────────────────
  const getStopStatusBadge = (stop: RouteStop) => {
    if (stop.status === 'completed') return { text: 'Done', color: 'bg-emerald-100 text-emerald-700' };
    if (stop.status === 'arrived') return { text: 'Arrived', color: 'bg-blue-100 text-blue-700' };
    return null; // pending — no badge needed
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
    <div className="fixed bottom-0 inset-x-0 md:inset-x-auto md:right-4 md:top-4 md:bottom-4 md:w-[400px] pointer-events-none z-[100] flex flex-col justify-end mx-auto max-w-lg md:max-w-none md:mx-0">
      <div
        className={`w-full bg-white shadow-[0_-15px_40px_rgba(0,0,0,0.12)] md:shadow-2xl rounded-t-[2.5rem] md:rounded-2xl overflow-hidden pointer-events-auto border-t border-gray-100 md:border flex flex-col pb-[env(safe-area-inset-bottom,0)] transition-all duration-300 ${isCollapsed ? 'max-h-[180px]' : 'max-h-[90vh] md:max-h-[calc(100vh-2rem)]'}`}
      >
        {/* ── Header / collapsed bar ────────────────────────── */}
        <div
          className="px-5 pt-3 pb-3 flex flex-col items-center w-full z-10 bg-white flex-shrink-0 cursor-pointer"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <div className="w-12 h-1 bg-gray-200 rounded-full mb-3 md:hidden" />
          <div className="w-full flex items-center justify-between">
            <div className="flex-1 min-w-0 pr-3">
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-2 h-2 rounded-full animate-pulse ${getStatusColor()}`} />
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{getStatusText()}</span>
              </div>
              <div className="text-sm font-black text-gray-900 truncate flex items-center gap-1.5">
                {order.pickup.split(',')[0]}
                <ArrowRight size={12} className="text-gray-300 flex-shrink-0" />
                {order.dropoff.split(',')[0]}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-base font-black text-gray-900">
                {etaMinutes ? `${etaMinutes} min` : '--'}
              </div>
              <div className="text-[8px] font-bold text-gray-400 uppercase">ETA</div>
            </div>
            <ChevronUp className={`ml-3 w-5 h-5 text-gray-400 transition-transform duration-300 ${!isCollapsed ? 'rotate-180' : ''}`} />
          </div>
        </div>

        {/* ── Expanded content ──────────────────────────────── */}
        <div className={`px-5 pb-4 space-y-3 overflow-y-auto no-scrollbar flex-1 ${isCollapsed ? 'hidden' : ''}`}>

          {/* Driver Card */}
          <DriverCard
            driver={order.driver}
            status={order.status}
            vehicleType={order.vehicle}
            onFocusDriver={handleFocusDriver}
            onShare={handleShare}
          />

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

          {/* Journey Timeline */}
          <JourneyTimeline
            status={order.status}
            stops={order.stops}
            pickup={order.pickup}
            dropoff={order.dropoff}
            etaMinutes={etaMinutes}
          />

          {/* ── Route Card (Expandable + Editable) ──────────── */}
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
              <div className="flex items-center gap-1 flex-shrink-0">
                {hasEditableRoute && (
                  <span className="text-[8px] font-black text-emerald-500 uppercase">Edit</span>
                )}
                <ChevronDown size={14} className={`text-emerald-400 transition-transform ${routeExpanded ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {/* Expanded route stops */}
            {routeExpanded && (
              <div className="px-3 pb-3 space-y-0">
                {/* Pickup */}
                <div className="flex items-center gap-2 py-2 border-t border-emerald-200/40">
                  <div className="w-5 flex justify-center flex-shrink-0">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-emerald-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[8px] font-black text-emerald-500 uppercase tracking-wider">Pickup</div>
                    <div className="text-[11px] font-bold text-gray-900 truncate">{order.pickup}</div>
                  </div>
                  {canEditPickup() && (
                    <button onClick={handleEditPickup} className="p-1.5 rounded-lg hover:bg-emerald-100 transition-colors flex-shrink-0">
                      <Pencil size={12} className="text-emerald-500" />
                    </button>
                  )}
                </div>

                {/* Waypoints (intermediate stops) */}
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
                          {badge && (
                            <span className={`text-[7px] font-black px-1 py-0.5 rounded ${badge.color}`}>{badge.text}</span>
                          )}
                          {stop.verificationCode && stop.status !== 'completed' && (
                            <span className="text-[7px] font-mono font-bold text-gray-400">PIN: {stop.verificationCode}</span>
                          )}
                        </div>
                        <div className="text-[11px] font-bold text-gray-900 truncate">{stop.address}</div>
                      </div>
                      {editable && (
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          <button onClick={() => handleEditStop(stop)} className="p-1.5 rounded-lg hover:bg-emerald-100 transition-colors">
                            <Pencil size={11} className="text-emerald-500" />
                          </button>
                          {removable && (
                            <button onClick={() => handleRemoveStop(stop.id)} className="p-1.5 rounded-lg hover:bg-red-100 transition-colors">
                              <Trash2 size={11} className="text-red-400" />
                            </button>
                          )}
                        </div>
                      )}
                      {!editable && (
                        <div className="text-[8px] font-bold text-gray-300 uppercase flex-shrink-0">Locked</div>
                      )}
                    </div>
                  );
                })}

                {/* Dropoff */}
                <div className="flex items-center gap-2 py-2 border-t border-emerald-200/40">
                  <div className="w-5 flex justify-center flex-shrink-0">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-red-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[8px] font-black text-red-500 uppercase tracking-wider">Dropoff</div>
                    <div className="text-[11px] font-bold text-gray-900 truncate">{order.dropoff}</div>
                  </div>
                  {canEditDropoff() && (
                    <button onClick={handleEditDropoff} className="p-1.5 rounded-lg hover:bg-emerald-100 transition-colors flex-shrink-0">
                      <Pencil size={12} className="text-emerald-500" />
                    </button>
                  )}
                  {!canEditDropoff() && !isPending && (
                    <div className="text-[8px] font-bold text-gray-300 uppercase flex-shrink-0">Locked</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Order Summary Cards */}
          <div className="space-y-1.5">
            {/* Package + Vehicle */}
            <div className="flex gap-1.5">
              <button
                onClick={() => startFieldEdit('items')}
                className={`flex-1 flex items-center justify-between px-3 py-2.5 rounded-xl bg-blue-50 border transition-colors text-left ${canEditField('items') ? 'border-blue-300 hover:bg-blue-100/70 cursor-pointer' : 'border-blue-200/60 cursor-default'}`}
              >
                <div className="min-w-0">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-blue-400">Package</div>
                  <div className="text-xs font-bold text-gray-900 truncate">{order.items?.itemDesc || 'Package'}</div>
                </div>
                {canEditField('items') && <Pencil size={11} className="text-blue-400 flex-shrink-0" />}
              </button>
              <div className="flex-1 flex items-center justify-between px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200/60">
                <div className="min-w-0">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-amber-500">Vehicle</div>
                  <div className="text-xs font-bold text-gray-900 truncate">{order.vehicle}</div>
                </div>
              </div>
            </div>

            {/* Receiver */}
            <button
              onClick={() => startFieldEdit('receiver')}
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

            {/* Payment + Order ID */}
            <div className="flex gap-1.5">
              <div className="flex-1 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200/60">
                <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Payment</div>
                <div className="text-xs font-bold text-gray-900">{order.paymentMethod} · KES {order.price?.toLocaleString()}</div>
              </div>
              <div className="flex-1 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200/60">
                <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Order</div>
                <div className="text-xs font-mono font-bold text-gray-500">#{order.id.substring(0, 8)}</div>
              </div>
            </div>
          </div>

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
            <button
              className="flex items-center justify-center gap-2 py-3 px-4 bg-red-50 border border-red-100 rounded-xl text-xs font-bold text-red-600 hover:bg-red-100 active:scale-95 transition-all"
            >
              <ShieldAlert size={14} /> SOS
            </button>
          </div>

          {/* Cancel (pending only) */}
          {isPending && (
            <button
              onClick={handleCancel}
              className="w-full py-3 text-xs font-bold text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
            >
              Cancel Order
            </button>
          )}

          {/* Back */}
          <button
            onClick={onBack}
            className="w-full py-2 text-[10px] font-bold text-gray-400 hover:text-gray-600 uppercase tracking-widest"
          >
            Back to Dashboard
          </button>
        </div>
      </div>

      {/* ── Inline Edit Modal ──────────────────────────────── */}
      <AnimatePresence>
        {editField && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-end md:items-center justify-center pointer-events-auto"
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setEditField(null); setEditingStopId(null); }} />
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="relative bg-white rounded-t-2xl md:rounded-2xl p-5 w-full max-w-md mx-auto md:mx-0 space-y-3 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-black text-gray-900">
                  {editField === 'receiver' ? 'Edit Receiver'
                    : editField === 'items' ? 'Edit Package'
                      : editField === 'stop' ? `Edit Stop`
                        : editField === 'pickup' ? 'Edit Pickup'
                          : 'Edit Dropoff'}
                </h3>
                <button onClick={() => { setEditField(null); setEditingStopId(null); }} className="p-1.5 rounded-lg hover:bg-gray-100">
                  <X size={16} className="text-gray-400" />
                </button>
              </div>

              {editField === 'receiver' && (
                <>
                  <input
                    type="text"
                    placeholder="Receiver Name"
                    className="w-full px-3.5 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-brand-500 text-sm font-bold transition-all"
                    value={editValues.receiverName}
                    onChange={e => setEditValues(v => ({ ...v, receiverName: e.target.value }))}
                  />
                  <input
                    type="tel"
                    placeholder="Phone Number"
                    className="w-full px-3.5 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-brand-500 text-sm font-bold transition-all"
                    value={editValues.receiverPhone}
                    onChange={e => setEditValues(v => ({ ...v, receiverPhone: e.target.value }))}
                  />
                </>
              )}

              {editField === 'items' && (
                <input
                  type="text"
                  placeholder="Item Description"
                  className="w-full px-3.5 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-brand-500 text-sm font-bold transition-all"
                  value={editValues.itemDesc}
                  onChange={e => setEditValues(v => ({ ...v, itemDesc: e.target.value }))}
                />
              )}

              {editField === 'stop' && (
                <input
                  type="text"
                  placeholder="Stop Address"
                  className="w-full px-3.5 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-brand-500 text-sm font-bold transition-all"
                  value={editStopAddress}
                  onChange={e => setEditStopAddress(e.target.value)}
                />
              )}

              {editField === 'pickup' && (
                <input
                  type="text"
                  placeholder="Pickup Address"
                  className="w-full px-3.5 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-brand-500 text-sm font-bold transition-all"
                  value={editPickupAddress}
                  onChange={e => setEditPickupAddress(e.target.value)}
                />
              )}

              {editField === 'dropoff' && (
                <input
                  type="text"
                  placeholder="Dropoff Address"
                  className="w-full px-3.5 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-brand-500 text-sm font-bold transition-all"
                  value={editDropoffAddress}
                  onChange={e => setEditDropoffAddress(e.target.value)}
                />
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => { setEditField(null); setEditingStopId(null); }}
                  className="flex-1 h-[44px] bg-gray-100 text-gray-700 rounded-xl text-sm font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (editField === 'stop') saveStopEdit();
                    else if (editField === 'pickup') savePickupEdit();
                    else if (editField === 'dropoff') saveDropoffEdit();
                    else if (editField) saveFieldEdit(editField);
                  }}
                  disabled={saving}
                  className="flex-1 h-[44px] bg-gray-900 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : 'Save'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Tracking;
