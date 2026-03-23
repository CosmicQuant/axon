const fs = require('fs');
let code = fs.readFileSync('components/booking/BookingWizard.tsx', 'utf8');

// Update Next button logic to enforce pickup selection and make w-full
code = code.replace(
    /<div className="flex justify-end mt-4">\s*<button onClick=\{\(\) => setActiveTab\('dropoff'\)\} className=".*?>Next <ArrowRight size=\{16\} \/><\/button>\s*<\/div>/s,
    
        <div className="w-full mt-4">
            <button 
                onClick={() => {
                    if (data.pickup) {
                        setActiveTab('dropoff');
                        // Auto zoom back out when switching
                        if (pickupCoords) {
                            // fitBounds or panTo via MapContext might not be directly here 
                            // but setting tab triggers re-eval usually.
                        }
                    }
                }} 
                disabled={!data.pickup}
                className={"w-full py-4 text-base font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg min-h-[56px] " + (data.pickup ? 'bg-gray-900 text-white hover:bg-gray-800' : 'bg-gray-200 text-gray-400 cursor-not-allowed')}
            >
                Confirm Pickup <ArrowRight size={18} />
            </button>
        </div>
    
);

// We should also change "Next Step" if it exists, matching either
code = code.replace(
    /<div className="w-full mt-4">\s*<button onClick=\{\(\) => setActiveTab\('dropoff'\)\} className="w-full py-4 bg-gray-900 text-white rounded-xl text-base font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors shadow-lg min-h-\[56px\]">Next Step <ArrowRight size=\{18\} \/><\/button>\s*<\/div>/s,
    
        <div className="w-full mt-4">
            <button 
                onClick={() => {
                    if (data.pickup) {
                        setActiveTab('dropoff');
                    }
                }} 
                disabled={!data.pickup}
                className={"w-full py-4 text-base font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg min-h-[56px] " + (data.pickup ? 'bg-gray-900 text-white hover:bg-gray-800' : 'bg-gray-200 text-gray-400 cursor-not-allowed')}
            >
                Confirm Pickup <ArrowRight size={18} />
            </button>
        </div>
    
);


// Make sure there is a back button to switch back to pickup
code = code.replace(
    /<motion.div key="dropoff" [^>]+>[\s\S]*?\{data.waypoints.length > 0 && \(/s,
    (match) => {
        if (!match.includes('ArrowLeft')) {
            return match.replace(
                /<motion.div key="dropoff"([^>]+)>\s*<div className="space-y-3">/,
                \<motion.div key="dropoff">
                        <div className="space-y-3">
                            <button onClick={() => setActiveTab('pickup')} className="flex items-center gap-2 text-sm text-gray-500 font-bold hover:text-gray-900 mb-2 transition-colors">
                                <ArrowLeft size={16} /> Back to Pickup
                            </button>\
            );
        }
        return match;
    }
);

fs.writeFileSync('components/booking/BookingWizard.tsx', code);
console.log("Updated flow.");
