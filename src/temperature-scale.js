// This file is using vanilla JS and CommonJS modules, as it's also used by scripts/convert-sea-surface-temp-to-png.js
// !!!IMPORTANT!!! If you change any color here or parameter / constant, remember to run this script to generate all the
// sea temperature overlay images again. They are used together with this scale to read temperature from image data,
// in the simulation engine, so they need to stay in sync.
const { scaleLinear } = require("d3-scale");
const maxTemp = 32;
// Note that all the input values are limited to 2 decimal digits. That lets us limit number of possible output
// values and create inverted scale. This inverted scale can be used to map color to exact temperature.
const step = 0.01; // These two values need to stay in sync.
const decimalDigits = 2; // These two values need to stay in sync.

const colorRange = {
  // This scale is based on the reference scale: scale-default.png.
  // Colors are read from the image at given (x, <any>) positions.
  // Scale and data is taken from:
  // https://worldview.earthdata.nasa.gov/?p=geographic&l=MODIS_Aqua_L3_SST_MidIR_4km_Night_Monthly,Reference_Labels(hidden),Reference_Features,Coastlines(hidden)&t=2018-12-24-T00%3A00%3A00Z&z=3&v=-189.26841180955438,-57.36811129919708,170.73158819044562,123.89751370080292
  default: [
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
  ],
  // Based on: https://app.zeplin.io/project/5d06aafd2d682519ca37b899/screen/6151d9ca3f02f01bd841054d, 9-color span.
  purpleCC: [
    "#2e0063",
    "#500088",
    "#831f70",
    "#ae4556",
    "#d66b3a",
    "#fd9709",
    "#fec32f",
    "#ffeb4c",
    "#ffff71"
  ],
  // This scale is based on the reference scale: scale-purple3.png.
  // Colors are read from the image, from edges and at each X axis tick.
  // Scale and data is taken from:
  // https://worldview.earthdata.nasa.gov/?p=geographic&l=MODIS_Aqua_L3_SST_MidIR_4km_Night_Monthly,Reference_Labels(hidden),Reference_Features,Coastlines(hidden)&t=2018-12-24-T00%3A00%3A00Z&z=3&v=-189.26841180955438,-57.36811129919708,170.73158819044562,123.89751370080292
  purple3: [
    "#01054b",
    "#230678",
    "#6a007e",
    "#a80073",
    "#de145f",
    "#f55741",
    "#f78f30",
    "#fac42e",
    "#f4f93d"
  ],
  // Based on: https://app.zeplin.io/project/5d06aafd2d682519ca37b899/screen/6151d9ca3f02f01bd841054d, rainbow, bunched up version.
  // Colors are taken from: scale-rainbowCC.png, every 60px.
  rainbowCC: [
    "#da3ec3", // 594px
    "#c500b8", // 540px
    "#9700e1", // 480px
    "#6d16fc", // 420px
    "#4069fe", // 360px
    "#01cdff", // 300px
    "#00eeb2", // 240px
    "#05c904", // 180px
    "#b2ef00", // 120px
    "#ffa700", // 60px
    "#ff6b3e", // 0px
  ]
};

const scale = {};

const invertedScale = {};

Object.keys(colorRange).forEach(scaleName => {
  scale[scaleName] = scaleLinear()
    .domain(colorRange[scaleName].map((c, idx) => maxTemp * idx / colorRange[scaleName].length))
    .range(colorRange[scaleName]);

  invertedScale[scaleName] = {};
  for (let i = 0; i <= maxTemp; i += step) {
    i = Number(i.toFixed(decimalDigits));
    invertedScale[scaleName][scale[scaleName](i)] = i;
  }
});

exports.temperatureScale = (temperature, scaleName = "default") => {
  // Limit value to two decimal digits. There is more about that in general comments at the top of this file.
  return scale[scaleName](Number(temperature.toFixed(decimalDigits)));
};

exports.invertedTemperatureScale = (color, scaleName = "default") => {
  return invertedScale[scaleName][color] ? invertedScale[scaleName][color] : null;
};
