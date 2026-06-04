import { StartLocation } from "../types";

// Expands startLocation if it's an ICoordinates object so it can be saved or loaded properly
export function safeStartLocation(startLocation: StartLocation) {
  return typeof startLocation === "string" ? startLocation : { ...startLocation };
}
