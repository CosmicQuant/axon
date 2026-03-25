const fs = require('fs');
let file = 'C:/Users/ADMIN/Desktop/axon/components/booking/BookingWizard.tsx';
let content = fs.readFileSync(file, 'utf8');

let oldBlock = `onClick={() => {
                                                                  if (isFinalDropoff) {
                                                                      update({ dropoff: '' });
                                                                      setDropoffCoords(null);
                                                                  } else {
                                                                      const newWp = data.waypoints.filter((_: any, i: number) => i !== idx);
                                                                      const newCoords = waypointCoords.filter((_: any, i: number) => i !== idx);
                                                                      update({ waypoints: newWp });
                                                                      setWaypointCoords(newCoords);
                                                                  }
                                                              }}`;

let newBlock = `onClick={() => {
                                                                  if (isFinalDropoff) {
                                                                      update({ dropoff: '' });
                                                                      setDropoffCoords(null);
                                                                      if (pickupCoords) {
                                                                          setTimeout(() => { if (typeof fitBounds === 'function') fitBounds([pickupCoords, ...waypointCoords].filter(Boolean) as any); }, 150);
                                                                      }
                                                                  } else {
                                                                      const newWp = data.waypoints.filter((_: any, i: number) => i !== idx);
                                                                      const newCoords = waypointCoords.filter((_: any, i: number) => i !== idx);
                                                                      update({ waypoints: newWp });
                                                                      setWaypointCoords(newCoords);
                                                                      if (pickupCoords) {
                                                                          // Also account for the fact that a dropoff might be present!
                                                                          setTimeout(() => { if (typeof fitBounds === 'function') fitBounds([pickupCoords, ...newCoords, data.dropoff ? dropoffCoords : null].filter(Boolean) as any); }, 150);
                                                                      }
                                                                  }
                                                              }}`;

let c_norm = content.replace(/\r\n/g, '\n');
let o_norm = oldBlock.replace(/\r\n/g, '\n');
let n_norm = newBlock.replace(/\r\n/g, '\n');

if (c_norm.includes(o_norm)) {
    c_norm = c_norm.replace(o_norm, n_norm);
    fs.writeFileSync(file, c_norm);
    console.log('Update successful!');
} else {
    console.log('Update failed. Try manually adjusting indentation.');
}