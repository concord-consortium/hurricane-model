import { temperatureAnomalyMax, temperatureAnomalyMin } from "../models/constants";
import { namedRegions } from "../types";
import { isInsideRegion } from "./region";
import { temperatureAnomalyRegions, anomalyFillColor } from "./regions";

describe("temperatureAnomalyRegions", () => {
  it("each region's anchor falls inside its own polygon", () => {
    for (const key of namedRegions) {
      const { anchor, region } = temperatureAnomalyRegions[key];
      expect(isInsideRegion(anchor, region)).toBe(true);
    }
  });

  it("exposes a ±3 clamp range", () => {
    expect(temperatureAnomalyMin).toBe(-3);
    expect(temperatureAnomalyMax).toBe(3);
  });

  it("anomalyFillColor is white at 0 and shifts blue/red at the extremes", () => {
    expect(anomalyFillColor(0)).toBe("rgb(255, 255, 255)");
    expect(anomalyFillColor(-3)).toBe("rgb(34, 85, 204)");   // #2255cc
    expect(anomalyFillColor(3)).toBe("rgb(198, 40, 40)");    // #c62828
  });
});
