# SST Anomaly Feathering Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the hard region-edge step in anomaly application with a smoothstep feather over a band straddling each region's boundary, so warmed/cooled water blends smoothly on both the map and in the physics.

**Architecture:** All anomaly math flows through `SimulationModel.totalAnomalyAt`, which both physics (`seaSurfaceTempAt`) and the recolor util (`getTempDelta`) already call. We add two pure helpers in `region.ts` — a planar signed distance-to-boundary and a smoothstep weight — and rewrite `totalAnomalyAt` to sum `anomaly × weight`. The recolor bounding box is padded so the straddling band's outside half is visited. No precomputed field; on-the-fly planar distance is ~125 ms full-bbox, inside the existing 150 ms debounce.

**Tech Stack:** TypeScript, MobX, pngjs, turf (`booleanPointInPolygon` for the inside/outside sign), Jest.

**Design doc:** [docs/plans/2026-06-16-sst-anomaly-feathering-design.md](2026-06-16-sst-anomaly-feathering-design.md)

**Conventions:** Tests live next to source as `*.test.ts`. Run a single file with `npx jest <path>`. TDD: failing test first, minimal impl, confirm pass, commit.

---

### Task 1: `featherWeight` smoothstep helper

Pure function, no geometry — easiest to lock down first.

**Files:**
- Modify: `src/utils/region.ts`
- Test: `src/utils/region.test.ts` (create)

**Step 1: Write the failing test**

Create `src/utils/region.test.ts`:

```ts
import { featherWeight } from "./region";

describe("featherWeight", () => {
  const half = 1; // 1 degree half-width

  it("is 1.0 a half-width inside (signedDist = +half)", () => {
    expect(featherWeight(half, half)).toBeCloseTo(1, 5);
  });

  it("is 0.5 exactly on the boundary (signedDist = 0)", () => {
    expect(featherWeight(0, half)).toBeCloseTo(0.5, 5);
  });

  it("is 0.0 a half-width outside (signedDist = -half)", () => {
    expect(featherWeight(-half, half)).toBeCloseTo(0, 5);
  });

  it("saturates beyond the band", () => {
    expect(featherWeight(5, half)).toBe(1);
    expect(featherWeight(-5, half)).toBe(0);
  });

  it("is monotonic across the band", () => {
    const a = featherWeight(-0.5, half);
    const b = featherWeight(0, half);
    const c = featherWeight(0.5, half);
    expect(a).toBeLessThan(b);
    expect(b).toBeLessThan(c);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/utils/region.test.ts -t featherWeight`
Expected: FAIL — `featherWeight is not a function` / not exported.

**Step 3: Write minimal implementation**

Append to `src/utils/region.ts`:

```ts
// Smoothstep feather weight for a band straddling the region boundary.
// signedDist > 0 inside, < 0 outside (same convention as signedDistanceToRegion).
// Returns 1 a half-width inside, 0.5 on the edge, 0 a half-width outside.
export function featherWeight(signedDist: number, halfWidth: number): number {
  const s = Math.max(0, Math.min(1, (signedDist + halfWidth) / (2 * halfWidth)));
  return s * s * (3 - 2 * s);
}
```

**Step 4: Run test to verify it passes**

Run: `npx jest src/utils/region.test.ts -t featherWeight`
Expected: PASS (all 5).

**Step 5: Commit**

```bash
git add src/utils/region.ts src/utils/region.test.ts
git commit -m "feat: add featherWeight smoothstep helper"
```

---

### Task 2: `signedDistanceToRegion` planar signed distance

**Files:**
- Modify: `src/utils/region.ts`
- Test: `src/utils/region.test.ts`

**Step 1: Write the failing test**

Add to `src/utils/region.test.ts`:

```ts
import { createRegion, signedDistanceToRegion } from "./region";
import { FeatureCollection } from "geojson";

// 10x10 degree square centered on (0,0): lng/lat in [-5, 5].
const squareData: FeatureCollection = {
  type: "FeatureCollection",
  features: [{
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [[[-5, -5], [5, -5], [5, 5], [-5, 5], [-5, -5]]]
    }
  }]
};

describe("signedDistanceToRegion", () => {
  const region = createRegion(squareData);

  it("is positive at the center (inside)", () => {
    // Center is 5deg from every edge; nearest edge is 5 (in latitude-degree units).
    expect(signedDistanceToRegion({ lat: 0, lng: 0 }, region)).toBeCloseTo(5, 1);
  });

  it("is ~0 on the boundary", () => {
    expect(signedDistanceToRegion({ lat: 5, lng: 0 }, region)).toBeCloseTo(0, 1);
  });

  it("is negative just outside", () => {
    // 2 degrees north of the top edge.
    expect(signedDistanceToRegion({ lat: 7, lng: 0 }, region)).toBeCloseTo(-2, 1);
  });

  it("measures to the nearest corner for a diagonal point past a vertex", () => {
    // (lng 8, lat 8) sits diagonally outside the (5,5) corner; the nearest point on
    // the ring is that vertex (both adjacent edges clamp their foot to it). Planar
    // distance with lng scaled by cos(8deg): sqrt(((8-5)*cos8)^2 + (8-5)^2) ~= 4.22,
    // negative because it is outside.
    expect(signedDistanceToRegion({ lat: 8, lng: 8 }, region)).toBeCloseTo(-4.22, 1);
  });

  it("grows in magnitude moving away from the edge", () => {
    const near = signedDistanceToRegion({ lat: 6, lng: 0 }, region);
    const far = signedDistanceToRegion({ lat: 9, lng: 0 }, region);
    expect(far).toBeLessThan(near); // both negative, far is more negative
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/utils/region.test.ts -t signedDistanceToRegion`
Expected: FAIL — `signedDistanceToRegion is not a function`.

