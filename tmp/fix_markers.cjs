const fs = require('fs');
let text = fs.readFileSync('c:/Users/ADMIN/Desktop/axon/components/MapLayer.tsx', 'utf8');

const regex = /\{\/\* Waypoint Markers \*\/\}[\s\S]*?\}\)\)/;

const newText = `{/* Waypoint Markers */}
                {waypointCoords.map((coords, idx) => {
                    const isLastStop = idx === waypointCoords.length - 1 && !dropoffCoords;
                    const showMarker = (!isMapSelecting || activeInput !== \`waypoint-\${idx}\`);
                    const colorCircleStr = isLastStop ? 'bg-red-500' : 'bg-purple-500';
                    const colorTooltipStr = isLastStop ? 'bg-red-600' : 'bg-purple-600';
                    const labelStr = isLastStop ? 'Final Dropoff' : \`Stop \${idx + 1}\`;

                    return showMarker && (
                        <React.Fragment key={\`wp-\${idx}\`}>
                            <OverlayView
                                position={coords}
                                mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                            >
                                <div
                                    onClick={() => {
                                        if (orderState === 'DRAFTING' || allowMarkerClick) {
                                            setActiveInput(\`waypoint-\${idx}\`);
                                            setIsMapSelecting(true);
                                            setMapCenter(coords.lat, coords.lng);
                                        }
                                    }}
                                    className={\`w-5 h-5 \${colorCircleStr} rounded-full border-4 border-white shadow-xl -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:scale-110 transition-transform flex items-center justify-center\`}
                                >
                                    <div className="w-1 h-1 bg-white rounded-full" />
                                </div>
                            </OverlayView>
                            <OverlayView
                                position={coords}
                                mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                            >
                                <div className="absolute -translate-x-1/2 -translate-y-12 flex flex-col items-center z-[9997] pointer-events-none">
                                    <div className={\`\${colorTooltipStr} text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg border border-white/20\`}>
                                        {labelStr}
                                    </div>
                                    <div className={\`w-2 h-2 \${colorTooltipStr} rotate-45 -mt-1 shadow-sm\`}></div>
                                </div>
                            </OverlayView>
                        </React.Fragment>
                    );
                })}`;

text = text.replace(regex, newText);
fs.writeFileSync('c:/Users/ADMIN/Desktop/axon/components/MapLayer.tsx', text);
console.log('Replaced successfully');
