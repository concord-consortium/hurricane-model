export const maxHurricaneSpeed = 20000;
export const minHurricaneSpeed = 500;

// Based on: https://www.nhc.noaa.gov/aboutsshws.php, but converted to m/s.
export const hurricaneMaxWindSpeedByCategory = [
  33, // category 0, max speed that doesn't classify as hurricane yet
  43, // category 1
  49, // category 2
  58, // category 3
  70, // category 4
  Infinity // category 5
];

export interface CategoryInfo {
  maxWindSpeed: number;
  name: string;
  nameShort: string;
  startingWindSpeed: number;
  windRange: string;
}

export const hurricaneCategoryInfo: CategoryInfo[] = [
  {
    maxWindSpeed: hurricaneMaxWindSpeedByCategory[0],
    name: "Tropical Storm",
    nameShort: "TS",
    startingWindSpeed: 24,
    windRange: "39-73"
  },
  {
    maxWindSpeed: hurricaneMaxWindSpeedByCategory[1],
    name: "Category 1",
    nameShort: "1",
    startingWindSpeed: hurricaneMaxWindSpeedByCategory[0] + 1,
    windRange: "74-95"
  },
  {
    maxWindSpeed: hurricaneMaxWindSpeedByCategory[2],
    name: "Category 2",
    nameShort: "2",
    startingWindSpeed: hurricaneMaxWindSpeedByCategory[1] + 1,
    windRange: "96-110"
  },
  {
    maxWindSpeed: hurricaneMaxWindSpeedByCategory[3],
    name: "Category 3",
    nameShort: "3",
    startingWindSpeed: hurricaneMaxWindSpeedByCategory[2] + 1,
    windRange: "111-129"
  },
  {
    maxWindSpeed: hurricaneMaxWindSpeedByCategory[4],
    name: "Category 4",
    nameShort: "4",
    startingWindSpeed: hurricaneMaxWindSpeedByCategory[3] + 1,
    windRange: "130-156"
  },
  {
    maxWindSpeed: hurricaneMaxWindSpeedByCategory[5],
    name: "Category 5",
    nameShort: "5",
    startingWindSpeed: hurricaneMaxWindSpeedByCategory[4] + 1,
    windRange: "≥157"
  },
];

export const maxWindSpeed = 85; // m/s, a

export const temperatureAnomalyMin = -3;
export const temperatureAnomalyMax = 3;

// Half-width of the smoothstep band that feathers an anomaly across a region
// boundary, in degrees (~110 km). Full transition band is twice this. The drawn
// polygon is the half-strength contour.
export const temperatureAnomalyFeatherHalfWidth = 1.0;
