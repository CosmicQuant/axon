const fs = require('fs');
let file = 'C:/Users/ADMIN/Desktop/axon/components/booking/BookingWizard.tsx';
let content = fs.readFileSync(file, 'utf8');

// We simply replace pieces individually using pure indexOf, substring to be safe
let piece1 = "setDropoffCoords(null);";
let piece1Replace = `setDropoffCoords(null);
                                                                    if (pickupCoords) { setTimeout(() => { if (typeof fitBounds === 'function') fitBounds([pickupCoords, ...waypointCoords].filter(Boolean) as any); }, 150); }`;

let piece2 = "setWaypointCoords(newCoords);";
let piece2Replace = `setWaypointCoords(newCoords);
                                                                    if (pickupCoords) { setTimeout(() => { if (typeof fitBounds === 'function') fitBounds([pickupCoords, ...newCoords, data.dropoff ? dropoffCoords : null].filter(Boolean) as any); }, 150); }`;

let p1Idx = content.lastIndexOf(piece1);
if (p1Idx > 0) {
    content = content.substring(0, p1Idx) + piece1Replace + content.substring(p1Idx + piece1.length);
}

let p2Idx = content.lastIndexOf(piece2);
if (p2Idx > 0) {
    content = content.substring(0, p2Idx) + piece2Replace + content.substring(p2Idx + piece2.length);
}

fs.writeFileSync(file, content);
console.log('Update Complete.');