**Step 3: Write minimal implementation**

Add to `src/utils/region.ts` (it already imports `ICoordinates` and exports `isInsideRegion`):

```ts
// Planar (NOT great-circle) minimum distance from coords to the region ring,
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
```

**Step 4: Run test to verify it passes**

Run: `npx jest src/utils/region.test.ts -t signedDistanceToRegion`
Expected: PASS (all 4).

**Step 5: Commit**

```bash
git add src/utils/region.ts src/utils/region.test.ts
git commit -m "feat: add signedDistanceToRegion planar helper"
```

---

### Task 3: Feathered `totalAnomalyAt`

Swap the hard `isInsideRegion` step for the weighted sum. Deep-inside points stay exact (weight 1.0); points beyond the band stay 0. The existing `totalAnomalyAt` and `seaSurfaceTempAt` tests (which use deep-inside `anchor` points and far points) must still pass.

**Files:**
- Modify: `src/models/constants.ts` (add the half-width constant)
- Modify: `src/models/simulation.ts:638-647` (`totalAnomalyAt`); update the import from `../utils/region`
- Test: `src/models/simulation.test.ts` (add to the existing `describe("totalAnomalyAt")` block ~line 287)

**Step 1: Add the constant**

Append to `src/models/constants.ts` (after `temperatureAnomalyMax`):

```ts
// Half-width of the smoothstep band that feathers an anomaly across a region
// boundary, in degrees (~110 km). Full transition band is twice this. The drawn
// polygon is the half-strength contour. Single tunable — retune after seeing it on the map.
export const temperatureAnomalyFeatherHalfWidth = 1.0;
```

**Step 2: Write the failing test**

Add inside `describe("totalAnomalyAt", ...)` in `src/models/simulation.test.ts`. The test
covers four positions relative to the Gulf band: deep inside (full), band-inside (between half
and full), band-outside (between zero and half), and fully outside (zero). Band points are built
by stepping along an edge normal and **guarded with `signedDistanceToRegion`**, so the assertions
hold regardless of the Gulf polygon's exact shape.

```ts
it("feathers the anomaly across the region boundary", () => {
  const sim = new SimulationModel();
  sim.temperatureAnomalies.set("gulf", 2); // max legal anomaly is 3
  const region = temperatureAnomalyRegions.gulf.region;
  const half = 1.0; // temperatureAnomalyFeatherHalfWidth

  // 1. Deep inside (the anchor): full anomaly (weight 1.0).
  expect(sim.totalAnomalyAt(temperatureAnomalyRegions.gulf.anchor)).toBeCloseTo(2, 5);

  // 2. Fully outside the band and every region (open Pacific): no contribution.
  expect(sim.totalAnomalyAt({ lat: 0, lng: -150 })).toBe(0);

  // Build band points by stepping along the normal of the LONGEST edge, so a small
  // step stays clear of corner geometry where two edges meet.
  const ring = region.latLngs; // [lat, lng][], closed
  let li = 0, longest = -1;
  for (let i = 0; i < ring.length - 1; i++) {
    const cl = Math.cos((((ring[i][0] + ring[i + 1][0]) / 2) * Math.PI) / 180);
    const len = Math.hypot((ring[i + 1][1] - ring[i][1]) * cl, ring[i + 1][0] - ring[i][0]);
    if (len > longest) { longest = len; li = i; }
  }
  const midLat = (ring[li][0] + ring[li + 1][0]) / 2;
  const midLng = (ring[li][1] + ring[li + 1][1]) / 2;
  const cosLat = Math.cos((midLat * Math.PI) / 180);
  const ex = (ring[li + 1][1] - ring[li][1]) * cosLat;
  const ey = ring[li + 1][0] - ring[li][0];
  const elen = Math.hypot(ex, ey);
  let nx = -ey / elen, ny = ex / elen; // unit normal in cosLat-scaled planar space
  // Move `deg` degrees-latitude along the normal, converted back to lat/lng.
  const offset = (deg: number) => ({ lat: midLat + ny * deg, lng: midLng + (nx * deg) / cosLat });
  // Orient +deg INTO the region.
  if (!isInsideRegion(offset(0.01), region)) { nx = -nx; ny = -ny; }

  const insideBand = offset(half / 2);   // ~0.5deg inside the edge
  const outsideBand = offset(-half / 2); // ~0.5deg outside the edge

  // Guards: the constructed points really sit within the band on the intended side.
  expect(signedDistanceToRegion(insideBand, region)).toBeGreaterThan(0);
  expect(signedDistanceToRegion(insideBand, region)).toBeLessThan(half);
  expect(signedDistanceToRegion(outsideBand, region)).toBeLessThan(0);
  expect(signedDistanceToRegion(outsideBand, region)).toBeGreaterThan(-half);

  const vInside = sim.totalAnomalyAt(insideBand);
  const vOutside = sim.totalAnomalyAt(outsideBand);

  // 3. Within the band, inside the region: strictly between half-strength and full.
  expect(vInside).toBeGreaterThan(1);
  expect(vInside).toBeLessThan(2);
  // 4. Within the band, outside the region: strictly between zero and half-strength.
  expect(vOutside).toBeGreaterThan(0);
  expect(vOutside).toBeLessThan(1);
  // Monotonic across the boundary.
  expect(vInside).toBeGreaterThan(vOutside);
});
```

