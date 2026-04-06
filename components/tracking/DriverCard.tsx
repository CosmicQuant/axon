import React from 'react';
import { Phone, Star, Navigation2, Search } from 'lucide-react';
import { Driver } from '../../types';

interface DriverCardProps {
  driver?: Driver;
  status: string;
  vehicleType?: string;
  onFocusDriver?: () => void;
  onShare?: () => void;
}

export const DriverCard: React.FC<DriverCardProps> = ({ driver, status, vehicleType, onFocusDriver, onShare }) => {
  if (!driver || status === 'pending') return (
    <div className="bg-brand-600 rounded-xl p-3.5 shadow-md shadow-brand-100 relative overflow-hidden">
      <div className="relative z-10 flex items-center gap-3">
        <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm shrink-0">
          <Search className="text-white animate-spin-slow" size={18} />
        </div>
        <div className="flex-1 text-left min-w-0">
          <h4 className="text-white font-black text-xs tracking-tight uppercase">Finding your Axon Pro</h4>
          <p className="text-brand-100 text-[8px] font-bold uppercase tracking-widest mt-0.5">
            Matching with nearest driver...
          </p>
        </div>
        <div className="flex gap-1">
          {[1, 2, 3].map(i => (
            <div key={i} className="w-1 h-1 bg-white/40 rounded-full animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-xl p-3.5 shadow-sm border border-gray-100 relative overflow-hidden">
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="relative flex-shrink-0">
            <img
              src={driver.avatar || 'https://via.placeholder.com/150'}
              className="w-12 h-12 rounded-xl object-cover border-2 border-brand-50 shadow-sm"
              alt={driver.name}
            />
            <div className="absolute -bottom-0.5 -right-0.5 bg-emerald-500 w-3 h-3 rounded-full border-2 border-white" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h4 className="text-sm font-black text-gray-900 truncate">{driver.name}</h4>
              <div className="flex items-center gap-0.5 bg-brand-50 px-1.5 py-0.5 rounded text-brand-600 flex-shrink-0">
                <Star size={9} className="fill-brand-600" />
                <span className="text-[9px] font-black">{driver.rating || '5.0'}</span>
              </div>
            </div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mt-0.5 truncate">
              {driver.plate} · <span className="text-brand-600">{vehicleType || 'Vehicle'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
          <button
            onClick={onFocusDriver}
            className="w-10 h-10 rounded-xl bg-gray-100 text-brand-600 flex items-center justify-center active:scale-90 transition-all hover:bg-brand-50"
            title="Locate Driver"
          >
            <Navigation2 size={16} className="fill-current" />
          </button>
          <a
            href={`tel:${driver.phone}`}
            className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center shadow-lg shadow-brand-200 active:scale-90 transition-all"
          >
            <Phone size={16} />
          </a>
        </div>
      </div>
    </div>
  );
};
