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

## Sea Surface Temperature

Sea Surface Temperature (SST) affects intensity of the hurricane. The warmer ocean is, the more intense hurricane gets.
This model uses data coming from NASA:
- https://podaac.jpl.nasa.gov/dataset/MODIS_AQUA_L3_SST_MID-IR_MONTHLY_4KM_NIGHTTIME_V2014.0
- ftp://podaac-ftp.jpl.nasa.gov/allData/modis/L3/aqua/4um/v2014.0/4km/monthly/2018/

Interactive visualization:
- https://worldview.earthdata.nasa.gov/?p=geographic&l=MODIS_Aqua_L3_SST_MidIR_4km_Night_Monthly,Reference_Labels(hidden),Reference_Features,Coastlines(hidden)&t=2018-09-19-T00%3A00%3A00Z&z=3&v=-144.11630581918422,-22.21990140009921,35.883694180815795,68.41291109990078

`sea-surface-temp-netcdf` directory contains monthly mean data for four months representing different seasons:

- December -> winter
- March -> spring
- June -> summer
- September -> fall

Original data is in NetCDF format (binary). It's been converted to PNG images using `scripts/convert-sea-surface-temp-to-png.js` script.

```bash
node --max-old-space-size=4092 scripts/convert-sea-surface-temp-to-png.js <dataset> <png-file-output>, e.g.:
node --max-old-space-size=4092 scripts/convert-sea-surface-temp-to-png.js sea-surface-temp-netcdf/dec.nc sea-surface-temp-json/dec.png 
```
 
Note that `--max-old-space-size=4092` param is required, as reading converted files takes a lot of memory.
Points that are over land, not sea, will be transparent.

This script uses `src/temperature-scale.js` file to map between temperatures and colors.

The same helper is used by the simulation engine to do the reverse mapping - color to temperature.
It lets us use the same image data for visualization and simulation needs. PNG has lots of advantages compared to raw
JSON data. It's compressed and lets us cover area way more precisely than JSON data with similar size.

**IMPORTANT**
If you ever change anything in `src/temperature-scale.js`, remember to run all the conversion scripts and generate
sea surface temperature images again. They need to stay in sync with temperature scale.


