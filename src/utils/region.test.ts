import { FeatureCollection } from "geojson";
import { createRegion, isInsideRegion, clampToRegion } from "./region";

// Unit square with corners at (0,0), (1,0), (1,1), (0,1). Coordinates are [lng, lat].
const unitSquarePolygonFC: FeatureCollection = {
  type: "FeatureCollection",
  features: [{
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]
    }
  }]
};

// Same square but expressed as an open LineString (no closing coord).
const unitSquareLineStringFC: FeatureCollection = {
  type: "FeatureCollection",
  features: [{
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      coordinates: [[0, 0], [1, 0], [1, 1], [0, 1]]
    }
  }]
};

describe("region", () => {
  describe("createRegion", () => {
    it("accepts a Polygon FeatureCollection", () => {
      const region = createRegion(unitSquarePolygonFC);
      expect(region.latLngs).toEqual([[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]);
    });

    it("accepts a LineString FeatureCollection and closes the ring automatically", () => {
      const region = createRegion(unitSquareLineStringFC);
      // First and last latLng should be equal (ring closed).
      expect(region.latLngs[0]).toEqual(region.latLngs[region.latLngs.length - 1]);
    });
  });

  describe("isInsideRegion", () => {
    const region = createRegion(unitSquarePolygonFC);

    it("returns true for an interior point", () => {
      expect(isInsideRegion({ lat: 0.5, lng: 0.5 }, region)).toBe(true);
    });

    it("returns false for an exterior point", () => {
      expect(isInsideRegion({ lat: 2, lng: 2 }, region)).toBe(false);
    });
  });

  describe("clampToRegion", () => {
    const region = createRegion(unitSquarePolygonFC);

    it("returns the same coords for an interior point", () => {
      const coords = { lat: 0.3, lng: 0.4 };
      expect(clampToRegion(coords, region)).toEqual(coords);
    });

    it("snaps a point directly outside the right edge to that edge", () => {
      // Point at (lng=2, lat=0.5) — nearest point on the square is (lng=1, lat=0.5).
      const snapped = clampToRegion({ lat: 0.5, lng: 2 }, region);
      expect(snapped.lng).toBeCloseTo(1, 5);
      expect(snapped.lat).toBeCloseTo(0.5, 3);   // turf uses geodesic math; ~1e-4 drift off-equator
    });

    it("snaps a point directly below the bottom edge to that edge", () => {
      const snapped = clampToRegion({ lat: -1, lng: 0.5 }, region);
      expect(snapped.lat).toBeCloseTo(0, 5);
      expect(snapped.lng).toBeCloseTo(0.5, 5);
    });
  });
});
