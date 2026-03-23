const fs = require('fs');
let code = fs.readFileSync('components/booking/BookingWizard.tsx', 'utf8');

// 1. Clear out "Current Location" from INITIAL_STATE
code = code.replace(
    "pickup: 'Current Location', dropoff: '', waypoints: [], distanceKm: 0, activeTab: 'pickup',",
    "pickup: '', dropoff: '', waypoints: [], distanceKm: 0, activeTab: 'pickup',"
);

// 2. Adjust the useEffect mapping
const oldEffect = `    useEffect(() => {
        if (data.pickup === 'Current Location' && userLocation) {
            // Reverse geocode the user's location on boot
            mapService.reverseGeocode(userLocation.lat, userLocation.lng).then(address => {
                if (address) {
                    handleUpdate({ pickup: address });
                }
            }).catch(console.error);
        }
    }, [userLocation, data.pickup]);`;

const newEffect = `    useEffect(() => {
        if (!data.pickup && userLocation && !pickupCoords) {
            // Reverse geocode the user's location on boot
            setPickupCoords({ lat: userLocation.lat, lng: userLocation.lng });
            mapService.reverseGeocode(userLocation.lat, userLocation.lng).then(address => {
                if (address) {
                    handleUpdate({ pickup: address });
                }
            }).catch(console.error);
        }
    }, [userLocation, data.pickup, pickupCoords, setPickupCoords]);`;

code = code.replace(oldEffect, newEffect);

// 3. Make the "Next" button full width
const oldNextBtn = `                        <div className="flex justify-end mt-4">
                            <button onClick={() => setActiveTab('dropoff')} className="px-6 py-3 bg-gray-900 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-gray-800 transition-colors shadow-lg">Next <ArrowRight size={16} /></button>
                        </div>`;

const newNextBtn = `                        <div className="mt-4 w-full">
                            <button onClick={() => setActiveTab('dropoff')} className="w-full py-4 bg-gray-900 text-white rounded-xl text-base font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors shadow-lg min-h-[56px]">Next Step <ArrowRight size={18} /></button>
                        </div>`;
code = code.replace(oldNextBtn, newNextBtn);

// 4. Update the "Current Location" string in the UI where it acts as a fallback for the text view
// Specifically, there is `<span className="text-[11px] font-bold text-gray-900 truncate w-full text-center px-1 mt-1" title={data.pickup || 'Current Location'}>{data.pickup || 'Current Location'}</span>`
// It should probably say "Locating..." if there is no pickup text yet.
code = code.replace(
    /data\.pickup \|\| 'Current Location'/g,
    "data.pickup || 'Locating...'"
);

// We should also replace the button tooltip that used to reset to 'Current Location'
code = code.replace(
    `update({ pickup: 'Current Location' })`,
    `update({ pickup: '' })`
);

fs.writeFileSync('components/booking/BookingWizard.tsx', code);
console.log("BookingWizard updated");
