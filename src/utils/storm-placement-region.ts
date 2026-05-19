import { FeatureCollection } from "geojson";
import { createRegion } from "./region";
import regionData from "../assets/storm-placement-region.json";

export const stormPlacementRegion = createRegion(regionData as FeatureCollection);
