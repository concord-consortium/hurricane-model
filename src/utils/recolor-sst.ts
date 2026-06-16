import { PNG } from "pngjs";
import { CRS, Point } from "leaflet";
import { rgb } from "d3-color";
import { temperatureScale, invertedTemperatureScale, maxTemp, minTemp } from "../temperature-scale";
import { ICoordinates } from "../types";
import { Region } from "./region";

interface RecolorParams {
  png: PNG;
  scaleName: string;
  regions: Region[]; // regions whose anomaly is nonzero (used only for bounding-box bounds)
  // Temperature delta (°C) to apply at a coordinate. MUST return 0 for coordinates
  // outside any active region: recolorSSTImage iterates the rectangular bounding box
  // of the regions, so pixels inside the box but outside the (non-rectangular) polygons
  // rely on this returning 0 to be left unchanged.
  getTempDelta: (coords: ICoordinates) => number;
}

interface PixelBox { minX: number; minY: number; maxX: number; maxY: number; }

function pixelBoundingBox(regions: Region[], zoom: number, width: number, height: number): PixelBox | null {
  let latMin = Infinity, latMax = -Infinity, lngMin = Infinity, lngMax = -Infinity;
  for (const region of regions) {
    for (const [lat, lng] of region.latLngs) {
      if (lat < latMin) latMin = lat;
      if (lat > latMax) latMax = lat;
      if (lng < lngMin) lngMin = lng;
      if (lng > lngMax) lngMax = lng;
    }
  }

  // Return null if there are no region boundaries
  if (latMin === Infinity) return null;

  // Higher latitude projects to a smaller y, so latMax -> top, latMin -> bottom.
  const topLeft = CRS.EPSG3857.latLngToPoint({ lat: latMax, lng: lngMin }, zoom);
  const bottomRight = CRS.EPSG3857.latLngToPoint({ lat: latMin, lng: lngMax }, zoom);
  return {
    minX: Math.max(0, Math.floor(topLeft.x)),
    minY: Math.max(0, Math.floor(topLeft.y)),
    maxX: Math.min(width - 1, Math.ceil(bottomRight.x)),
    maxY: Math.min(height - 1, Math.ceil(bottomRight.y)),
  };
}

function toDataUrl(png: PNG): string {
  return "data:image/png;base64," + PNG.sync.write(png).toString("base64");
}

export function recolorSSTImage({ png, scaleName, regions, getTempDelta }: RecolorParams): string {
  const { width, height } = png;
  const out = new PNG({ width, height });
  out.data.set(png.data);

  const zoom = CRS.EPSG3857.zoom(width);
  const box = pixelBoundingBox(regions, zoom, width, height);
  if (!box) return toDataUrl(out);

  for (let y = box.minY; y <= box.maxY; y++) {
    for (let x = box.minX; x <= box.maxX; x++) {
      const idx = (width * y + x) << 2;
      if (out.data[idx + 3] === 0) continue; // land

      const coords = CRS.EPSG3857.pointToLatLng(new Point(x, y), zoom);
      const delta = getTempDelta(coords);
      if (delta === 0) continue;

      const baseColor = `rgb(${out.data[idx]}, ${out.data[idx + 1]}, ${out.data[idx + 2]})`;
      const temp = invertedTemperatureScale(baseColor, scaleName);
      if (temp == null) continue;

      const clamped = Math.max(minTemp, Math.min(maxTemp, temp + delta));
      const color = rgb(temperatureScale(clamped, scaleName));
      if (Number.isNaN(color.r)) continue; // unparseable color — leave the base pixel untouched

      out.data[idx] = Math.round(color.r);
      out.data[idx + 1] = Math.round(color.g);
      out.data[idx + 2] = Math.round(color.b);
    }
  }
  return toDataUrl(out);
}
