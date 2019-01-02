# Hurricane Model

## Early research spike notes

https://docs.google.com/document/d/1gifmTd1_kFAumL7-1Pm2XibsnBZrrwkkLtW2eknzxI4/edit?usp=sharing

## Global wind data

Global wind pattern is one of the most important factors affecting hurricane path. Thus, it's important to use
accurate data. This model will use averaged, real world data coming from NOAA:

https://www.esrl.noaa.gov/psd/data/gridded/data.ncep.reanalysis2.pressure.html

NOAA provides separate dataset for U and V components of the wind speed vector. `wind-data-netcdf` directory contains 
monthly mean data (10m level) for four months representing different seasons:

- December -> winter
- March -> spring
- June -> summer
- September -> fall

Original data is in NetCDF format (binary). It's been converted to JSON using `scripts/convert-wind-data.js` script:

```bash
node scripts/convert-wind-data.js <u-dataset> <v-dataset> <json-file-output> <format-geosjon|simple>, e.g.:  
node scripts/convert-wind-data.js wind-data-netcdf/dec-u.nc wind-data-netcdf/dec-v.nc wind-data-json/dec-wind.json geojson
```

This script depends on `ncdump` tool. On OSX, it's part of the netcdf package that can be installed using Homebrew:
```bash
brew install netcdf
```

GeoJSON format has been used to visualize this data on http://geojson.io and compare to non-averaged, real data for a single 
day in a given month. The main purpose of that was to check whether some local, temporal pressure systems are visible in 
the NOAA averaged data. It would be problematic, as these pressure systems are supposed to be added by users of our model. 
Fortunately, it seems the averaged data does not present them. `wind-data-comparision` contains results of this comparision.
`<month>-real-wind.png` images come from https://earth.nullschool.net/ and they clearly show some local, temporal
pressure systems in contrast to `<month>-avg-wind.png` images showing NOAA averaged data.

Simple format (`<month>-simple.json` files) will be used by the model itself. GeoJSON is a bit verbose and its 
main advantage is that we can simply visualize it using various online tools. 
