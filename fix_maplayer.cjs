const fs = require('fs');
let code = fs.readFileSync('components/MapLayer.tsx', 'utf8');

// Replace the old userLocation pin with new styled pin
code = code.replace(
    `<div className="flex flex-col items-center -translate-x-1/2 -translate-y-[90%] cursor-pointer hover:scale-110 transition-transform">
                            <div className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-lg mb-0.5 whitespace-nowrap">
                                Pickup
                            </div>
                            <MapPin className="w-8 h-8 text-emerald-500 drop-shadow-md" style={{ fill: "currentColor" }} />
                        </div>`,
    `<div className="w-6 h-6 bg-green-500 rounded-full border-4 border-white shadow-xl -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:scale-110 transition-transform flex items-center justify-center">
                            <div className="w-1.5 h-1.5 bg-white rounded-full" />
                        </div>
                    </OverlayView>
                    <OverlayView
                        position={userLocation}
                        mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                    >
                        <div className="absolute -translate-x-1/2 -translate-y-12 flex flex-col items-center z-[9998] pointer-events-none">
                            <div className="bg-green-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg border border-white/20">
                                My Location
                            </div>
                            <div className="w-2 h-2 bg-green-600 rotate-45 -mt-1 shadow-sm"></div>
                        </div>`
);

// Replace the old pickupCoords pin with new styled pin
code = code.replace(
    `<div
                            onClick={() => {
                                if (orderState === 'DRAFTING' || allowMarkerClick) {
                                    setActiveInput('pickup');
                                    setIsMapSelecting(true);
                                    setMapCenter(pickupCoords.lat, pickupCoords.lng);
                                }
                            }}
                            className="flex flex-col items-center -translate-x-1/2 -translate-y-[90%] cursor-pointer hover:scale-110 transition-transform"
                        >
                            <div className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-lg mb-0.5 whitespace-nowrap">
                                Pickup
                            </div>
                            <MapPin className="w-8 h-8 text-emerald-500 drop-shadow-md" style={{ fill: "currentColor" }} />
                        </div>`,
    `<div
                            onClick={() => {
                                if (orderState === 'DRAFTING' || allowMarkerClick) {
                                    setActiveInput('pickup');
                                    setIsMapSelecting(true);
                                    setMapCenter(pickupCoords.lat, pickupCoords.lng);
                                }
                            }}
                            className="w-6 h-6 bg-green-500 rounded-full border-4 border-white shadow-xl -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:scale-110 transition-transform flex items-center justify-center"
                        >
                            <div className="w-1.5 h-1.5 bg-white rounded-full" />
                        </div>
                    </OverlayView>
                    <OverlayView
                        position={pickupCoords}
                        mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                    >
                        <div className="absolute -translate-x-1/2 -translate-y-12 flex flex-col items-center z-[9998] pointer-events-none">
                            <div className="bg-green-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg border border-white/20">
                                Pick-Up
                            </div>
                            <div className="w-2 h-2 bg-green-600 rotate-45 -mt-1 shadow-sm"></div>
                        </div>`
);

fs.writeFileSync('components/MapLayer.tsx', code);
console.log("MapLayer styling applied");
