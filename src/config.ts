import {LatLngBoundsLiteral} from "leaflet";

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
  authoring: false,
  // Sets base wind data (and sea temperature in the future). "fall", "winter", "spring", or "summer".
  season: "fall",
  // One of the available maps: "satellite", "relief", "street" or "population".
  map: "satellite",
  // Enabled map overlay. One of the values listed in "availableOverlays".
  overlay: "sst",
  // LatLngBoundsLiteral: [[lat, lng], [lat, lng]]. Defaults to North Atlantic.
  initialBounds: [[5, -90], [50, -10]],
  pressureSystems: [
    {
      type: "high",
      center: {lat: 28, lng: -30},
      strength: 19.5
    },
    {
      type: "high",
      center: {lat: 28.8, lng: -62.4},
      strength: 13.6
    },
    {
      type: "low",
      center: {lat: 45, lng: -82},
      strength: 6
    },
    {
      type: "low",
      center: {lat: 47, lng: -60},
      strength: 7
    }
  ],
  availableOverlays: [
    "sst",
    "precipitation",
    "stormSurge"
  ],
  // If set to false, user won't be able to drag and zoom map.
  navigation: true,
  timestep: 1,
  pressureSystemStrength: 15, // max wind speed, m/s
  lowPressureSysAngleOffset: 23, // deg
  highPressureSysAngleOffset: 8, // deg
  hurricaneStrength: 24, // max wind speed, m/s
  // Land temperature controls how fast the hurricane dies when it hits the land.
  // The smaller the number, the quicker it happens.
  landTemperature: 22,
  // Wind shear is present in winter and spring and it will cause hurricanes to die pretty fast.
  windShearStrength: 0.0015,
  initialHurricanePosition: {lat: 10.5, lng: -20},
  initialHurricaneSpeed: {u: 0, v: 0},
  // When wind is far enough from the center of the pressure system, pressure system effect is lower
  // and we start smoothing it out.
  smoothPressureSystemRatio: 0.75,
  // If hurricane is weaker, the model will stop and the hurricane will disappear.
  minHurricaneStrength: 10, // max wind speed, m/s
  // Min distance between two pressure systems.
  minPressureSystemDistance: 700000, // m
  // Min distance between low pressure systems and hurricane required for them to merge together.
  minPressureSystemMergeDistance: 400000, // m
  // Ratio describing how hard is the global wind pushing hurricane.
  globalWindToAcceleration: 100,
  // The bigger momentum, the longer hurricane will follow its own path, ignoring global wind.
  pressureSysMomentum: 0.92,
  // Length of single track segment in model ticks.
  trackSegmentLength: 15,
  // How often SST and hurricane intensity change should be updated.
  // Smaller value means more checks and more averaged results. Larger value means that values are picked less
  // frequently and the final results are more random (smaller number of samples, more variability).
  sstCheckInterval: 60,
  // Whether model is deterministic or random. Use true if you want your results to be replicable.
  deterministic: false,
  // Each time the landfall happens the model will show a clickable rectangle around it so user can zoom in.
  markLandfalls: false,
  // Show the hurricane strength category changes along the path
  categoryChangeMarkers: true,
  windArrows: true,
  hurricaneImage: false,
  // The regular version of sea surface temperature overlay (not color blind friendly that always has opacity=1).
  seaSurfaceTempOpacity: 0.8,
  // Enables steps per second display.
  benchmark: false,
  // If set to true, users won't be able to change pressure systems.
  pressureSystemsLocked: false,
  lockSimulationWhileRunning: true,
  // Default sea surface temperature image, available values are: "default", "rainbowCC"
  defaultSSTScale: "default",
  // Color blind accessible sea surface temperature image, available values are: "purple3", "purpleCC"
  colorBlindSSTScale: "purple3",
  // --- UI elements can be shown or hidden using options below ---
  seasonButton: true,
  windArrowsToggle: true,
  hurricaneImageToggle: true
  // --- End of UI widgets ---
};

const urlConfig: any = {};

function isArray(value: any) {
  return typeof value === "string" && value.match(/^\[.*\]$/);
}

function isJSON(value: any) {
  if (typeof value !== "string") {
    return false;
  }
  try {
    JSON.parse(value);
    return true;
  } catch (e) {
    return false;
  }
}

Object.keys(DEFAULT_CONFIG).forEach((key) => {
  const urlValue: any = getURLParam(key);
  if (urlValue === true || urlValue === "true") {
    urlConfig[key] = true;
  } else if (urlValue === "false") {
    urlConfig[key] = false;
  } else if (isJSON(urlValue)) {
    urlConfig[key] = JSON.parse(urlValue);
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
