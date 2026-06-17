import { Feature, FeatureCollection, LineString, Polygon } from "geojson";
import { point, polygon as turfPolygon, lineString } from "@turf/helpers";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import nearestPointOnLine from "@turf/nearest-point-on-line";
import { ICoordinates } from "../types";

export interface Region {
  polygon: Feature<Polygon>;
  ring: Feature<LineString>;
  latLngs: [number, number][];
}

export function createRegion(data: FeatureCollection): Region {
  const geom = data.features?.[0]?.geometry;
  if (!geom) {
    throw new Error("createRegion requires a FeatureCollection with at least one feature with a geometry");
  }

  const ring = geom.type === "Polygon"
    ? geom.coordinates[0]
    : geom.type === "LineString"
    ? geom.coordinates
    : [];
  if (!ring.length) {
    throw new Error("createRegion requires a Polygon or LineString with at least one coordinate");
  }

  const first = ring[0];
  const last = ring[ring.length - 1];
  const closed = first[0] === last[0] && first[1] === last[1] ? ring : [...ring, first];
  return {
    polygon: turfPolygon([closed]),
    ring: lineString(closed),
    latLngs: closed.map(([lng, lat]) => [lat, lng]),
  };
}

export function isInsideRegion(coords: ICoordinates, region: Region): boolean {
  return booleanPointInPolygon(point([coords.lng, coords.lat]), region.polygon);
}

export function clampToRegion(coords: ICoordinates, region: Region): ICoordinates {
  if (isInsideRegion(coords, region)) return coords;
  const snapped = nearestPointOnLine(region.ring, point([coords.lng, coords.lat]));
  const [lng, lat] = snapped.geometry.coordinates;
  return { lat, lng };
}

export function snapToRegionPreservingAxis(
  region: Region,
  axis: "lat" | "lng",
  coords: ICoordinates
): ICoordinates | null {
  if (isInsideRegion(coords, region)) return coords;

  const [target, preferredOther] = axis === "lat" ? [coords.lat, coords.lng] : [coords.lng, coords.lat];
  const ringCoords = region.ring.geometry.coordinates;

  // Check each edge, saving the closest point along an edge that crosses the target line
  let best: number | null = null;
  let bestDist = Infinity;
  for (let i = 0; i < ringCoords.length - 1; i++) {
    // Sort the coords along the primary axis
    const [lng1, lat1] = ringCoords[i];
    const [lng2, lat2] = ringCoords[i + 1];
    const coords = axis === "lat" ? [[lat1, lng1], [lat2, lng2]] : [[lng1, lat1], [lng2, lat2]];
    coords.sort((a, b) => a[0] - b[0]);
    const [[a1, o1], [a2, o2]] = coords;

    // Skip if the target is not within the range of this edge.
    // Include a1 == target, exclude a2 == target to avoid double-counting when target lands on a shared vertex.
    if (target < a1 || target >= a2) continue;

    // Find the other value along the edge at the target value
    const t = (target - a1) / (a2 - a1);
    const crossing = o1 + t * (o2 - o1);

    // Save the other value if it's the closest to the original value
    const dist = Math.abs(crossing - preferredOther);
    if (dist < bestDist) {
      bestDist = dist;
      best = crossing;
    }
  }

  if (best === null) return null;
  return axis === "lat"
    ? { lat: target, lng: best }
    : { lat: best, lng: target };
}

// Planar minimum distance from coords to the region ring,
// in degrees-of-latitude units (lng scaled by cos(lat) for rough isotropy).
// Signed: positive inside, negative outside. Used for edge feathering — turf's
// great-circle nearestPointOnLine is ~400x too slow for the per-pixel recolor.
export function signedDistanceToRegion(coords: ICoordinates, region: Region): number {
  const cosLat = Math.cos((coords.lat * Math.PI) / 180);
  const ring = region.latLngs; // [lat, lng][], closed
  let best = Infinity;
  for (let i = 0; i < ring.length - 1; i++) {
    const ax = (ring[i][1] - coords.lng) * cosLat;
    const ay = ring[i][0] - coords.lat;
    const bx = (ring[i + 1][1] - coords.lng) * cosLat;
    const by = ring[i + 1][0] - coords.lat;
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    let t = len2 ? -(ax * dx + ay * dy) / len2 : 0;
    t = Math.max(0, Math.min(1, t));
    const px = ax + t * dx;
    const py = ay + t * dy;
    const d2 = px * px + py * py;
    if (d2 < best) best = d2;
  }
  const dist = Math.sqrt(best);
  return isInsideRegion(coords, region) ? dist : -dist;
}

// Smoothstep feather weight for a band straddling the region boundary.
// signedDist > 0 inside, < 0 outside (same convention as signedDistanceToRegion).
// Returns 1 a half-width inside, 0.5 on the edge, 0 a half-width outside.
export function featherWeight(signedDist: number, halfWidth: number): number {
  const s = Math.max(0, Math.min(1, (signedDist + halfWidth) / (2 * halfWidth)));
  return s * s * (3 - 2 * s);
}
