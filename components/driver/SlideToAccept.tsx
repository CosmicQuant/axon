import React, { useState, useEffect } from 'react';
import { motion, PanInfo, useAnimation } from 'framer-motion';
import { ChevronRight, Loader2 } from 'lucide-react';

interface SlideToAcceptProps {
  onAccept: () => Promise<void>;
  isLoading?: boolean;
  disabled?: boolean;
}

export const SlideToAccept: React.FC<SlideToAcceptProps> = ({ onAccept, isLoading, disabled }) => {
  const [isAccepted, setIsAccepted] = useState(false);
  const controls = useAnimation();
  const trackWidth = 280; // approximate width in px
  const handleWidth = 64;

  const handleDragEnd = async (_: any, info: PanInfo) => {
    if (disabled || isLoading) return;
    
    // If dragged more than 70% of the way
    if (info.offset.x > (trackWidth - handleWidth) * 0.7) {
      setIsAccepted(true);
      await controls.start({ x: trackWidth - handleWidth });
      try {
        await onAccept();
      } catch (e) {
        setIsAccepted(false);
        controls.start({ x: 0 });
      }
    } else {
      controls.start({ x: 0 });
    }
  };

  return (
    <div className={`relative h-16 w-full max-w-[320px] mx-auto rounded-2xl p-1 overflow-hidden transition-all duration-300 ${
      disabled ? 'bg-gray-100' : 'bg-brand-600 shadow-lg shadow-brand-200'
    }`}>
      {/* Background Text */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className={`text-xs font-black uppercase tracking-[0.2em] transition-opacity duration-300 ${
          isAccepted ? 'opacity-0' : 'opacity-40 text-white'
        }`}>
          {disabled ? 'Job Locked' : 'Slide to Accept'}
        </span>
      </div>

      {/* Animated Arrow Indicators */}
      {!isAccepted && !disabled && (
          <div className="absolute inset-0 flex items-center justify-center gap-1 opacity-20 pointer-events-none">
             {[0, 1, 2].map((i) => (
                 <motion.div
                    key={i}
                    animate={{ x: [0, 10, 0], opacity: [0.2, 1, 0.2] }}
                    transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.2 }}
                 >
                    <ChevronRight size={14} className="text-white" />
                 </motion.div>
             ))}
          </div>
      )}

      {/* The Slider Handle */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: trackWidth - handleWidth }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        animate={controls}
        className={`relative z-10 w-14 h-14 bg-white rounded-xl flex items-center justify-center cursor-grab active:cursor-grabbing shadow-md transition-opacity ${
          disabled ? 'opacity-50' : 'opacity-100'
        }`}
      >
        {isLoading || isAccepted ? (
          <Loader2 className="w-6 h-6 text-brand-600 animate-spin" />
        ) : (
          <ChevronRight className="w-6 h-6 text-brand-600" />
        )}
      </motion.div>

      {/* Filling Progress Background */}
      <motion.div 
        className="absolute inset-y-0 left-0 bg-white/20 pointer-events-none"
        style={{ width: 'var(--drag-x)' }} // Logic handled by framer-motion internally or via state if needed
      />
    </div>
  );
};
