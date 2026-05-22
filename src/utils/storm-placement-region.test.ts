import { clampToRegion, isInsideRegion } from "./region";
import { stormPlacementRegion } from "./storm-placement-region";

describe("stormPlacementRegion", () => {
  it("contains a known mid-Atlantic point", () => {
    // Roughly the central Atlantic, well inside the basin.
    expect(isInsideRegion({ lat: 25, lng: -50 }, stormPlacementRegion)).toBe(true);
  });

  it("does not contain a Pacific point", () => {
    expect(isInsideRegion({ lat: 25, lng: -130 }, stormPlacementRegion)).toBe(false);
  });

  it("clamps a Pacific point back onto the boundary", () => {
    const snapped = clampToRegion({ lat: 25, lng: -130 }, stormPlacementRegion);
    // nearestPointOnLine returns a point exactly on the boundary, but turf's
    // booleanPointInPolygon can return false due to floating-point precision.
    // Instead, assert the snapped point landed near the basin's western edge
    // (around lng -97 at this latitude).
    expect(snapped.lng).toBeGreaterThan(-100);
    expect(snapped.lng).toBeLessThan(-80);
  });
});
