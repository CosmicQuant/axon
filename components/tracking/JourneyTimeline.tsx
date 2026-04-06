import React from 'react';
import { CheckCircle2, Circle, MapPin, Truck, PackageCheck, Zap } from 'lucide-react';
import { RouteStop } from '../../types';

interface JourneyTimelineProps {
  status: string;
  stops?: RouteStop[];
  pickup: string;
  dropoff: string;
  etaMinutes: number | null;
}

export const JourneyTimeline: React.FC<JourneyTimelineProps> = ({ status, stops, pickup, dropoff, etaMinutes }) => {
  const steps = [
    { label: 'Order Placed', id: 'pending', icon: Circle },
    { label: 'Heading to Pickup', id: 'driver_assigned', icon: Truck },
    { label: 'Package Collected', id: 'collected', icon: PackageCheck },
    { label: 'Out for Delivery', id: 'in_transit', icon: MapPin },
    { label: 'Delivered', id: 'delivered', icon: CheckCircle2 },
  ];

  const statusWeight: Record<string, number> = {
    'pending': 0,
    'driver_assigned': 1,
    'collected': 2,
    'in_transit': 3,
    'delivered': 4
  };

  const currentStepIndex = statusWeight[status] ?? 0;

  const completedStops = stops?.filter(s => s.status === 'completed').length || 0;
  const totalStops = stops?.length || 0;

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-[9px] font-black uppercase tracking-widest text-gray-400">Journey</h4>
        <div className="flex items-center gap-2">
          {totalStops > 0 && (
            <span className="text-[9px] font-bold text-gray-400">{completedStops}/{totalStops} stops</span>
          )}
          {(status === 'driver_assigned' || status === 'in_transit') && (
            <div className="flex items-center gap-1 bg-brand-50 px-2 py-0.5 rounded-full border border-brand-100">
              <Zap size={9} className="text-brand-600 fill-brand-600 animate-pulse" />
              <span className="text-[9px] font-black text-brand-700 uppercase tracking-tight">
                {etaMinutes ? `${etaMinutes} min` : 'Calc...'}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="relative">
        {/* Background line */}
        <div className="absolute left-[9px] top-1.5 bottom-1.5 w-0.5 bg-gray-100" />
        {/* Progress line */}
        <div
          className="absolute left-[9px] top-1.5 w-0.5 bg-brand-600 transition-all duration-1000 ease-in-out"
          style={{ height: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
        />

        <div className="space-y-4">
          {steps.map((step, idx) => {
            const isCompleted = idx < currentStepIndex;
            const isActive = idx === currentStepIndex;
            const Icon = step.icon;

            return (
              <div key={step.id} className="flex items-center gap-3 relative">
                <div className={`relative z-10 w-5 h-5 rounded-full flex items-center justify-center transition-all duration-500 flex-shrink-0 ${isCompleted ? 'bg-brand-600 text-white shadow-sm shadow-brand-200' :
                    isActive ? 'bg-white border-2 border-brand-600 text-brand-600 scale-110' :
                      'bg-white border-2 border-gray-200 text-gray-300'
                  }`}>
                  <Icon size={10} className={isActive ? 'animate-pulse' : ''} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className={`text-[11px] font-black uppercase tracking-tight ${isActive ? 'text-gray-900' : isCompleted ? 'text-gray-500' : 'text-gray-400'
                      }`}>
                      {step.label}
                    </p>
                    {isActive && <span className="flex h-1.5 w-1.5 rounded-full bg-brand-500 animate-ping" />}
                  </div>
                  {isActive && (
                    <p className="text-[9px] font-bold text-brand-600 mt-0.5">
                      {status === 'in_transit'
                        ? `Heading to ${dropoff.split(',')[0]}`
                        : status === 'driver_assigned'
                          ? `Coming to ${pickup.split(',')[0]}`
                          : 'Processing...'}
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