(`temperatureAnomalyRegions` is already imported in this test file. Add
`import { isInsideRegion, signedDistanceToRegion } from "../utils/region";` if not already present.)

**Step 3: Run test to verify it fails**

Run: `npx jest src/models/simulation.test.ts -t "feathers the anomaly"`
Expected: FAIL — the edge point currently returns `0` (hard step) or full `4`, not ~2.

**Step 4: Rewrite `totalAnomalyAt`**

In `src/models/simulation.ts`, update the import to pull the new helpers and the constant:

```ts
// where ../utils/region (or ../utils/regions) is imported, add:
import { isInsideRegion, signedDistanceToRegion, featherWeight } from "../utils/region";
import { temperatureAnomalyFeatherHalfWidth } from "./constants";
```

(`isInsideRegion` may already be imported — keep one import line. Verify the existing import path for `signedDistanceToRegion`/`featherWeight` is `../utils/region`, where they were added in Tasks 1–2.)

Replace the body of `totalAnomalyAt` (currently `src/models/simulation.ts:638-647`):

```ts
public totalAnomalyAt(coords: ICoordinates): number {
  let total = 0;
  for (const key of namedRegions) {
    const anomaly = this.temperatureAnomalyAt(key);
    if (anomaly === 0) continue;
    const d = signedDistanceToRegion(coords, temperatureAnomalyRegions[key].region);
    const w = featherWeight(d, temperatureAnomalyFeatherHalfWidth);
    if (w > 0) total += anomaly * w;
  }
  return total;
}
```

**Step 5: Run the new test plus the full simulation suite**

Run: `npx jest src/models/simulation.test.ts`
Expected: PASS, including the pre-existing `totalAnomalyAt` exact-value test (deep-inside anchor still `2`, far point still `0`) and the `seaSurfaceTempAt` anomaly test (anchor still `base + 2`).

> If a pre-existing exact-value assertion now fails because its anchor sits within `1.0°` of an edge, that is a real signal — the anchor is closer to the boundary than the feather half-width. Do NOT loosen the test blindly; confirm the point's distance with `signedDistanceToRegion` and, if it is genuinely a deep-inside point, the weight should be 1.0. Surface it rather than papering over it.

**Step 6: Commit**

```bash
git add src/models/constants.ts src/models/simulation.ts src/models/simulation.test.ts
git commit -m "feat: feather anomaly across region boundaries in totalAnomalyAt"
```

---

### Task 4: Pad the recolor bounding box for the straddling band

Straddling means pixels *outside* each polygon (within `halfWidth`) now get a nonzero delta, so `pixelBoundingBox` must include them. Pad the lat/lng extents by the half-width before projecting.

**Files:**
- Modify: `src/utils/recolor-sst.ts:21-44` (`pixelBoundingBox` + its call site)
- Test: `src/utils/recolor-sst.test.ts`

**Step 1: Write the failing test**

Add to `src/utils/recolor-sst.test.ts` (it already defines `tinyRegionData` with edges at ±5, `makePng`, `pixelColor`):

