import React, { useEffect, useRef, useState } from 'react';
import type { DeliveryOrder, Driver } from '../types';
import { VehicleType, ServiceType } from '../types';
import { Map, MapPin, Navigation, ChevronUp, ArrowRight, Share2, ShieldAlert, Edit3, Loader2, X } from 'lucide-react';
import { useMapState } from '@/context/MapContext';
import { mapService } from '@/services/mapService';
import { useAuth } from '@/context/AuthContext';
import { DriverCard } from './tracking/DriverCard';
import { JourneyTimeline } from './tracking/JourneyTimeline';
import { PostDelivery } from './tracking/PostDelivery';
import BookingWizard from './booking/BookingWizard';

interface TrackingProps {
  order: DeliveryOrder;
  onUpdateStatus: (orderId: string, status: DeliveryOrder['status'], driverDetails?: Driver) => void;
  onUpdateOrder: (orderId: string, updates: Partial<DeliveryOrder>) => void;
  onBack: () => void;
}

const Tracking: React.FC<TrackingProps> = ({ order, onUpdateStatus, onUpdateOrder, onBack }) => {
  const { user } = useAuth();
  const {
    pickupCoords, dropoffCoords, setOrderState, isMapSelecting,
    setIsMapSelecting, activeInput, setMapCenter, waypointCoords
  } = useMapState();

  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const dragStartY = useRef<number | null>(null);

  // Sync Map State
  useEffect(() => {
    setOrderState('IN_TRANSIT');
    return () => setOrderState('IDLE');
  }, [setOrderState]);

  // Status helper for Informational Message
  const getInformationalMessage = () => {
    switch (order.status) {
      case 'pending':
        return 'Finding your driver...';
      case 'driver_assigned':
        return 'Driver Heading to You';
      case 'in_transit':
        return 'In Transit to Destination';
      default:
        return 'Processing Order';
    }
  };

  // Check if specific fields can be edited based on status
  const canEditField = (field: 'items' | 'pickup' | 'dropoff') => {
    if (order.status === 'pending') return true;
    if (order.status === 'driver_assigned') {
      return field === 'items'; // Can only edit package details once driver is assigned
    }
    return false; // No edits allowed once in transit
  };

  // Handle Share Tracking
  const handleShare = () => {
    const url = `https://axon-8b0a8.web.app/track/${order.id}`;
    if (navigator.share) {
      navigator.share({ title: 'Track my Axon Delivery', url });
    } else {
      navigator.clipboard.writeText(url);
      alert("Tracking link copied to clipboard!");
    }
  };

  // Transform order to prefill format for BookingWizard
  const getPrefillData = () => {
    return {
      pickup: order.pickup,
      dropoff: order.dropoff,
      pickupCoords: order.pickupCoords,
      dropoffCoords: order.dropoffCoords,
      vehicle: order.vehicle,
      serviceType: order.serviceType,
      category: 'A', // Default to A for edit
      items: order.items
    };
  };

  // If status is delivered, show Post-Delivery directly
  if (order.status === 'delivered') {
    return (
      <div className="absolute inset-x-0 bottom-0 p-6 pointer-events-none">
        <div className="pointer-events-auto w-full max-lg mx-auto">
          <PostDelivery 
            orderId={order.id} 
            driverName={order.driver?.name} 
            onComplete={onBack} 
          />
        </div>
      </div>
    );
  }

  // If editing, show the BookingWizard in edit mode
  if (isEditing) {
    return (
      <div className="absolute inset-0 z-[100] pointer-events-none flex flex-col justify-end">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto" onClick={() => setIsEditing(false)} />
        <div className="relative pointer-events-auto">
          <button 
            onClick={() => setIsEditing(false)}
            className="absolute top-4 right-6 z-[110] w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg text-gray-500"
          >
            <X size={20} />
          </button>
          <BookingWizard 
            prefillData={getPrefillData()} 
            onOrderComplete={(updates) => {
              onUpdateOrder(order.id, updates);
              setIsEditing(false);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-x-0 bottom-0 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-2xl mx-auto md:px-6">
        
        {/* Modern Bottom Sheet */}
        <div
          className={`bg-white/95 backdrop-blur-xl rounded-t-[2.5rem] md:rounded-t-3xl shadow-[0_-8px_40px_rgba(0,0,0,0.15)] border-t border-gray-100 overflow-hidden transition-all duration-500 transform pb-[env(safe-area-inset-bottom,0px)] ${
            isCollapsed ? 'max-h-[160px]' : 'max-h-[85vh] overflow-y-auto no-scrollbar'
          }`}
        >
          {/* Draggable Header */}
          <div
            className="w-full flex flex-col items-center py-4 cursor-grab active:cursor-grabbing group sticky top-0 bg-white/50 backdrop-blur-md z-20 border-b border-gray-50"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            <div className="w-12 h-1.5 bg-gray-200 rounded-full group-hover:bg-gray-300 transition-colors mb-4" />
            
            {/* Quick Status Bar (Visible when collapsed) */}
            <div className="w-full px-8 flex items-center justify-between">
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-2 h-2 rounded-full animate-pulse ${order.status === 'pending' ? 'bg-amber-500' : 'bg-brand-600'}`} />
                  <span className={`text-[10px] font-black uppercase tracking-widest ${order.status === 'pending' ? 'text-amber-600' : 'text-brand-600'}`}>
                    {getInformationalMessage()}
                  </span>
                </div>
                <h3 className="text-gray-900 font-black truncate text-sm flex items-center gap-2">
                   {order.pickup.split(',')[0]} <ArrowRight size={14} className="text-gray-400" /> {order.dropoff.split(',')[0]}
                </h3>
              </div>
              <div className="text-right">
                <div className="text-xs font-black text-gray-900 leading-none">
                  {order.status === 'pending' ? '--' : (order.remainingDuration ? `${Math.ceil(order.remainingDuration / 60)} mins` : '12 mins')}
                </div>
                <div className="text-[8px] font-bold text-gray-400 uppercase mt-1">Arrival</div>
              </div>
              <ChevronUp className={`ml-4 w-5 h-5 text-brand-600 transition-transform duration-500 ${!isCollapsed ? 'rotate-180' : ''}`} />
            </div>
          </div>

          {/* Expanded Content */}
          <div className="px-8 py-6 space-y-6">
            
            {/* 1. Driver Profile Section */}
            <DriverCard 
              driver={order.driver} 
              status={order.status} 
              onFocusDriver={() => {/* Implement map focus logic */}}
              onShare={handleShare}
            />

            {/* 2. Live Journey Timeline */}
            <JourneyTimeline 
              status={order.status} 
              stops={order.stops} 
              pickup={order.pickup}
              estimatedDuration={order.remainingDuration ? `${Math.ceil(order.remainingDuration / 60)} MINS` : undefined}
            />

            {/* 3. Package & Service Details Summary */}
            <div className="bg-gray-50 rounded-[2rem] p-6 border border-gray-100 relative group/card">
               <div className="flex justify-between items-start mb-4">
                 <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Order Details</h5>
                 {(canEditField('items') || canEditField('pickup')) && (
                   <button 
                     onClick={() => setIsEditing(!isEditing)}
                     className="flex items-center gap-1 text-[10px] font-black text-brand-600 uppercase hover:bg-brand-50 px-2 py-1 rounded-lg transition-colors"
                   >
                     <Edit3 size={12} /> {isEditing ? 'Cancel' : 'Edit'}
                   </button>
                 )}
               </div>

               {/* Details Grid removed since we implemented the Wizard Editor above */}
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Item</p>
                    <p className="text-xs font-bold text-gray-900">{order.items?.itemDesc || 'Standard Package'}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Service</p>
                    <p className="text-xs font-bold text-brand-600">{order.serviceType}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Payment</p>
                    <p className="text-xs font-bold text-gray-900">{order.paymentMethod} • KES {order.price.toLocaleString()}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Order ID</p>
                    <p className="text-xs font-mono font-bold text-gray-500">#{order.id.substring(0,8)}</p>
                  </div>
               </div>
            </div>

            {/* 4. Support & Share Actions */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button 
                onClick={handleShare}
                className="flex items-center justify-center gap-2 py-4 bg-white border border-gray-200 rounded-2xl text-xs font-black text-gray-700 hover:bg-gray-50 active:scale-95 transition-all shadow-sm"
              >
                <Share2 size={16} /> Share Live Track
              </button>
              <button className="flex items-center justify-center gap-2 py-4 bg-red-50 border border-red-100 rounded-2xl text-xs font-black text-red-600 hover:bg-red-100 active:scale-95 transition-all shadow-sm">
                <ShieldAlert size={16} /> SOS / Help
              </button>
            </div>

            {/* 5. Back Button */}
            <button 
              onClick={onBack}
              className="w-full py-4 text-xs font-black text-gray-400 hover:text-gray-600 uppercase tracking-widest"
            >
              Back to Dashboard
            </button>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Tracking;
