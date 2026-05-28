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
    const [lng1, lat1] = ringCoords[i];
    const [lng2, lat2] = ringCoords[i + 1];
    const as = axis === "lat" ? [lat1, lat2] : [lng1, lng2];
    as.sort((a, b) => a - b);
    const [a1, a2] = as;

    // Skip if the target is not within the range of this edge.
    // Include a1 == target, exclude a2 == target to avoid double-counting when target lands on a shared vertex.
    if (target < a1 || target >= a2) continue;

    const t = (target - a1) / (a2 - a1);
    const [o1, o2] = axis === "lat" ? [lng1, lng2] : [lat1, lat2];
    const crossing = o1 + t * (o2 - o1);
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
