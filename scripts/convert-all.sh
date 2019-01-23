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
node --max-old-space-size=4092 scripts/convert-sea-surface-temp-to-png.js sea-surface-temp-netcdf/dec.nc sea-surface-temp-img/dec.png
node --max-old-space-size=4092 scripts/convert-sea-surface-temp-to-png.js sea-surface-temp-netcdf/mar.nc sea-surface-temp-img/mar.png
node --max-old-space-size=4092 scripts/convert-sea-surface-temp-to-png.js sea-surface-temp-netcdf/jun.nc sea-surface-temp-img/jun.png
node --max-old-space-size=4092 scripts/convert-sea-surface-temp-to-png.js sea-surface-temp-netcdf/sep.nc sea-surface-temp-img/sep.png
