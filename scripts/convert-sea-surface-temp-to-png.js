// This script requires `ncdump` tool to exist (conveter.
// Mac OS X: You can install it using Homebrew: `brew install netcdf`
// Linux/Windows: check NetCDF packages
// Note that it requires 4GB of memory to read large NetCDF files. Use following param to increase heap size:
// node --max-old-space-size=4092 scripts/convert-sea-surface-temp.js <...>
const fs = require('fs');
const { execSync } = require('child_process');
const merc = require('mercator-projection');
const { temperatureScale } = require("../src/temperature-scale");
const { PNG } = require("pngjs");

const fileName = process.argv[2];
const outputFileName = process.argv[3] || 'sst.png';

const tempFile = '__sst_temp'

// Limit data to lat/lon range, as our model will be focused on the northern part of the Atlantic ocean.
const minLat = -10;
const maxLat = 80;
const minLon = -120;
const maxLon = 0;

// This value is defined in netcdf file in one of the params. Temperatures in NetCDF format needs to be multiplied
// by this param to get a real value in *C.
const tempScale = 0.005;

// Desired image size.
const imgSize = 2048;
// mercator-projection always assumes 256x256 output.
const ratio = 256 / imgSize;

console.log(`Executing ncdump ${fileName} > ${tempFile}...`);
// Binary format -> plain text file.
execSync(`ncdump ${fileName} > ${tempFile}`);

console.log("Reading data...");
// _ is a not a valid character in JSON. Replace it with null. _ means that there's no data, because given coordinates
// are over land.
const data = fs.readFileSync(tempFile, 'utf8').replace(/ _/g, " null");
// Cleanup.
execSync(`rm ${tempFile}`);
const lat = eval('[' + data.match(/ lat =(.*?);/s)[1] + ']');
const lon = eval('[' + data.match(/ lon =(.*?);/s)[1] + ']');
const sst = eval('[' + data.match(/ sst4 =(.*?);/s)[1] + ']');

const result = [];

console.log("Generating JSON...");
lat.forEach((latValue, latIdx) => {
  if (latValue < minLat || latValue > maxLat) {
    return;
  }
  lon.forEach((lonValue, lonIdx) => {
    if (lonValue > 180) {
      // convert [0, 360] range to [-180, 180].
      lonValue = lonValue - 360;
    }
    if (lonValue < minLon || lonValue > maxLon) {
      return;
    }
    const valueIdx = latIdx * lon.length + lonIdx;
    result.push({
      lat: latValue,
      lng: lonValue,
      // Use dummy -1*C value for points that are over land.
      sst: sst[valueIdx] === null ? null : sst[valueIdx] * tempScale
    });
  });
});

// We could save JSON at this point too. But it's not necessary for now.
// console.log("Writing JSON...");
// fs.writeFileSync(outputFileName, JSON.stringify(result, null, 2));

const png = new PNG({ width: imgSize, height: imgSize, colorType: 6 });
const imgData = [];
console.log("Generating image...");
result.forEach(p => {
  if (p.sst === null) {
    // Nothing to do, no temperature data (land).
    return;
  }
  const xy = merc.fromLatLngToPoint(p);
  const x = Math.round(xy.x / ratio);
  const y = Math.round(xy.y / ratio);
  if (imgData[x] && imgData[x][y]) {
    // Nothing to do, we already set color at this point.
    return;
  }
  if (!imgData[x]) {
    imgData[x] = [];
  }
  imgData[x][y] = true;

  const idx = (imgSize * y + x) << 2;
  const cssColor = temperatureScale(p.sst);
  const match = cssColor.match(/rgb\((\d+), (\d+), (\d+)\)/);
  png.data[idx] = Number(match[1]);
  png.data[idx + 1] = Number(match[2]);
  png.data[idx + 2] = Number(match[3]);
  png.data[idx + 3] = 255;
});

console.log("Saving image...");
const buffer = PNG.sync.write(png, { colorType: 6 });
fs.writeFileSync(outputFileName, buffer);
console.log("Done")
