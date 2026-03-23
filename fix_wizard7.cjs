
const fs = require('fs');
let code = fs.readFileSync('components/booking/BookingWizard.tsx', 'utf8');

const regex = /useEffect\(\(\) => \{\s*if \(data\.pickup === 'Current Location' && userLocation\) \{[\s\S]*?\}\s*\}, \[userLocation, data\.pickup\]\);/g;

const replacement = \
    // Auto-locate flow: On first load with empty pickup, snap map to user and start drag mode
    useEffect(() => {
        if (!data.pickup && userLocation && !pickupCoords && !isMapSelecting) {
            setActiveInput('pickup');
            setIsMapSelecting(true);
            mapService.reverseGeocode(userLocation.lat, userLocation.lng).then(address => {
                if (address) handleUpdate({ pickup: address });
            }).catch(console.error);
        }
    }, [userLocation, data.pickup, pickupCoords, isMapSelecting, setActiveInput, setIsMapSelecting]);

    // Live Reverse Geocode when dragging the map (Debounced)
    useEffect(() => {
        if (isMapSelecting && mapCenter) {
            const timer = setTimeout(async () => {
                try {
                    const address = await mapService.reverseGeocode(mapCenter.lat, mapCenter.lng);
                    if (address) {
                        if (activeInput === 'pickup') {
                            handleUpdate({ pickup: address });
                        } else if (activeInput === 'dropoff') {
                            handleUpdate({ dropoff: address });
                        }
                    }
                } catch (e) {}
            }, 600);
            return () => clearTimeout(timer);
        }
    }, [mapCenter, isMapSelecting, activeInput, handleUpdate]);
\;

code = code.replace(regex, replacement);
fs.writeFileSync('components/booking/BookingWizard.tsx', code);
console.log('Done!');

