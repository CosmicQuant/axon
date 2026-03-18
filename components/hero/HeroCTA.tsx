import React from 'react';

interface HeroCTAProps {
    onStartBooking: () => void;
    onBusinessClick?: () => void;
}

export const HeroCTA: React.FC<HeroCTAProps> = ({ onStartBooking, onBusinessClick }) => {
    return (
        <div className="bg-slate-900 py-24 text-center relative overflow-hidden pointer-events-auto">
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
            <div className="relative z-10 max-w-4xl mx-auto px-4">
                <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Ready to move something?</h2>
                <p className="text-slate-300 text-lg mb-10 max-w-2xl mx-auto">
                    Join thousands of Kenyans who trust AXON for their daily logistics.
                    Fast, reliable, and affordable.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                    <button onClick={onStartBooking} className="px-8 py-4 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-brand-500/25">
                        Book Delivery
                    </button>
                    <button onClick={onBusinessClick} className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-lg transition-all backdrop-blur-sm">
                        Business Account
                    </button>
                </div>
            </div>
        </div>
    );
};
