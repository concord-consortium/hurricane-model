#!/usr/bin/env bash

node scripts/convert-wind-data.js wind-data-netcdf/dec-u.nc wind-data-netcdf/dec-v.nc wind-data-json/dec-geojson.json geojson
node scripts/convert-wind-data.js wind-data-netcdf/mar-u.nc wind-data-netcdf/mar-v.nc wind-data-json/mar-geojson.json geojson
node scripts/convert-wind-data.js wind-data-netcdf/jun-u.nc wind-data-netcdf/jun-v.nc wind-data-json/jun-geojson.json geojson
node scripts/convert-wind-data.js wind-data-netcdf/sep-u.nc wind-data-netcdf/sep-v.nc wind-data-json/sep-geojson.json geojson

node scripts/convert-wind-data.js wind-data-netcdf/dec-u.nc wind-data-netcdf/dec-v.nc wind-data-json/dec-simple.json simple
node scripts/convert-wind-data.js wind-data-netcdf/mar-u.nc wind-data-netcdf/mar-v.nc wind-data-json/mar-simple.json simple
node scripts/convert-wind-data.js wind-data-netcdf/jun-u.nc wind-data-netcdf/jun-v.nc wind-data-json/jun-simple.json simple
node scripts/convert-wind-data.js wind-data-netcdf/sep-u.nc wind-data-netcdf/sep-v.nc wind-data-json/sep-simple.json simple
