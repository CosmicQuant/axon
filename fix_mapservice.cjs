const fs = require('fs');
let code = fs.readFileSync('services/mapService.ts', 'utf8');

code = code.replace(
    /const route = await mapService\.getRoute\(start, potentialEnd, intermediates, vehicleType, true\);/g,
    'const route = await mapService.getRoute(start, potentialEnd, intermediates, vehicleType, intermediates.length > 1);'
);

fs.writeFileSync('services/mapService.ts', code);
console.log("Fixed mapService optimization bug");
