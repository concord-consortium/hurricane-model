#!/usr/bin/env bash

# Wind data
node scripts/convert-wind-data.js wind-data-netcdf/dec-u.nc wind-data-netcdf/dec-v.nc wind-data-json/dec-geojson.json geojson
node scripts/convert-wind-data.js wind-data-netcdf/mar-u.nc wind-data-netcdf/mar-v.nc wind-data-json/mar-geojson.json geojson
node scripts/convert-wind-data.js wind-data-netcdf/jun-u.nc wind-data-netcdf/jun-v.nc wind-data-json/jun-geojson.json geojson
node scripts/convert-wind-data.js wind-data-netcdf/sep-u.nc wind-data-netcdf/sep-v.nc wind-data-json/sep-geojson.json geojson

node scripts/convert-wind-data.js wind-data-netcdf/dec-u.nc wind-data-netcdf/dec-v.nc wind-data-json/dec-simple.json simple
node scripts/convert-wind-data.js wind-data-netcdf/mar-u.nc wind-data-netcdf/mar-v.nc wind-data-json/mar-simple.json simple
node scripts/convert-wind-data.js wind-data-netcdf/jun-u.nc wind-data-netcdf/jun-v.nc wind-data-json/jun-simple.json simple
node scripts/convert-wind-data.js wind-data-netcdf/sep-u.nc wind-data-netcdf/sep-v.nc wind-data-json/sep-simple.json simple

# Sea surface temperature
node --max-old-space-size=4092 scripts/convert-sea-surface-temp-to-png.js sea-surface-temp-netcdf/dec.nc sea-surface-temp-img/dec-default.png default
node --max-old-space-size=4092 scripts/convert-sea-surface-temp-to-png.js sea-surface-temp-netcdf/mar.nc sea-surface-temp-img/mar-default.png default
node --max-old-space-size=4092 scripts/convert-sea-surface-temp-to-png.js sea-surface-temp-netcdf/jun.nc sea-surface-temp-img/jun-default.png default
node --max-old-space-size=4092 scripts/convert-sea-surface-temp-to-png.js sea-surface-temp-netcdf/sep.nc sea-surface-temp-img/sep-default.png default

node --max-old-space-size=4092 scripts/convert-sea-surface-temp-to-png.js sea-surface-temp-netcdf/dec.nc sea-surface-temp-img/dec-purpleCC.png purpleCC
node --max-old-space-size=4092 scripts/convert-sea-surface-temp-to-png.js sea-surface-temp-netcdf/mar.nc sea-surface-temp-img/mar-purpleCC.png purpleCC
node --max-old-space-size=4092 scripts/convert-sea-surface-temp-to-png.js sea-surface-temp-netcdf/jun.nc sea-surface-temp-img/jun-purpleCC.png purpleCC
node --max-old-space-size=4092 scripts/convert-sea-surface-temp-to-png.js sea-surface-temp-netcdf/sep.nc sea-surface-temp-img/sep-purpleCC.png purpleCC

node --max-old-space-size=4092 scripts/convert-sea-surface-temp-to-png.js sea-surface-temp-netcdf/dec.nc sea-surface-temp-img/dec-purple3.png purple3
node --max-old-space-size=4092 scripts/convert-sea-surface-temp-to-png.js sea-surface-temp-netcdf/mar.nc sea-surface-temp-img/mar-purple3.png purple3
node --max-old-space-size=4092 scripts/convert-sea-surface-temp-to-png.js sea-surface-temp-netcdf/jun.nc sea-surface-temp-img/jun-purple3.png purple3
node --max-old-space-size=4092 scripts/convert-sea-surface-temp-to-png.js sea-surface-temp-netcdf/sep.nc sea-surface-temp-img/sep-purple3.png purple3

node --max-old-space-size=4092 scripts/convert-sea-surface-temp-to-png.js sea-surface-temp-netcdf/dec.nc sea-surface-temp-img/dec-rainbowCC.png rainbowCC
node --max-old-space-size=4092 scripts/convert-sea-surface-temp-to-png.js sea-surface-temp-netcdf/mar.nc sea-surface-temp-img/mar-rainbowCC.png rainbowCC
node --max-old-space-size=4092 scripts/convert-sea-surface-temp-to-png.js sea-surface-temp-netcdf/jun.nc sea-surface-temp-img/jun-rainbowCC.png rainbowCC
node --max-old-space-size=4092 scripts/convert-sea-surface-temp-to-png.js sea-surface-temp-netcdf/sep.nc sea-surface-temp-img/sep-rainbowCC.png rainbowCC
