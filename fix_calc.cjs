const fs = require('fs');
let code = fs.readFileSync('components/booking/BookingWizard.tsx', 'utf8');

const regex = /if \(finalDropoffInfo\) \{[\s\S]*?return;\n\s*\}/;

const replacement = `if (finalDropoffInfo) {
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
                            }`;

code = code.replace(regex, replacement);
fs.writeFileSync('components/booking/BookingWizard.tsx', code);
