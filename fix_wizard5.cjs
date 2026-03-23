const fs = require('fs');
let code = fs.readFileSync('components/booking/BookingWizard.tsx', 'utf8');

// Add fitBounds to Step1Where destructuring
code = code.replace(
    /const \{ setPickupCoords, setWaypointCoords, waypointCoords, setIsMapSelecting, setActiveInput, isMapSelecting, activeInput, mapCenter \} = useMapState\(\);/,
    "const { setPickupCoords, setWaypointCoords, waypointCoords, setIsMapSelecting, setActiveInput, isMapSelecting, activeInput, mapCenter, fitBounds } = useMapState();"
);

// Call fitBounds when Pickup is chosen
code = code.replace(
    /setPickupCoords\(\{ lat: resolved\.lat, lng: resolved\.lng \}\);\s*setActiveTab\('dropoff'\);/s,
    \setPickupCoords({ lat: resolved.lat, lng: resolved.lng });
            fitBounds([{ lat: resolved.lat, lng: resolved.lng }]);
            setActiveTab('dropoff');\
);

// Call fitBounds when a dropoff is chosen (manual select or suggestion)
code = code.replace(
    /const newCoords = \[\.\.\.waypointCoords, \{ lat: resolved\.lat, lng: resolved\.lng \}\];\s*update\(\{ waypoints: newWp, dropoff: '' \}\);\s*setWaypointCoords\(newCoords\);/s,
    \const newCoords = [...waypointCoords, { lat: resolved.lat, lng: resolved.lng }];
            update({ waypoints: newWp, dropoff: '' });
            setWaypointCoords(newCoords);
            // Optionally, fit bounds when they add a dropoff, wait it's better handled centrally or here:
            // But we don't have pickupCoords here unless we add it. 
            \
);

// Add fitBounds to the calculateRoute inside BookingWizard
code = code.replace(
    /const \{ pickupCoords, dropoffCoords, waypointCoords, setRoutePolyline, setIsMapSelecting, setActiveInput, setPickupCoords, setWaypointCoords, setDropoffCoords, userLocation, isMapSelecting, activeInput, mapCenter \} = useMapState\(\);/,
    "const { pickupCoords, dropoffCoords, waypointCoords, setRoutePolyline, setIsMapSelecting, setActiveInput, setPickupCoords, setWaypointCoords, setDropoffCoords, userLocation, isMapSelecting, activeInput, mapCenter, fitBounds } = useMapState();"
);

code = code.replace(
    /setRoutePolyline\(route\.geometry\);/g,
    \setRoutePolyline(route.geometry);
                        fitBounds([pickupCoords, ...allStops.map(s => s.coord || s)]);\
);

fs.writeFileSync('components/booking/BookingWizard.tsx', code);
console.log("Patched fitBounds successfully!");
