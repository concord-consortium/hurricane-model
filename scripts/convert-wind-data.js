// This script requires `ncdump` tool to exist (conveter.
// Mac OS X: You can install it using Homebrew: `brew install netcdf`
// Linux/Windows: check NetCDF packages

const fs = require('fs');
const { execSync } = require('child_process');

const uFileName = process.argv[2];
const vFileName = process.argv[3];
const outputFileName = process.argv[4] || 'wind.json';
const format = process.argv[5] || 'geojson'; // geojson or simple

const uTempFile = '__u_data_temp'
const vTempFile = '__v_data_temp'

// Limit data to lat/lon range, as our model will be focused on the northern part of the Atlantic ocean.
const minLat = -25;
const maxLat = 80;
const minLon = -130;
const maxLon = 30;

// Scale wind vectors for GeoJSON conversion, so visualization looks cleaner.
const geoJSONVectorScale = 0.20;

// Binary format -> plain text file.
execSync(`ncdump ${uFileName} > ${uTempFile}`);
execSync(`ncdump ${vFileName} > ${vTempFile}`);

// Read U component data.
const uData = fs.readFileSync(uTempFile, 'utf8');
const lat = eval('[' + uData.match(/ lat =(.*?);/s)[1] + ']');
const lon = eval('[' + uData.match(/ lon =(.*?);/s)[1] + ']');
const uwnd = eval('[' + uData.match(/ uwnd =(.*?);/s)[1] + ']');

// Read V component data.
const vData = fs.readFileSync(vTempFile, 'utf8');
const vwnd = eval('[' + vData.match(/ vwnd =(.*?);/s)[1] + ']');

const result = format === 'geojson' ?
  {
    type: 'FeatureCollection',
    features: []
  }
  :
  {
    windVectors: []
  }

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
    if (format === 'geojson') {
      // GeoJSON doesn't support arrows so draw just a line.
      result.features.push({
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [
              lonValue,
              latValue
            ],
            [
              lonValue + uwnd[valueIdx] * geoJSONVectorScale,
              latValue + vwnd[valueIdx] * geoJSONVectorScale
            ]
          ]
        }
      });
    } else {
      // Simple format.
      result.windVectors.push({
        lat: latValue,
        lng: lonValue,
        u: uwnd[valueIdx],
        v: vwnd[valueIdx]
      });
    }
  });
});

fs.writeFileSync(outputFileName, JSON.stringify(result, null, 2));

// Cleanup.
execSync(`rm ${uTempFile}`);
execSync(`rm ${vTempFile}`);
