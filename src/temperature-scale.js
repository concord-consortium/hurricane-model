// This file is using vanilla JS and CommonJS modules, as it's also used by scripts/convert-sea-surface-temp-to-png.js
// !!!IMPORTANT!!! If you change any color here or parameter / constant, remember to run this script to generate all the
// sea temperature overlay images again. They are used together with this scale to read temperature from image data,
// in the simulation engine, so they need to stay in sync.
const { scaleLinear } = require("d3-scale");
// This scale is based on the reference scale: tempScaleKey.png.
// Colors are read from the image at given (x, <any>) positions.
// Scale and data is taken from:
// https://worldview.earthdata.nasa.gov/?p=geographic&l=MODIS_Aqua_L3_SST_MidIR_4km_Night_Monthly,Reference_Labels(hidden),Reference_Features,Coastlines(hidden)&t=2018-12-24-T00%3A00%3A00Z&z=3&v=-189.26841180955438,-57.36811129919708,170.73158819044562,123.89751370080292
// There's more information in readme.
const maxTemp = 32;
// Note that all the input values are limited to 2 decimal digits. That lets us limit number of possible output
// values and create inverted scale. This inverted scale can be used to map color to exact temperature.
const step = 0.01; // These two values need to stay in sync.
const decimalDigits = 2; // These two values need to stay in sync.

const colorRange = [
  "#280419", // 0px
  "#53124b", // 100px
  "#6a1d6f",
  "#2e124f",
  "#1d2764", // 400px
  "#214791",
  "#3379c1",
  "#47aaef", // 700px
  "#4cae35",
  "#c4e547",
  "#fbc842", // 1000px
  "#f37f2e",
  "#d44b1f",
  "#962610", // 1300px
  "#651207", // 1375px
];

const scale = scaleLinear()
  .domain(colorRange.map((c, idx) => maxTemp * idx / colorRange.length))
  .range(colorRange);

const invertedScale = {};
for (let i = 0; i <= maxTemp; i += step) {
  i = Number(i.toFixed(decimalDigits));
  invertedScale[scale(i)] = i;
}

exports.temperatureScale = (temperature) => {
  // Limit value to two decimal digits. There is more about that in general comments at the top of this file.
  return scale(Number(temperature.toFixed(decimalDigits)));
};

exports.invertedTemperatureScale = (color) => {
  return invertedScale[color] ? invertedScale[color] : null;
};
