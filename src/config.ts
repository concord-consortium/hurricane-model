function getURLParam(name: string) {
  const url = (self || window).location.href;
  name = name.replace(/[[]]/g, "\\$&");
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`);
  const results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return true;
  return decodeURIComponent(results[2].replace(/\+/g, " "));
}

const DEFAULT_CONFIG: any = {
  // Sets base wind data (and sea temperature in the future). "fall", "winter", "spring", or "summer".
  season: "fall",
  // If set to false, user won"t be able to drag and zoom map.
  navigation: false,

  timestep: 1,
  pressureSystemStrength: 1200000,
  pressureSystemIntensityGradient: 2,
  lowPressureSysAngleOffset: 20, // deg
  highPressureSysAngleOffset: 8, // deg
  hurricaneStrength: 2700000,
  hurricaneStrengthGradient: 0.37,
  initialHurricanePosition: {lat: 20, lng: -20},
  initialHurricaneSpeed: {u: 0, v: 0},
  // When wind is far enough from the center of the pressure system, pressure system effect is lower
  // and we start smoothing it out.
  smoothPressureSystemRatio: 0.75,
  // Min distance between two pressure systems.
  minPressureSystemDistance: 700000, // m
  // Ratio describing how hard is the global wind pushing hurricane.
  globalWindToAcceleration: 100,
  // The bigger momentum, the longer hurricane will follow its own path, ignoring global wind.
  pressureSysMomentum: 0.92
};

const urlConfig: any = {};

function isArray(value: any) {
  return typeof value === "string" && value.match(/^\[.*\]$/);
}

Object.keys(DEFAULT_CONFIG).forEach((key) => {
  const urlValue: any = getURLParam(key);
  if (urlValue === true || urlValue === "true") {
    urlConfig[key] = true;
  } else if (urlValue === "false") {
    urlConfig[key] = false;
  } else if (isArray(urlValue)) {
    // Array can be provided in URL using following format:
    // &parameter=[value1,value2,value3]
    if (urlValue === "[]") {
      urlConfig[key] = [];
    } else {
      urlConfig[key] = urlValue!.substring(1, urlValue!.length - 1).split(",");
    }
  } else if (urlValue !== null && !isNaN(urlValue)) {
    // !isNaN(string) means isNumber(string).
    urlConfig[key] = parseFloat(urlValue);
  } else if (urlValue !== null) {
    urlConfig[key] = urlValue;
  }
});

const finalConfig = Object.assign({}, DEFAULT_CONFIG, urlConfig);
export default finalConfig;
