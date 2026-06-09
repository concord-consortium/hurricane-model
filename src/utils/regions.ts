import { FeatureCollection } from "geojson";
import { scaleLinear } from "d3-scale";

import { ICoordinates, NamedRegion } from "../types";
import { Region, createRegion } from "./region";

import gulfData from "../data/regions/gulf-temp-anomaly-region.json";
import caribbeanData from "../data/regions/caribbean-temp-anomaly-region.json";
import centralAtlanticData from "../data/regions/central-atlantic-temp-anomaly-region.json";
import coastalAfricaData from "../data/regions/coastal-africa-temp-anomaly-region.json";

export const TEMP_ANOMALY_MIN = -3;
export const TEMP_ANOMALY_MAX = 3;

export interface NamedRegionData {
  label: string;
  // Where the centered map control is placed.
  anchor: ICoordinates;
  region: Region;
}

export const temperatureAnomalyRegions: Record<NamedRegion, NamedRegionData> = {
  gulf: {
    label: "Gulf",
    anchor: { lat: 24.77, lng: -90.92 },
    region: createRegion(gulfData as FeatureCollection)
  },
  caribbean: {
    label: "Caribbean",
    anchor: { lat: 16.88, lng: -76.92 },
    region: createRegion(caribbeanData as FeatureCollection)
  },
  centralAtlantic: {
    label: "Central Atlantic",
    anchor: { lat: 15.95, lng: -59.39 },
    region: createRegion(centralAtlanticData as FeatureCollection)
  },
  coastalAfrica: {
    label: "Coastal Africa",
    anchor: { lat: 15, lng: -20 },
    region: createRegion(coastalAfricaData as FeatureCollection)
  }
};

// d3-scale's default interpolator detects hex color strings and interpolates them in
// RGB, returning an "rgb(r, g, b)" string. clamp(true) keeps values within [-3, 3].
const colorScale = scaleLinear<string>()
  .domain([TEMP_ANOMALY_MIN, 0, TEMP_ANOMALY_MAX])
  .range(["#2255cc", "#ffffff", "#c62828"])
  .clamp(true);

export function anomalyFillColor(anomaly: number): string {
  return colorScale(anomaly);
}
