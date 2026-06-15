# SST Anomaly Visualization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the rendered sea-surface-temperature (SST) map visually reflect active per-region temperature anomalies as a seamless recolor, consistent with the SST legend and the existing physics.

**Architecture:** A single regenerated `ImageOverlay`. When any anomaly is active, recolor the pixels inside anomaly-region bounding boxes of the visible SST PNG — invert each pixel's color to a temperature, add the region anomaly, and re-encode to the same color scale — producing a new data-URL image; otherwise fall back to the static per-season URL. The per-position anomaly value comes from a single shared `totalAnomalyAt()` method used by both the physics (`seaSurfaceTempAt`) and the visual recolor, so future edge-smoothing is a one-place change that keeps them consistent.

**Tech Stack:** TypeScript, MobX (class decorators), pngjs (in-memory PNG read/write — no canvas), Leaflet `CRS.EPSG3857` for pixel↔lat/lng, the bidirectional `temperature-scale.js`, Jest.

---

## Background facts (read before starting)

- Color scale is bidirectional and O(1): `temperatureScale(temp, scaleName)` and `invertedTemperatureScale(color, scaleName)` in [src/temperature-scale.js](../../src/temperature-scale.js). Both use `"rgb(r, g, b)"` strings (d3 output). Domain max is 32°C.
- Visible image URL: `ui.getVisibleSeaSurfaceTempImgUrl(season)` → `sstImages[ui.sstScaleName][season]` ([src/models/ui.ts:134-156](../../src/models/ui.ts#L134-L156)). The accessible scale is a *different* PNG than the physics PNG, so the recolor must use the visible image + its own scale.
- Physics PNG sampling math: [src/models/simulation.ts:585-624](../../src/models/simulation.ts#L585-L624). Land pixels have alpha 0. Zoom = `CRS.EPSG3857.zoom(png.width)`.
- Region geometry + `isInsideRegion(coords, region)`: [src/utils/region.ts](../../src/utils/region.ts). `region.latLngs` is an array of `[lat, lng]`. Region registry: `temperatureAnomalyRegions` and `namedRegions` ([src/utils/regions.ts](../../src/utils/regions.ts), [src/types.ts](../../src/types.ts)).
- `ICoordinates` is `{ lat: number; lng: number }` ([src/types.ts](../../src/types.ts)); Leaflet `LatLng` satisfies it structurally.

---

## Task 1: Extract shared `totalAnomalyAt` and add `anyAnomalyActive`

**Files:**
- Modify: `src/models/simulation.ts` (anomaly loop currently inlined at lines ~612-621; `seaSurfaceTempAt` at 585-624)
- Test: `src/models/simulation.test.ts`

**Step 1: Write the failing tests**

Add to `src/models/simulation.test.ts`:

```ts
describe("totalAnomalyAt", () => {
  it("sums anomalies for regions containing the point and ignores zero/outside regions", () => {
    const sim = new SimulationModel();
    sim.temperatureAnomalies.set("gulf", 2);
    // A point well inside the Gulf region anchor.
    const inGulf = { lat: 24.7, lng: -89.7 };
    expect(sim.totalAnomalyAt(inGulf)).toBe(2);
    // A point in the open Pacific — inside no anomaly region.
    expect(sim.totalAnomalyAt({ lat: 0, lng: -150 })).toBe(0);
  });

  it("anyAnomalyActive reflects whether any region is nonzero", () => {
    const sim = new SimulationModel();
    expect(sim.anyAnomalyActive).toBe(false);
    sim.temperatureAnomalies.set("caribbean", -1);
    expect(sim.anyAnomalyActive).toBe(true);
  });
});
```

**Step 2: Run to verify failure**

Run: `npx jest src/models/simulation.test.ts -t "totalAnomalyAt"`
Expected: FAIL — `sim.totalAnomalyAt is not a function`.

**Step 3: Implement**

In `src/models/simulation.ts`, add these methods (near `temperatureAnomalyAt`, ~line 640) — `ICoordinates`, `namedRegions`, `isInsideRegion`, `temperatureAnomalyRegions` are already imported:

```ts
public totalAnomalyAt(coords: ICoordinates): number {
  let total = 0;
  for (const key of namedRegions) {
    const anomaly = this.temperatureAnomalyAt(key);
    if (anomaly !== 0 && isInsideRegion(coords, temperatureAnomalyRegions[key].region)) {
      total += anomaly;
    }
  }
  return total;
}

@computed public get anyAnomalyActive(): boolean {
  return namedRegions.some(key => this.temperatureAnomalyAt(key) !== 0);
}
```

If `ICoordinates` is not yet imported in this file, add it to the existing `../types` import.

Then refactor `seaSurfaceTempAt` — replace the inlined loop (lines ~612-621) with:

```ts
if (temp != null) {
  temp += this.totalAnomalyAt(latLng(position));
}
```

**Step 4: Run to verify pass**

Run: `npx jest src/models/simulation.test.ts`
Expected: PASS — new tests pass AND existing `seaSurfaceTempAt` tests still pass (behavior unchanged).

**Step 5: Commit**

```bash
git add src/models/simulation.ts src/models/simulation.test.ts
git commit -m "Extract shared totalAnomalyAt for SST anomalies"
```

---

## Task 2: Pure `recolorSSTImage` utility

**Files:**
- Create: `src/utils/recolor-sst.ts`
- Test: `src/utils/recolor-sst.test.ts`

**Design:** Pure function. Takes a parsed pngjs `PNG`, a scale name, the active regions (for bounding-box bounds), and a `contributionAt(coords)` callback (which will be `sim.totalAnomalyAt`). Returns a `data:image/png;base64,...` URL. Recolors only pixels inside the union of active-region pixel bounding boxes. Uses `PNG.sync.write` — no canvas, so it runs in jsdom.

**Step 1: Write the failing test**

`src/utils/recolor-sst.test.ts`:

```ts
import { PNG } from "pngjs";
import { recolorSSTImage } from "./recolor-sst";
import { createRegion } from "./region";
import { temperatureScale, invertedTemperatureScale } from "../temperature-scale";
import { FeatureCollection } from "geojson";

// A tiny square region near the equator/prime meridian so pixel math is simple.
const tinyRegionData = {
  type: "FeatureCollection",
  features: [{
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [[[-5, -5], [5, -5], [5, 5], [-5, 5], [-5, -5]]]
    }
  }]
} as unknown as FeatureCollection;

// Build a fully-opaque PNG painted with the color for a known base temperature.
function makePng(width: number, height: number, baseTempColor: string) {
  const png = new PNG({ width, height });
  const [r, g, b] = baseTempColor.match(/\d+/g)!.map(Number);
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = r; png.data[i + 1] = g; png.data[i + 2] = b; png.data[i + 3] = 255;
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
    contributionAt: (c) => (c.lat > -5 && c.lat < 5 && c.lng > -5 && c.lng < 5 ? 3 : 0),
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
    png, scaleName: "default", regions: [region], contributionAt: () => 3,
  });
  const out = PNG.sync.read(Buffer.from(dataUrl.split(",")[1], "base64"));
  expect(out.data[((out.width * 32 + 32) << 2) + 3]).toBe(0);
});

it("honors a non-default scale name", () => {
  const baseColor = temperatureScale(20, "purple3");
  const png = makePng(64, 64, baseColor);
  const region = createRegion(tinyRegionData);
  const dataUrl = recolorSSTImage({
    png, scaleName: "purple3", regions: [region], contributionAt: () => 2,
  });
  const out = PNG.sync.read(Buffer.from(dataUrl.split(",")[1], "base64"));
  expect(invertedTemperatureScale(pixelColor(out, 32, 32), "purple3")).toBeCloseTo(22, 1);
});
```

**Step 2: Run to verify failure**

Run: `npx jest src/utils/recolor-sst.test.ts`
Expected: FAIL — cannot find module `./recolor-sst`.

**Step 3: Implement**

`src/utils/recolor-sst.ts`:

```ts
import { PNG } from "pngjs";
import { CRS } from "leaflet";
import { temperatureScale, invertedTemperatureScale } from "../temperature-scale";
import { Region } from "./region";
import { ICoordinates } from "../types";

// Matches the temperature-scale domain. Anomalies past this saturate visually
// (an accepted artifact — see the design doc).
const MIN_TEMP = 0;
const MAX_TEMP = 32;

interface RecolorParams {
  png: PNG;
  scaleName: string;
  regions: Region[]; // regions whose anomaly is nonzero (used only for bounding-box bounds)
  contributionAt: (coords: ICoordinates) => number;
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

function parseRgb(color: string): [number, number, number] {
  const m = color.match(/\d+/g)!;
  return [Number(m[0]), Number(m[1]), Number(m[2])];
}

function toDataUrl(png: PNG): string {
  return "data:image/png;base64," + PNG.sync.write(png).toString("base64");
}

export function recolorSSTImage({ png, scaleName, regions, contributionAt }: RecolorParams): string {
  const { width, height } = png;
  const out = new PNG({ width, height });
  png.data.copy(out.data);

  const zoom = CRS.EPSG3857.zoom(width);
  const box = pixelBoundingBox(regions, zoom, width, height);
  if (!box) return toDataUrl(out);

  for (let y = box.minY; y <= box.maxY; y++) {
    for (let x = box.minX; x <= box.maxX; x++) {
      const idx = (width * y + x) << 2;
      if (out.data[idx + 3] === 0) continue; // land
      const coords = CRS.EPSG3857.pointToLatLng({ x, y } as any, zoom);
      const contribution = contributionAt({ lat: coords.lat, lng: coords.lng });
      if (contribution === 0) continue;
      const baseColor = `rgb(${out.data[idx]}, ${out.data[idx + 1]}, ${out.data[idx + 2]})`;
      const temp = invertedTemperatureScale(baseColor, scaleName);
      if (temp == null) continue;
      const clamped = Math.max(MIN_TEMP, Math.min(MAX_TEMP, temp + contribution));
      const [r, g, b] = parseRgb(temperatureScale(clamped, scaleName));
      out.data[idx] = r; out.data[idx + 1] = g; out.data[idx + 2] = b;
    }
  }
  return toDataUrl(out);
}
```

**Step 4: Run to verify pass**

Run: `npx jest src/utils/recolor-sst.test.ts`
Expected: PASS (all three tests).

If `PNG.sync` is unavailable at runtime, encode manually via `PNG` write stream into a Buffer; do NOT switch to canvas (jsdom has no 2D context). Verify `PNG.sync.write`/`PNG.sync.read` exist in the installed pngjs first: `node -e "console.log(typeof require('pngjs').PNG.sync.write)"` should print `function`.

**Step 5: Commit**

```bash
git add src/utils/recolor-sst.ts src/utils/recolor-sst.test.ts
git commit -m "Add pure recolorSSTImage utility for anomaly visualization"
```

---

## Task 3: `SSTOverlayModel` to orchestrate recoloring

**Files:**
- Create: `src/models/sst-overlay.ts`
- Modify: `src/models/stores.ts`
- Test: `src/models/sst-overlay.test.ts`

**Design:** Owns the recolored overlay URL. One reaction fetches/parses the *visible* PNG when its URL changes; a second, debounced reaction recomputes `recoloredUrl` when the visible PNG, the anomalies, or the scale change. Exposes test hooks (`setVisiblePng`, `recolorNow`) mirroring the `_seaSurfaceTempDataParsed` pattern already used in `simulation.ts`, so the orchestration is unit-testable without `fetch`.

**Step 1: Write the failing test**

`src/models/sst-overlay.test.ts`:

```ts
import { PNG } from "pngjs";
import { SimulationModel } from "./simulation";
import { UIModel } from "./ui";
import { SSTOverlayModel } from "./sst-overlay";
import { temperatureScale } from "../temperature-scale";

function makeOpaquePng(width: number, height: number) {
  const png = new PNG({ width, height });
  const [r, g, b] = temperatureScale(20, "default").match(/\d+/g)!.map(Number);
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = r; png.data[i + 1] = g; png.data[i + 2] = b; png.data[i + 3] = 255;
  }
  return png;
}

it("produces a data-URL when an anomaly is active", () => {
  const simulation = new SimulationModel();
  const ui = new UIModel();
  const overlay = new SSTOverlayModel(simulation, ui);

  overlay.setVisiblePng(makeOpaquePng(128, 128));
  simulation.temperatureAnomalies.set("gulf", 2);
  overlay.recolorNow();

  expect(overlay.recoloredUrl?.startsWith("data:image/png;base64,")).toBe(true);
});

it("clears the recolored URL when no anomaly is active", () => {
  const simulation = new SimulationModel();
  const ui = new UIModel();
  const overlay = new SSTOverlayModel(simulation, ui);

  overlay.setVisiblePng(makeOpaquePng(128, 128));
  overlay.recolorNow();

  expect(overlay.recoloredUrl).toBeNull();
});
```

**Step 2: Run to verify failure**

Run: `npx jest src/models/sst-overlay.test.ts`
Expected: FAIL — cannot find module `./sst-overlay`.

**Step 3: Implement**

`src/models/sst-overlay.ts`:

```ts
import { action, computed, observable, makeObservable, reaction, toJS } from "mobx";
import { PNG } from "pngjs";
import { Buffer } from "buffer";
import { SimulationModel } from "./simulation";
import { UIModel } from "./ui";
import { recolorSSTImage } from "../utils/recolor-sst";
import { temperatureAnomalyRegions } from "../utils/regions";
import { namedRegions } from "../types";

const RECOLOR_DEBOUNCE_MS = 150;

export class SSTOverlayModel {
  @observable.ref public visiblePng: PNG | null = null;
  @observable public recoloredUrl: string | null = null;

  private simulation: SimulationModel;
  private ui: UIModel;
  // Test hook, mirrors simulation._seaSurfaceTempDataParsed.
  public _visiblePngParsed: null | (() => void) = null;

  constructor(simulation: SimulationModel, ui: UIModel) {
    makeObservable(this);
    this.simulation = simulation;
    this.ui = ui;

    // Re-fetch/parse the visible PNG whenever its URL changes.
    reaction(
      () => this.ui.getVisibleSeaSurfaceTempImgUrl(this.simulation.season),
      url => this.loadVisiblePng(url),
      { fireImmediately: true }
    );

    // Recompute the recolored overlay (debounced) when inputs change.
    reaction(
      () => ({
        png: this.visiblePng,
        anomalies: toJS(this.simulation.temperatureAnomalies),
        scale: this.ui.sstScaleName,
      }),
      () => this.recolorNow(),
      { delay: RECOLOR_DEBOUNCE_MS }
    );
  }

  @computed public get activeRegions() {
    return namedRegions
      .filter(key => this.simulation.temperatureAnomalyAt(key) !== 0)
      .map(key => temperatureAnomalyRegions[key].region);
  }

  @action.bound public setVisiblePng(png: PNG | null) {
    this.visiblePng = png;
  }

  @action.bound public setRecoloredUrl(url: string | null) {
    this.recoloredUrl = url;
  }

  @action.bound public recolorNow() {
    const png = this.visiblePng;
    if (!png || !this.simulation.anyAnomalyActive) {
      this.setRecoloredUrl(null);
      return;
    }
    this.setRecoloredUrl(recolorSSTImage({
      png,
      scaleName: this.ui.sstScaleName,
      regions: this.activeRegions,
      contributionAt: coords => this.simulation.totalAnomalyAt(coords),
    }));
  }

  private loadVisiblePng(url: string) {
    this.setVisiblePng(null);
    fetch(url).then(response => {
      if (!response.ok) return;
      response.arrayBuffer().then(buffer => {
        new PNG().parse(Buffer.from(buffer), (err, png) => {
          if (err) {
            // eslint-disable-next-line no-console
            console.error("Failed to parse visible SST PNG:", err);
            return;
          }
          this.setVisiblePng(png);
          this._visiblePngParsed?.();
        });
      });
    });
  }
}
```

Wire it into `src/models/stores.ts`:

```ts
import { UIModel } from "./ui";
import { SimulationModel } from "./simulation";
import { SSTOverlayModel } from "./sst-overlay";

export interface IStores {
  ui: UIModel;
  simulation: SimulationModel;
  sstOverlay: SSTOverlayModel;
}

export function createStores(): IStores {
  const ui = new UIModel();
  const simulation = new SimulationModel();
  const sstOverlay = new SSTOverlayModel(simulation, ui);
  return { ui, simulation, sstOverlay };
}
```

**Step 4: Run to verify pass**

Run: `npx jest src/models/sst-overlay.test.ts`
Expected: PASS (both tests).

Then run the broader suite to confirm the `createStores`/`IStores` change didn't break consumers:
Run: `npx jest`
Expected: PASS. If a test constructs stores by shape, update it to include `sstOverlay`.

**Step 5: Commit**

```bash
git add src/models/sst-overlay.ts src/models/stores.ts src/models/sst-overlay.test.ts
git commit -m "Add SSTOverlayModel to orchestrate anomaly recoloring"
```

---

## Task 4: Wire the recolored overlay into the map

**Files:**
- Modify: `src/components/map-view.tsx:175-183`
- Test: `src/components/map-view.test.tsx` (create if absent) OR rely on Task 5 manual verification

**Step 1: Write the failing test (if a map-view test harness exists)**

If `src/components/map-view.test.tsx` exists or a sibling component test demonstrates the pattern, assert the `ImageOverlay` `url` prop equals `sstOverlay.recoloredUrl` when it is set and an anomaly is active. If no straightforward harness exists (Leaflet components are awkward to mount in jsdom), SKIP the unit test here and rely on Task 5 — note that skip explicitly in the commit message.

**Step 2: Implement**

In `src/components/map-view.tsx`, the component already reads `ui` and `sim` from stores. Add `sstOverlay` from the same stores object, then change the SST overlay block (lines 175-183):

```tsx
{
  ui.overlay === "sst" &&
  <ImageOverlay
    // accessible version of sea surface temperature should always use 100% opacity
    opacity={ui.accessibleSSTScale ? 1 : ui.layerOpacity.seaSurfaceTemp}
    url={
      sim.anyAnomalyActive && sstOverlay.recoloredUrl
        ? sstOverlay.recoloredUrl
        : ui.getVisibleSeaSurfaceTempImgUrl(sim.season)
    }
    bounds={imageOverlayBounds}
  />
}
```

Confirm how this component obtains stores (`BaseComponent.stores` for class components, or an injected/observer pattern) and pull `sstOverlay` the same way the existing `ui`/`sim` are obtained.

**Step 3: Run lint + full tests**

Run: `npm run lint && npx jest`
Expected: PASS.

**Step 4: Commit**

```bash
git add src/components/map-view.tsx
git commit -m "Render recolored SST overlay when anomalies are active"
```

---

## Task 5: Manual verification

**Step 1:** `npm start`

**Step 2:** In the running app, enable the SST overlay and the sea-surface-temperatures setup mode. Bump the Gulf anomaly to +3°C.

Expected:
- The Gulf water visibly shifts warmer on the SST map, in the same color language as the legend (not a flat tint).
- Within-region temperature variation is preserved (the whole region shifts, it isn't one flat color).
- Setting all anomalies back to 0 returns the map to the original static image.
- Toggling the accessible SST scale still recolors correctly (uses the accessible scale's colors).
- Rapid +/- clicks coalesce (no flicker storm); the overlay updates ~150 ms after the last click.

**Step 3:** Note the two accepted artifacts to eyeball: 32°C saturation at high anomalies, and the hard color seam at region edges. If the seam looks bad, the fix is localized to `SimulationModel.totalAnomalyAt` (apply a distance-to-boundary weight) — no architectural change required.

---

## Notes / follow-ups (out of scope)

- **Edge smoothing:** if needed, add a feathering weight inside `totalAnomalyAt`. Because both physics and the visual recolor call it, they stay consistent automatically. If feathering should be visual-only, branch there.
- **LOGGED-EVENTS.md:** no new telemetry events are added by this work; no update needed.
