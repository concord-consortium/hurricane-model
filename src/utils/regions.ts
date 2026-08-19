import { FeatureCollection } from "geojson";
import { scaleLinear } from "d3-scale";

import { coldColor, warmColor } from "../components/common";
import { temperatureAnomalyMax, temperatureAnomalyMin } from "../constants";
import { ICoordinates, NamedRegion } from "../types";
import { Region, createRegion } from "./region";

import gulfData from "../data/regions/gulf-temp-anomaly-region.json";
import caribbeanData from "../data/regions/caribbean-temp-anomaly-region.json";
import centralAtlanticData from "../data/regions/central-atlantic-temp-anomaly-region.json";
import coastalAfricaData from "../data/regions/coastal-africa-temp-anomaly-region.json";

export interface NamedRegionData {
  label: string;
  shortLabel: string; // compact form used on the run cards + Compare table (the section control uses label)
  anchor: ICoordinates; // Where the centered map control is placed.
  region: Region;
}

export const temperatureAnomalyRegions: Record<NamedRegion, NamedRegionData> = {
  gulf: {
    label: "Gulf",
    shortLabel: "Gulf",
    anchor: { lat: 24.7, lng: -89.7 },
    region: createRegion(gulfData as FeatureCollection)
  },
  caribbean: {
    label: "Caribbean",
    shortLabel: "Caribbean",
    anchor: { lat: 17, lng: -74 },
    region: createRegion(caribbeanData as FeatureCollection)
  },
  centralAtlantic: {
    label: "Central Atlantic",
    shortLabel: "C. Atlantic",
    anchor: { lat: 17, lng: -45 },
    region: createRegion(centralAtlanticData as FeatureCollection)
  },
  coastalAfrica: {
    label: "Coastal Africa",
    shortLabel: "C. Africa",
    anchor: { lat: 17, lng: -20 },
    region: createRegion(coastalAfricaData as FeatureCollection)
  }
};

// d3-scale's default interpolator detects hex color strings and interpolates them in
// RGB, returning an "rgb(r, g, b)" string. clamp(true) keeps values within [-3, 3].
const colorScale = scaleLinear<string>()
  .domain([temperatureAnomalyMin, 0, temperatureAnomalyMax])
  .range([coldColor, "#ffffff", warmColor])
  .clamp(true);

export function anomalyFillColor(anomaly: number): string {
  return colorScale(anomaly);
}

export function clampAnomaly(value: number) {
  return Math.max(temperatureAnomalyMin, Math.min(temperatureAnomalyMax, value));
}
