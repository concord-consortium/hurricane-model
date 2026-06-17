import { PNG } from "pngjs";
import { CRS } from "leaflet";
import { rgb } from "d3-color";
import { recolorSSTImage } from "./recolor-sst";
import { createRegion } from "./region";
import { temperatureScale, invertedTemperatureScale } from "../temperature-scale";
import { FeatureCollection } from "geojson";

// A tiny square region near the equator/prime meridian so pixel math is simple.
const min = -5;
const max = 5;
const tinyRegionData: FeatureCollection = {
  type: "FeatureCollection",
  features: [{
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [[[min, min], [max, min], [max, max], [min, max], [min, min]]]
    }
  }]
};

// Build a fully-opaque PNG painted with the color for a known base temperature.
function makePng(width: number, height: number, baseTempColor: string) {
  const png = new PNG({ width, height });
  const c = rgb(baseTempColor);
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = c.r; png.data[i + 1] = c.g; png.data[i + 2] = c.b; png.data[i + 3] = 255;
  }
  return png;
}

function pixelColor(png: PNG, x: number, y: number) {
  const idx = (png.width * y + x) << 2;
  return `rgb(${png.data[idx]}, ${png.data[idx + 1]}, ${png.data[idx + 2]})`;
}

it("recolors pixels inside the region by the anomaly and leaves others unchanged", () => {
  // 20C base everywhere.
  const baseColor = temperatureScale(20, "default");
  const png = makePng(64, 64, baseColor);
  const region = createRegion(tinyRegionData);

  const dataUrl = recolorSSTImage({
    png,
    scaleName: "default",
    regions: [region],
    // +3 inside the tiny region, 0 elsewhere.
    getTempDelta: (c) => (c.lat > min && c.lat < max && c.lng > min && c.lng < max ? 3 : 0),
  });

  expect(dataUrl.startsWith("data:image/png;base64,")).toBe(true);

  // Decode and inspect.
  const buf = Buffer.from(dataUrl.split(",")[1], "base64");
  const out = PNG.sync.read(buf);

  // Center pixel (inside region) should read back as 23C.
  const center = pixelColor(out, 32, 32);
  expect(invertedTemperatureScale(center, "default")).toBeCloseTo(23, 1);

  // A corner pixel (outside region) should still be 20C.
  const corner = pixelColor(out, 0, 0);
  expect(invertedTemperatureScale(corner, "default")).toBeCloseTo(20, 1);
});

it("recolors a pixel just outside the polygon but within the feather band", () => {
  // 64x64 image spans the whole world; the tiny region is lng/lat in [-5, 5].
  // A getTempDelta that is nonzero in a band reaching ~2deg OUTSIDE the region
  // must actually be visited — proving the bbox is padded beyond the polygon.
  const baseColor = temperatureScale(20, "default");
  const png = makePng(64, 64, baseColor);
  const region = createRegion(tinyRegionData);

  const inBand = (c: { lat: number; lng: number }) =>
    c.lat > -7 && c.lat < 7 && c.lng > -7 && c.lng < 7;

  const dataUrl = recolorSSTImage({
    png,
    scaleName: "default",
    regions: [region],
    pad: 2, // degrees of padding for the band
    getTempDelta: (c) => (inBand(c) ? 3 : 0),
  });

  const out = PNG.sync.read(Buffer.from(dataUrl.split(",")[1], "base64"));

  // World image: lng -> x = (lng + 180) / 360 * 64. lng = 6 (outside the
  // region's +5 edge, inside the band) -> x = round((186/360)*64) = 33,
  // and lat 0 -> y = 32. Without padding this column is outside the bbox and
  // would stay 20C.
  const justOutside = pixelColor(out, 33, 32);
  expect(invertedTemperatureScale(justOutside, "default")).toBeCloseTo(23, 1);
});

it("leaves land (alpha 0) pixels transparent", () => {
  const baseColor = temperatureScale(20, "default");
  const png = makePng(64, 64, baseColor);
  // Make the center pixel land.
  const centerIdx = (png.width * 32 + 32) << 2;
  png.data[centerIdx + 3] = 0;
  const region = createRegion(tinyRegionData);

  const dataUrl = recolorSSTImage({
    png, scaleName: "default", regions: [region], getTempDelta: () => 3,
  });
  const out = PNG.sync.read(Buffer.from(dataUrl.split(",")[1], "base64"));
  expect(out.data[((out.width * 32 + 32) << 2) + 3]).toBe(0);
});

