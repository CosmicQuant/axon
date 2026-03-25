const fs = require('fs');
const path = 'c:/Users/ADMIN/Desktop/axon/components/booking/BookingWizard.tsx';
let text = fs.readFileSync(path, 'utf8');

text = text.replace(
    /if \(isFinalDropoff\) \{\s*update\(\{ dropoff: '' \}\);\s*setDropoffCoords\(null\);\s*\}/,
    `if (isFinalDropoff) { update({ dropoff: '' }); setDropoffCoords(null); if (pickupCoords) { setTimeout(() => { if (typeof fitBounds === 'function') fitBounds([pickupCoords, ...waypointCoords].filter(Boolean) as any); }, 500); } }`
);

text = text.replace(
    /const newWp = data\.waypoints\.filter\(\(_: any, i: number\) => i !== idx\);\s*const newCoords = waypointCoords\.filter\(\(_: any, i: number\) => i !== idx\);\s*update\(\{ waypoints: newWp \}\);\s*setWaypointCoords\(newCoords\);\s*\}/s,
    `const newWp = data.waypoints.filter((_: any, i: number) => i !== idx); const newCoords = waypointCoords.filter((_: any, i: number) => i !== idx); update({ waypoints: newWp }); setWaypointCoords(newCoords); if (pickupCoords) { setTimeout(() => { if (typeof fitBounds === 'function') fitBounds([pickupCoords, ...newCoords, data.dropoff ? dropoffCoords : null].filter(Boolean) as any); }, 500); } }`
);

fs.writeFileSync(path, text);
console.log('Mod done.');