import { PNG } from "pngjs";
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
