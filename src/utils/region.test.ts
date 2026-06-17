import { FeatureCollection } from "geojson";
import {
  createRegion, isInsideRegion, clampToRegion, snapToRegionPreservingAxis, featherWeight, signedDistanceToRegion
} from "./region";

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

  describe("snapToRegionPreservingAxis", () => {
    const region = createRegion(unitSquarePolygonFC);

    it("returns null when the target line does not cross the region", () => {
      // lat = 5 is far above the unit square.
      expect(snapToRegionPreservingAxis(region, "lat", { lat: 5, lng: 0.5 })).toBeNull();
      // lng = -3 is far left of the unit square.
      expect(snapToRegionPreservingAxis(region, "lng", { lat: 0.5, lng: -3 })).toBeNull();
    });

    it("returns the preferred other axis when it lies inside the valid interval", () => {
      // lat = 0.5 crosses the square; preferred lng = 0.3 is inside [0, 1].
      const snapped = snapToRegionPreservingAxis(region, "lat", { lat: 0.5, lng: 0.3 });
      expect(snapped).not.toBeNull();
      expect(snapped!.lat).toBeCloseTo(0.5, 5);
      expect(snapped!.lng).toBeCloseTo(0.3, 5);
    });

    it("clamps the preferred other axis to the interval edge when outside the valid range", () => {
      // lat = 0.5 crosses the square at lng in [0, 1]. Preferred lng = 2 → clamps to 1.
      const high = snapToRegionPreservingAxis(region, "lat", { lat: 0.5, lng: 2 });
      expect(high!.lng).toBeCloseTo(1, 5);
      expect(high!.lat).toBeCloseTo(0.5, 5);

      // Preferred lng = -3 → clamps to 0.
      const low = snapToRegionPreservingAxis(region, "lat", { lat: 0.5, lng: -3 });
      expect(low!.lng).toBeCloseTo(0, 5);
      expect(low!.lat).toBeCloseTo(0.5, 5);
    });

    it("works for fixing the lng axis as well", () => {
      const snapped = snapToRegionPreservingAxis(region, "lng", { lat: -1, lng: 0.25 });
      expect(snapped!.lng).toBeCloseTo(0.25, 5);
      expect(snapped!.lat).toBeCloseTo(0, 5);
    });
  });
});

describe("signedDistanceToRegion", () => {
  const region = createRegion(unitSquarePolygonFC);

  it("gives correct values", () => {
    // Center is 0.5deg from every edge; nearest edge is 0.5 (in latitude-degree units).
    expect(signedDistanceToRegion({ lat: 0.5, lng: 0.5 }, region)).toBeCloseTo(0.5, 1);

    // ~0 on the boundary
    expect(signedDistanceToRegion({ lat: 1, lng: 0 }, region)).toBeCloseTo(0, 1);

    // negative just outside. 1 degree north of the top edge.
    expect(signedDistanceToRegion({ lat: 2, lng: 0 }, region)).toBeCloseTo(-1, 1);

    // measures to the nearest corner for a diagonal point
    // (lng 4, lat 4) sits diagonally outside the (1,1) corner; the nearest point on
    // the ring is that vertex (both adjacent edges clamp their foot to it). Planar
    // distance with lng scaled by cos(4deg): sqrt(((4-1)*cos4)^2 + (4-1)^2) ~= 4.22,
    // negative because it is outside.
    expect(signedDistanceToRegion({ lat: 4, lng: 4 }, region)).toBeCloseTo(-4.22, 1);

    // grows in magnitude moving away from the edge
    const near = signedDistanceToRegion({ lat: 2, lng: 0 }, region);
    const far = signedDistanceToRegion({ lat: 5, lng: 0 }, region);
    expect(far).toBeLessThan(near); // both negative, far is more negative
  });
});

describe("featherWeight", () => {
  const half = 1; // 1 degree half-width

  it("gives the correct values based on band", () => {
    // 1 a half-width inside
    expect(featherWeight(half, half)).toBeCloseTo(1, 5);
    // .5 on the boundary
    expect(featherWeight(0, half)).toBeCloseTo(0.5, 5);
    // 0 a half-width outside
    expect(featherWeight(-half, half)).toBeCloseTo(0, 5);
    // saturates beyond the band
    expect(featherWeight(5, half)).toBe(1);
    expect(featherWeight(-5, half)).toBe(0);
  });
});
