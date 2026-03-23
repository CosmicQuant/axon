const fs = require('fs');
let code = fs.readFileSync('components/booking/BookingWizard.tsx', 'utf8');

// FIX 1: The calculateRoute orderChanged and state sync logic
const oldCalculateRoute = `if (route.full_optimized_order && stopInfo.length === route.full_optimized_order.length) {
                            const optimizedStops = route.full_optimized_order.map((optimizedIndex: number) => stopInfo[optimizedIndex]);
                            const finalDropoffInfo = optimizedStops[optimizedStops.length - 1];
                            const newWaypointsInfo = optimizedStops.slice(0, optimizedStops.length - 1);

                            if (finalDropoffInfo) {
                                const orderChanged = route.full_optimized_order.some((origIdx: number, optimizedIdx: number) => origIdx !== optimizedIdx);

                                if (orderChanged) {
                                    handleUpdate({
                                        waypoints: newWaypointsInfo.map((info: any) => info.name),
                                        dropoff: finalDropoffInfo.name,
                                        distanceKm: distKm,
                                        etaTime: timeStr,
                                        calculatingRoute: false
                                    });
                                    setWaypointCoords(newWaypointsInfo.map((info: any) => info.coord));
                                    setDropoffCoords(finalDropoffInfo.coord);
                                    return;
                                }
                            }
                        }`;

const newCalculateRoute = `if (route.full_optimized_order && stopInfo.length === route.full_optimized_order.length) {
                            const optimizedStops = route.full_optimized_order.map((optimizedIndex: number) => stopInfo[optimizedIndex]);
                            const finalDropoffInfo = optimizedStops[optimizedStops.length - 1];
                            const newWaypointsInfo = optimizedStops.slice(0, optimizedStops.length - 1);

                            if (finalDropoffInfo) {
                                handleUpdate({
                                    waypoints: newWaypointsInfo.map((info: any) => info.name),
                                    dropoff: finalDropoffInfo.name,
                                    distanceKm: distKm,
                                    etaTime: timeStr,
                                    calculatingRoute: false
                                });
                                
                                const newWpCoords = newWaypointsInfo.map((info: any) => info.coord);
                                const newDropoffCoord = finalDropoffInfo.coord;
                                
                                // Prevent infinite loops by only updating context if value really changed
                                if (JSON.stringify(newWpCoords) !== JSON.stringify(waypointCoords)) {
                                    setWaypointCoords(newWpCoords);
                                }
                                if (JSON.stringify(newDropoffCoord) !== JSON.stringify(dropoffCoords)) {
                                    setDropoffCoords(newDropoffCoord);
                                }
                                return;
                            }
                        }`;

code = code.replace(oldCalculateRoute, newCalculateRoute);

// FIX 2: SuggestionsList layout - make it relative so it pushes content down
const oldSuggestionsRenderer = `const SuggestionsList = ({ suggestions, onSelect }: any) => {
        if (!suggestions || suggestions.length === 0) return null;
        return (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-100 z-[150] overflow-hidden max-h-48 overflow-y-auto">`;

const newSuggestionsRenderer = `const SuggestionsList = ({ suggestions, onSelect }: any) => {
        if (!suggestions || suggestions.length === 0) return null;
        return (
            <div className="mt-2 w-full bg-white rounded-xl shadow-inner border border-gray-100 overflow-hidden max-h-48 overflow-y-auto">`;

code = code.replace(oldSuggestionsRenderer, newSuggestionsRenderer);

// FIX 3: Remove the 10rem padding hack
code = code.replace(
    'style={{ paddingBottom: step === 0 && data.activeTab === "pickup" ? "10rem" : "0.25rem" }}>',
    'style={{ paddingBottom: "0.25rem" }}>'
);

// FIX 4: Add the Next button back for Pickup tab so the user can easily advance
// Look for closing motion.div of pickup tab
code = code.replace(
    `                            <SuggestionsList suggestions={pickupSuggestions} onSelect={handlePickupSelect} />
                        </div>
                    </motion.div>`,
    `                            <SuggestionsList suggestions={pickupSuggestions} onSelect={handlePickupSelect} />
                        </div>
                        <div className="flex justify-end mt-4">
                            <button onClick={() => setActiveTab('dropoff')} className="px-6 py-3 bg-gray-900 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-gray-800 transition-colors">Next Step <ArrowRight size={16} /></button>
                        </div>
                    </motion.div>`
);

fs.writeFileSync('components/booking/BookingWizard.tsx', code);
console.log("Wizard script successfully processed");
