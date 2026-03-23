const fs = require('fs');
let code = fs.readFileSync('components/booking/BookingWizard.tsx', 'utf8');

// 1. Remove the old button from Step1Where
const oldButtonRegex = /\{isMapSelecting && \(\s*<div className="absolute top-\[0%\] -translate-y-\[130%\] left-0 right-0 z-\[120\] flex justify-center">.*?<\/div>\s*\)\}/s;
code = code.replace(oldButtonRegex, '');

// 2. Add it directly above the root motion.div in BookingWizard
const mainReturnRegex = /return \(\s*<div className="fixed bottom-0 inset-x-0 pointer-events-none z-\[100\] flex flex-col justify-end mx-auto max-w-lg">\s*\{\/\* Sheet Background adhering exactly to the bottom \*\/\}/s;

const newButton = \eturn (
        <div className="fixed bottom-0 inset-x-0 pointer-events-none z-[100] flex flex-col justify-end mx-auto max-w-lg">
            
            {/* Map Confirmation Button (Floating above the sheet) */}
            <AnimatePresence>
            {isMapSelecting && (
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="w-full flex justify-center pb-6 z-[120] pointer-events-auto"
                >
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
                                    fitBounds([{ lat, lng }]);
                                } else {
                                    const newWp = [...data.waypoints, address];
                                    const newCoords = [...waypointCoords, { lat, lng }];
                                    handleUpdate({ waypoints: newWp, dropoff: "" });
                                    setWaypointCoords(newCoords);
                                }
                            }
                        }}
                        className="px-6 py-4 bg-brand-600 text-white rounded-full font-bold shadow-2xl border-4 border-white flex items-center gap-2 hover:scale-105 transition-transform"
                    >
                        <Check size={20} /> Confirm {activeInput === "pickup" ? "Pickup" : "Dropoff"} Here
                    </button>
                </motion.div>
            )}
            </AnimatePresence>

            {/* Sheet Background adhering exactly to the bottom */}\;

code = code.replace(mainReturnRegex, newButton);

fs.writeFileSync('components/booking/BookingWizard.tsx', code);
console.log("Moved Confirm button to root!");
