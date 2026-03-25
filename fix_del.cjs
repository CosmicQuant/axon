const fs = require('fs');
let file = 'c:/Users/ADMIN/Desktop/axon/components/booking/BookingWizard.tsx';
let content = fs.readFileSync(file, 'utf8');

let regex = /onClick=\{\(\) => \{\s*if \(isFinalDropoff\) \{\s*update\(\{ dropoff: '' \}\);\s*setDropoffCoords\(null\);\s*\} else \{\s*const newWp = data\.waypoints\.filter\(\(_: any, i: number\) => i !== idx\);\s*const newCoords = waypointCoords\.filter\(\(_: any, i: number\) => i !== idx\);\s*update\(\{ waypoints: newWp \}\);\s*setWaypointCoords\(newCoords\);\s*\}\s*\}\}/;

let target = 'onClick={() => { if (isFinalDropoff) { update({ dropoff: \\'\\' }); setDropoffCoords(null); if (pickupCoords) { setTimeout(() => { if (typeof fitBounds === \\'function\\') fitBounds([pickupCoords, ...waypointCoords].filter(Boolean) as any); }, 150); } } else { const newWp = data.waypoints.filter((_: any, i: number) => i !== idx); const newCoords = waypointCoords.filter((_: any, i: number) => i !== idx); update({ waypoints: newWp }); setWaypointCoords(newCoords); if (pickupCoords) { setTimeout(() => { if (typeof fitBounds === \\'function\\') fitBounds([pickupCoords, ...newCoords, data.dropoff ? dropoffCoords : null].filter(Boolean) as any); }, 150); } } }}';

let newContent = content.replace(regex, target);
if(newContent === content) {
    console.log('No changes made. Regex mismatch.');
} else {
    fs.writeFileSync(file, newContent);
    console.log('Update successful.');
}
