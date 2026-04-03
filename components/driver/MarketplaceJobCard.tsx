import React from 'react';
import { MapPin, ArrowRight, Truck, Package, Clock, ShieldCheck } from 'lucide-react';
import { DeliveryOrder } from '../../types';
import { SlideToAccept } from './SlideToAccept';

interface MarketplaceJobCardProps {
  order: DeliveryOrder;
  onAccept: (order: DeliveryOrder) => Promise<void>;
  disabled?: boolean;
}

export const MarketplaceJobCard: React.FC<MarketplaceJobCardProps> = ({ order, onAccept, disabled }) => {
  return (
    <div className={`bg-white rounded-[2rem] p-6 border transition-all shadow-sm ${
      disabled ? 'opacity-50 grayscale' : 'hover:border-brand-200 hover:shadow-md'
    }`}>
      {/* Header: Earnings & ID */}
      <div className="flex justify-between items-start mb-6">
        <div>
           <div className="flex items-center gap-2 mb-1.5">
             <span className="px-2 py-0.5 rounded bg-brand-50 text-brand-600 text-[10px] font-black uppercase tracking-widest">New Request</span>
             <span className="text-[10px] font-mono text-gray-400">#{order.id.substring(0,8)}</span>
           </div>
           <h4 className="text-xl font-black text-gray-900 line-clamp-1">{order.items?.itemDesc || 'Standard Delivery'}</h4>
        </div>
        <div className="text-right">
           <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Your Payout</p>
           <p className="text-2xl font-black text-brand-600 leading-none">KES {order.driverRate?.toLocaleString() || '---'}</p>
        </div>
      </div>

      {/* Route: Visual Flow */}
      <div className="relative space-y-6 mb-8 pl-4 border-l-2 border-dashed border-gray-100 ml-1">
        <div className="relative">
          <div className="absolute -left-[1.35rem] top-1 w-4 h-4 rounded-full bg-emerald-500 border-4 border-white shadow-sm" />
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Pickup</p>
          <p className="text-sm font-bold text-gray-700 line-clamp-1">{order.pickup}</p>
        </div>
        <div className="relative">
          <div className="absolute -left-[1.35rem] top-1 w-4 h-4 rounded-full bg-red-500 border-4 border-white shadow-sm" />
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Dropoff</p>
          <p className="text-sm font-bold text-gray-700 line-clamp-1">{order.dropoff}</p>
        </div>
      </div>

      {/* Quick Specs */}
      <div className="grid grid-cols-3 gap-2 mb-8">
        <div className="bg-gray-50 rounded-2xl p-3 text-center">
          <Clock size={16} className="mx-auto mb-1 text-gray-400" />
          <p className="text-[9px] font-bold text-gray-500 uppercase tracking-tighter">{order.estimatedDuration || '30 mins'}</p>
        </div>
        <div className="bg-gray-50 rounded-2xl p-3 text-center">
          <Truck size={16} className="mx-auto mb-1 text-gray-400" />
          <p className="text-[9px] font-bold text-gray-500 uppercase tracking-tighter">{order.vehicle}</p>
        </div>
        <div className="bg-gray-50 rounded-2xl p-3 text-center">
          <ShieldCheck size={16} className="mx-auto mb-1 text-emerald-500" />
          <p className="text-[9px] font-bold text-gray-500 uppercase tracking-tighter">Insured</p>
        </div>
      </div>

      {/* Slide to Accept Action */}
      <SlideToAccept 
        onAccept={() => onAccept(order)} 
        disabled={disabled} 
      />
    </div>
  );
};
