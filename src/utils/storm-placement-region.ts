import { FeatureCollection } from "geojson";
import regionData from "../data/regions/storm-placement-region.json";
import { createRegion } from "./region";

export const stormPlacementRegion = createRegion(regionData as FeatureCollection);
