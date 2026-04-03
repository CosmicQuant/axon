import React from 'react';
import { Phone, MessageSquare, Star, ShieldCheck, Navigation2, Share2, Search } from 'lucide-react';
import { Driver } from '../../types';

interface DriverCardProps {
  driver?: Driver;
  status: string;
  onFocusDriver?: () => void;
  onShare?: () => void;
}

export const DriverCard: React.FC<DriverCardProps> = ({ driver, status, onFocusDriver, onShare }) => {
  if (!driver || status === 'pending') return (
    <div className="bg-brand-600 rounded-[1.5rem] p-4 shadow-md shadow-brand-100 relative overflow-hidden group">
      <div className="relative z-10 flex items-center gap-4">
        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm shrink-0">
          <Search className="text-white animate-spin-slow" size={20} />
        </div>
        <div className="flex-1 text-left">
          <h4 className="text-white font-black text-xs tracking-tight uppercase">Finding your Axon Pro</h4>
          <p className="text-brand-100 text-[8px] font-bold uppercase tracking-widest mt-0.5">
            Matching with nearest driver...
          </p>
        </div>
        <div className="flex gap-1">
          {[1,2,3].map(i => (
            <div key={i} className="w-1 h-1 bg-white/40 rounded-full animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-gray-100 relative overflow-hidden group">
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-4">
          <div className="relative">
            <img 
              src={driver.avatar || 'https://via.placeholder.com/150'} 
              className="w-16 h-16 rounded-2xl object-cover border-2 border-brand-50 shadow-sm"
              alt={driver.name}
            />
            <div className="absolute -bottom-1 -right-1 bg-emerald-500 w-4 h-4 rounded-full border-2 border-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-lg font-black text-gray-900">{driver.name}</h4>
              <div className="flex items-center gap-0.5 bg-brand-50 px-1.5 py-0.5 rounded text-brand-600">
                <Star size={10} className="fill-brand-600" />
                <span className="text-[10px] font-black">{driver.rating || '5.0'}</span>
              </div>
            </div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-0.5">
              {driver.plate} • <span className="text-brand-600">Boda Boda</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={onFocusDriver}
            className="w-12 h-12 rounded-2xl bg-gray-100 text-brand-600 flex items-center justify-center active:scale-90 transition-all hover:bg-brand-50"
            title="Locate Driver"
          >
            <Navigation2 size={20} className="fill-current" />
          </button>
          <a 
            href={`tel:${driver.phone}`}
            className="w-12 h-12 rounded-2xl bg-brand-600 text-white flex items-center justify-center shadow-lg shadow-brand-200 active:scale-90 transition-all"
          >
            <Phone size={20} />
          </a>
        </div>
      </div>
      
      {/* Action Buttons & Verification */}
      <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-emerald-600">
            <ShieldCheck size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">Verified Pro</span>
          </div>
          <button 
            onClick={onShare}
            className="flex items-center gap-1.5 text-gray-400 hover:text-brand-600 transition-colors"
          >
            <Share2 size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">Share</span>
          </button>
        </div>
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">AXN-{driver.id?.substring(0,4)}</span>
      </div>
    </div>
  );
};