```ts
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
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/utils/recolor-sst.test.ts -t "just outside"`
Expected: FAIL — `pad` is ignored, bbox stops at the polygon edge, pixel reads ~20C (and/or a TS error on the unknown `pad` field, which the next step fixes).

**Step 3: Implement bbox padding**

In `src/utils/recolor-sst.ts`:

1. Add `pad` to `RecolorParams` (default 0 so existing callers/tests are unaffected):

```ts
interface RecolorParams {
  png: PNG;
  scaleName: string;
  regions: Region[];
  getTempDelta: (coords: ICoordinates) => number;
  // Degrees to expand each region's bounding box, so the outside half of a
  // straddling feather band is included. Defaults to 0 (no feather).
  pad?: number;
}
```

2. Thread `pad` through `pixelBoundingBox` and apply it to the lat/lng extents before projecting:

```ts
function pixelBoundingBox(
  regions: Region[], zoom: number, width: number, height: number, pad: number
): PixelBox | null {
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

  // Expand by the feather pad (degrees), clamped to valid lat/lng ranges.
  latMin = Math.max(-85, latMin - pad);
  latMax = Math.min(85, latMax + pad);
  lngMin = Math.max(-180, lngMin - pad);
  lngMax = Math.min(180, lngMax + pad);

  const topLeft = CRS.EPSG3857.latLngToPoint({ lat: latMax, lng: lngMin }, zoom);
  const bottomRight = CRS.EPSG3857.latLngToPoint({ lat: latMin, lng: lngMax }, zoom);
  return {
    minX: Math.max(0, Math.floor(topLeft.x)),
    minY: Math.max(0, Math.floor(topLeft.y)),
    maxX: Math.min(width - 1, Math.ceil(bottomRight.x)),
    maxY: Math.min(height - 1, Math.ceil(bottomRight.y)),
  };
}
```

3. In `recolorSSTImage`, destructure `pad = 0` and pass it through:

```ts
export function recolorSSTImage({ png, scaleName, regions, getTempDelta, pad = 0 }: RecolorParams): string {
  // ...
  const box = pixelBoundingBox(regions, zoom, width, height, pad);
  // ...
}
```

**Step 4: Run test to verify it passes**

Run: `npx jest src/utils/recolor-sst.test.ts`
Expected: PASS — the new "just outside" test plus all pre-existing recolor tests (which pass no `pad`, so default 0 keeps their behavior).

**Step 5: Commit**

```bash
git add src/utils/recolor-sst.ts src/utils/recolor-sst.test.ts
git commit -m "feat: pad recolor bbox by feather half-width for straddling band"
```

---

### Task 5: Pass the feather pad from the overlay model

Wire the constant into the recolor call so the live overlay actually visits the outside-the-polygon band.

**Files:**
- Modify: `src/models/sst-overlay.ts:126-138` (`recolorNow`)

**Step 1: Update `recolorNow`**

In `src/models/sst-overlay.ts`, import the constant and pass `pad`:

```ts
import { temperatureAnomalyFeatherHalfWidth } from "./constants";
```

```ts
this.setRecoloredUrl(recolorSSTImage({
  png,
  scaleName: this.sstScaleName,
  regions: this.activeRegions,
  getTempDelta: coords => this.simulation.totalAnomalyAt(coords),
  pad: temperatureAnomalyFeatherHalfWidth,
}));
```

**Step 2: Run the overlay suite**

Run: `npx jest src/models/sst-overlay.test.ts`
Expected: PASS — existing overlay tests still pass (recolored URL still produced when anomalies active, null fallback when not).

**Step 3: Commit**

```bash
git add src/models/sst-overlay.ts
git commit -m "feat: feather the live SST overlay band"
```

---

### Task 6: Full verification

**Step 1: Run the whole suite**

Run: `npm test`
Expected: PASS (no regressions across simulation, region, recolor, overlay).

**Step 2: Lint**

Run: `npm run lint`
Expected: clean.

**Step 3: Eyeball it in the app**

Run: `npm start`, warm the Gulf in setup mode, and confirm the SST recolor blends smoothly into the surrounding water with no hard seam at the region edge. If the band looks too narrow/wide, tune `temperatureAnomalyFeatherHalfWidth` in `src/models/constants.ts` (single knob) and re-check.

---

## Notes for the executor

- **Why planar, not turf:** turf's `nearestPointOnLine` is ~18 s over the full 4-region bbox of the 2048² image — it freezes the UI. Planar point-to-segment is ~80 ms. Do NOT swap in a turf distance call.
- **Lockstep is the point:** physics (`seaSurfaceTempAt`) and the visual (`getTempDelta`) both go through `totalAnomalyAt`. Keep it that way — do not feather only one side.
- **Fallback (don't build now):** if a wider band or larger image makes on-the-fly too slow, precompute a per-region signed-distance field (regions are static). See the design doc's perf section.