it("honors a non-default scale name", () => {
  const baseColor = temperatureScale(20, "purple3");
  const png = makePng(64, 64, baseColor);
  const region = createRegion(tinyRegionData);
  const dataUrl = recolorSSTImage({
    png, scaleName: "purple3", regions: [region], getTempDelta: () => 2,
  });
  const out = PNG.sync.read(Buffer.from(dataUrl.split(",")[1], "base64"));
  expect(invertedTemperatureScale(pixelColor(out, 32, 32), "purple3")).toBeCloseTo(22, 1);
});

it("clamps to the max temperature (32C) on a large positive delta", () => {
  // 25C base everywhere; a +15 delta would reach 40C but must saturate at 32C.
  const baseColor = temperatureScale(25, "default");
  const png = makePng(64, 64, baseColor);
  const region = createRegion(tinyRegionData);

  const dataUrl = recolorSSTImage({
    png,
    scaleName: "default",
    regions: [region],
    // +15 inside the tiny region, 0 elsewhere.
    getTempDelta: (c) => (c.lat > min && c.lat < max && c.lng > min && c.lng < max ? 15 : 0),
  });

  const out = PNG.sync.read(Buffer.from(dataUrl.split(",")[1], "base64"));

  // Center pixel should saturate at 32C, not 40C.
  const center = pixelColor(out, 32, 32);
  expect(invertedTemperatureScale(center, "default")).toBeCloseTo(32, 1);
});

it("returns the unmodified image as a valid data URL when there are no regions", () => {
  const baseColor = temperatureScale(20, "default");
  const png = makePng(64, 64, baseColor);

  const dataUrl = recolorSSTImage({
    // Nonzero delta proves that with no regions nothing is recolored.
    png, scaleName: "default", regions: [], getTempDelta: () => 5,
  });

  expect(dataUrl.startsWith("data:image/png;base64,")).toBe(true);

  const out = PNG.sync.read(Buffer.from(dataUrl.split(",")[1], "base64"));

  // Center pixel should be unchanged at 20C.
  const center = pixelColor(out, 32, 32);
  expect(invertedTemperatureScale(center, "default")).toBeCloseTo(20, 1);
});

it("pads longitude by the cos(lat) factor so the band isn't clipped at high latitudes", () => {
  // Square region at ~60N, where cos(lat) ~ 0.5, so a 2deg band reaches ~4deg of
  // LONGITUDE outside the east/west edges. A raw 2deg pad would clip pixels past lng 4.
  const width = 720, height = 720; // fine enough that 1deg of lng is distinct pixels
  const baseColor = temperatureScale(20, "default");
  const png = makePng(width, height, baseColor);
  const data: FeatureCollection = {
    type: "FeatureCollection",
    features: [{ type: "Feature", properties: {}, geometry: {
      type: "Polygon", coordinates: [[[-2, 58], [2, 58], [2, 62], [-2, 62], [-2, 58]]]
    }}]
  };
  const region = createRegion(data);

  // Band nonzero for points up to ~4deg outside the east edge (lng in (2, 6)).
  const dataUrl = recolorSSTImage({
    png, scaleName: "default", regions: [region], pad: 2,
    getTempDelta: (c) => (c.lat > 54 && c.lat < 66 && c.lng > 2 && c.lng < 6 ? 3 : 0),
  });
  const out = PNG.sync.read(Buffer.from(dataUrl.split(",")[1], "base64"));

  // lng 5 is beyond the raw 2deg pad (edge 2 + 2 = 4) but within the cos-adjusted
  // band, so it must be recolored. Compute its pixel via the same projection the
  // recolor uses.
  const zoom = CRS.EPSG3857.zoom(width);
  const p = CRS.EPSG3857.latLngToPoint({ lat: 60, lng: 5 }, zoom);
  const x = Math.round(p.x), y = Math.round(p.y);
  expect(invertedTemperatureScale(pixelColor(out, x, y), "default")).toBeCloseTo(23, 1);
});
