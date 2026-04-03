import React from 'react';
import { CheckCircle2, Circle, MapPin, Truck, PackageCheck, Zap } from 'lucide-react';
import { RouteStop } from '../../types';

interface JourneyTimelineProps {
  status: string;
  stops?: RouteStop[];
  pickup: string;
  estimatedDuration?: string;
}

export const JourneyTimeline: React.FC<JourneyTimelineProps> = ({ status, stops, pickup, estimatedDuration }) => {
  const steps = [
    { label: 'Order Placed', id: 'pending', icon: Circle },
    { label: 'Heading to Pickup', id: 'driver_assigned', icon: Truck },
    { label: 'Package Collected', id: 'collected', icon: PackageCheck },
    { label: 'Out for Delivery', id: 'in_transit', icon: MapPin },
    { label: 'Delivered', id: 'delivered', icon: CheckCircle2 },
  ];

  // Logic to determine active step index
  const statusWeight: Record<string, number> = {
    'pending': 0,
    'driver_assigned': 1,
    'collected': 2,
    'in_transit': 3,
    'delivered': 4
  };
  
  const currentStepIndex = statusWeight[status] ?? 0;

  return (
    <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Live Journey</h4>
        {(status === 'driver_assigned' || status === 'in_transit') && (
          <div className="flex items-center gap-1.5 bg-brand-50 px-2 py-1 rounded-full border border-brand-100">
            <Zap size={10} className="text-brand-600 fill-brand-600 animate-pulse" />
            <span className="text-[10px] font-black text-brand-700 uppercase tracking-tight">
              ETA: {estimatedDuration || 'Calculating...'}
            </span>
          </div>
        )}
      </div>
      
      <div className="relative">
        {/* Continuous Progress Line */}
        <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gray-100" />
        <div 
          className="absolute left-[11px] top-2 w-0.5 bg-brand-600 transition-all duration-1000 ease-in-out" 
          style={{ height: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
        />

        <div className="space-y-8">
          {steps.map((step, idx) => {
            const isCompleted = idx < currentStepIndex;
            const isActive = idx === currentStepIndex;
            const Icon = step.icon;

            return (
              <div key={step.id} className="flex items-start gap-4 relative group">
                <div className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-500 ${
                  isCompleted ? 'bg-brand-600 text-white shadow-lg shadow-brand-200' : 
                  isActive ? 'bg-white border-2 border-brand-600 text-brand-600 scale-110' : 
                  'bg-white border-2 border-gray-200 text-gray-300'
                }`}>
                  <Icon size={12} className={isActive ? 'animate-pulse' : ''} />
                </div>
                
                <div className="flex-1 -mt-1">
                  <div className="flex items-center gap-2">
                    <p className={`text-xs font-black uppercase tracking-tight ${
                      isActive ? 'text-gray-900' : 'text-gray-400'
                    }`}>
                      {step.label}
                    </p>
                    {isActive && (
                      <span className="flex h-1.5 w-1.5 rounded-full bg-brand-500 animate-ping" />
                    )}
                  </div>
                  {isActive && (
                    <p className="text-[10px] font-bold text-brand-600 mt-0.5">
                      {status === 'in_transit' ? 'Driver is on the way to drop-off' : 
                       status === 'driver_assigned' ? 'Driver is coming to your pickup location' :
                       'Processing...'}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
