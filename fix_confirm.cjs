const fs = require('fs');
let code = fs.readFileSync('components/booking/BookingWizard.tsx', 'utf8');

// 1. Add isMapSelecting, activeInput, mapCenter to destructuring in main component
code = code.replace(
    'const { pickupCoords, dropoffCoords, waypointCoords, setRoutePolyline, setIsMapSelecting, setActiveInput, setPickupCoords, setWaypointCoords, setDropoffCoords, userLocation } = useMapState();',
    'const { pickupCoords, dropoffCoords, waypointCoords, setRoutePolyline, setIsMapSelecting, setActiveInput, setPickupCoords, setWaypointCoords, setDropoffCoords, userLocation, isMapSelecting, activeInput, mapCenter } = useMapState();'
);

// 2. Remove the old Confirm button block from Step1Where
code = code.replace(
    `            {isMapSelecting && (
                <div className="absolute top-[0%] -translate-y-[130%] left-0 right-0 z-[120] flex justify-center">
                    <button
                        onClick={async () => {
                            setIsMapSelecting(false);
                            if (mapCenter) {
                                const lat = mapCenter.lat;
                                const lng = mapCenter.lng;
                                const address = await mapService.reverseGeocode(lat, lng) || "Selected Location";

                                if (activeInput === "pickup") {
                                    update({ pickup: address });
                                    setPickupCoords({ lat, lng });
                                    setActiveTab("dropoff");
                                } else {
                                    const newWp = [...data.waypoints, address];
                                    const newCoords = [...waypointCoords, { lat, lng }];
                                    update({ waypoints: newWp, dropoff: "" });
                                    setWaypointCoords(newCoords);
                                }
                            }
                        }}
                        className="px-6 py-3 bg-brand-600 text-white rounded-full font-bold shadow-xl border-4 border-white flex items-center gap-2 hover:scale-105 transition-transform"
                    >
                        <Check size={18} /> Confirm {activeInput === "pickup" ? "Pickup" : "Dropoff"} Here
                    </button>
                </div>
            )}`,
    ''
);

// 3. Inject the Confirm overlay into the main render based on isMapSelecting
const overlayCode = `        <div className="fixed bottom-0 inset-x-0 pointer-events-none z-[100] flex flex-col justify-end mx-auto max-w-lg">
            {isMapSelecting ? (
                <div className="bg-white/95 backdrop-blur-xl shadow-2xl p-6 pointer-events-auto flex items-center justify-between border border-gray-100 mb-6 mx-4 rounded-3xl animate-in slide-in-from-bottom-4 duration-300">
                    <div className="flex flex-col gap-1.5 flex-1 pr-4">
                        <span className="flex items-center gap-1.5 text-[10px] font-black tracking-widest uppercase text-brand-600">
                            <LocateFixed size={12} />
                            Confirm Location
                        </span>
                        <span className="text-sm font-bold text-gray-900 leading-tight">
                            {activeInput === 'pickup' ? 'Where are we picking up?' : 'Where are we dropping off?'}
                        </span>
                    </div>
                    <button 
                        onClick={async () => {
                            setIsMapSelecting(false);
                            if (mapCenter) {
                                const lat = mapCenter.lat;
                                const lng = mapCenter.lng;
                                const address = await mapService.reverseGeocode(lat, lng) || "Selected Location";
                                
                                if (activeInput === "pickup") {
                                    handleUpdate({ pickup: address, activeTab: "dropoff" });
                                    setPickupCoords({ lat, lng });
                                } else {
                                    const newWp = [...data.waypoints, address];
                                    const newCoords = [...waypointCoords, { lat, lng }];
                                    handleUpdate({ waypoints: newWp, dropoff: "" });
                                    setWaypointCoords(newCoords);
                                }
                            }
                        }}
                        className="bg-brand-600 text-white px-7 py-3.5 rounded-full font-black text-sm shadow-xl shadow-brand-600/30 active:scale-95 transition-all hover:bg-brand-700 flex items-center gap-2 whitespace-nowrap"
                    >
                        <Check size={18} /> Confirm
                    </button>
                </div>
            ) : (
                <motion.div`;

code = code.replace(
    `        <div className="fixed bottom-0 inset-x-0 pointer-events-none z-[100] flex flex-col justify-end mx-auto max-w-lg">
            {/* Sheet Background adhering exactly to the bottom */}
            <motion.div`,
    overlayCode.replace('<motion.div', '{/* Sheet Background adhering exactly to the bottom */}\n            <motion.div')
);

fs.writeFileSync('components/booking/BookingWizard.tsx', code);
console.log("Applied Confirm Button fixes");
