const fs = require('fs');
let code = fs.readFileSync('components/booking/BookingWizard.tsx', 'utf8');

code = code.replace(
    `<div className="flex justify-end mt-4">
                            <button onClick={() => setActiveTab('dropoff')} className="px-6 py-3 bg-gray-900 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-gray-800 transition-colors shadow-lg">Next <ArrowRight size={16} /></button>
                        </div>`,
    `<div className="mt-4 w-full">
                            <button onClick={() => setActiveTab('dropoff')} className="w-full py-4 bg-gray-900 text-white rounded-xl text-base font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors shadow-lg min-h-[56px]">Next Step <ArrowRight size={18} /></button>
                        </div>`
);

fs.writeFileSync('components/booking/BookingWizard.tsx', code);
console.log("Button fixed");
