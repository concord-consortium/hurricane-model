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
