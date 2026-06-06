import { FeatureCollection } from "geojson";
import { createRegion } from "./region";
import regionData from "../data/regions/storm-placement-region.json";

export const stormPlacementRegion = createRegion(regionData as FeatureCollection);
