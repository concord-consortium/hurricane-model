# Storm Placement Region Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** During the Setup → Storm Location step, show a polygon over the Atlantic basin and let the user drag the hurricane marker anywhere inside it (with live boundary clamping for points dragged outside).

**Architecture:**
- A generic `Region` abstraction (`src/utils/region.ts`) caches turf primitives once via `createRegion()` and exposes `isInsideRegion(coords, region)` / `clampToRegion(coords, region)` for any closed polygon.
- The storm-specific region is a thin singleton (`src/utils/storm-placement-region.ts`) built from a GeoJSON file.
- A stateless `PolygonRegion` component renders any `Region` with caller-supplied `PathOptions` — `MapView` mounts it conditionally on `ui.setupMode === "stormLocation"`.
- `HurricaneMarker` becomes draggable in setup mode and clamps live during drag; on `dragend` it commits the position through the existing `setStartLocation` path and logs `StartLocationChanged` exactly like the existing dropdown handler.

**Tech Stack:** React + react-leaflet v5, MobX (decorators), Turf.js (`@turf/helpers` already in deps; adds `@turf/boolean-point-in-polygon`, `@turf/nearest-point-on-line`), Jest + Testing Library.

**Design doc:** [2026-05-19-storm-placement-region-design.md](2026-05-19-storm-placement-region-design.md)

---

## Task 1: Add turf dependencies and the GeoJSON data file

**Files:**
- Modify: `package.json`
- Create: `src/assets/storm-placement-region.json`

**Step 1: Install the two new turf packages**

Run:
```bash
npm install --save @turf/boolean-point-in-polygon @turf/nearest-point-on-line
```

Expected: `package.json` and `package-lock.json` updated; no install errors. Both packages should appear under `dependencies`.

**Step 2: Create the GeoJSON data file**

Source coordinates are the LineString the user provided, with two cleanups:
- Removed the duplicate `[-77.635728, 33.841221]` (it appeared twice consecutively at indices 7 and 8).
- Appended the first coordinate to the end so the ring is explicitly closed (required by turf's polygon helper).

Create `src/assets/storm-placement-region.json` with exactly:

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {},
      "geometry": {
        "type": "LineString",
        "coordinates": [
          [-22.324469, 21.194761],
          [-38.53639, 26.853259],
          [-49.980098, 28.122197],
          [-54.271489, 29.376292],
          [-59.993343, 33.045484],
          [-63.807913, 34.236341],
          [-70.48341, 34.629616],
          [-77.635728, 33.841221],
          [-81.450297, 31.024607],
          [-87.648973, 28.959936],
          [-92.417185, 28.5419],
          [-96.231755, 28.122197],
          [-97.662218, 22.081191],
          [-97.185397, 20.749528],
          [-87.648973, 16.686155],
          [-80.019834, 9.72776],
          [-77.158907, 9.72776],
          [-68.576125, 11.60201],
          [-22.837508, 12.068693],
          [-21.407045, 12.999596],
          [-20.453402, 16.228871],
          [-19.976581, 20.302981],
          [-21.407045, 21.638656],
          [-20.930224, 20.749528],
          [-22.324469, 21.194761]
        ]
      }
    }
  ]
}
```

**Step 3: Commit**

```bash
git add package.json package-lock.json src/assets/storm-placement-region.json
git commit -m "Add turf deps and storm placement region GeoJSON"
```

---

## Task 2: Generic `region.ts` helpers (TDD)

**Files:**
- Create: `src/utils/region.test.ts`
- Create: `src/utils/region.ts`

The helpers are tested against a synthetic unit square so assertions are exact. The real basin data is exercised in Task 3.

**Step 1: Write the failing tests**

Create `src/utils/region.test.ts`:

```ts
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
      expect(snapped.lat).toBeCloseTo(0.5, 5);
    });

    it("snaps a point directly below the bottom edge to that edge", () => {
      const snapped = clampToRegion({ lat: -1, lng: 0.5 }, region);
      expect(snapped.lat).toBeCloseTo(0, 5);
      expect(snapped.lng).toBeCloseTo(0.5, 5);
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx jest src/utils/region.test.ts`

Expected: All tests fail because `src/utils/region.ts` does not exist yet.

**Step 3: Write the implementation**

Create `src/utils/region.ts`:

```ts
import { Feature, FeatureCollection, LineString, Polygon } from "geojson";
import { point, polygon as turfPolygon, lineString } from "@turf/helpers";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import nearestPointOnLine from "@turf/nearest-point-on-line";
import { ICoordinates } from "../types";

export interface Region {
  polygon: Feature<Polygon>;
  ring: Feature<LineString>;
  latLngs: Array<[number, number]>;
}

export function createRegion(data: FeatureCollection): Region {
  const geom = data.features[0].geometry;
  const ring = (geom.type === "Polygon" ? geom.coordinates[0] : geom.coordinates) as Array<[number, number]>;
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
```

**Step 4: Run tests to verify they pass**

Run: `npx jest src/utils/region.test.ts`

Expected: All tests in `region` describe block pass.

**Step 5: Run the full suite to catch regressions**

Run: `npm test -- --watchAll=false`

Expected: No new failures (existing tests still pass).

**Step 6: Commit**

```bash
git add src/utils/region.ts src/utils/region.test.ts
git commit -m "Add generic region utility (isInsideRegion, clampToRegion)"
```

---

## Task 3: Storm placement region singleton (TDD)

**Files:**
- Create: `src/utils/storm-placement-region.test.ts`
- Create: `src/utils/storm-placement-region.ts`

**Step 1: Write the failing test**

Create `src/utils/storm-placement-region.test.ts`:

```ts
import { isInsideRegion, clampToRegion } from "./region";
import { stormPlacementRegion } from "./storm-placement-region";

describe("stormPlacementRegion", () => {
  it("contains a known mid-Atlantic point", () => {
    // Roughly the central Atlantic, well inside the basin.
    expect(isInsideRegion({ lat: 25, lng: -50 }, stormPlacementRegion)).toBe(true);
  });

  it("does not contain a Pacific point", () => {
    expect(isInsideRegion({ lat: 25, lng: -130 }, stormPlacementRegion)).toBe(false);
  });

  it("clamps a Pacific point back onto the boundary", () => {
    const snapped = clampToRegion({ lat: 25, lng: -130 }, stormPlacementRegion);
    expect(isInsideRegion(snapped, stormPlacementRegion)).toBe(true);
    // Snapped point should be much closer to the basin's western edge than the original.
    expect(snapped.lng).toBeGreaterThan(-130);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/utils/storm-placement-region.test.ts`

Expected: Fails because `storm-placement-region.ts` doesn't exist.

**Step 3: Write the implementation**

Create `src/utils/storm-placement-region.ts`:

```ts
import { FeatureCollection } from "geojson";
import { createRegion } from "./region";
import regionData from "../assets/storm-placement-region.json";

export const stormPlacementRegion = createRegion(regionData as FeatureCollection);
```

**Step 4: Run test to verify it passes**

Run: `npx jest src/utils/storm-placement-region.test.ts`

Expected: All three tests pass.

> Note on the third assertion: `nearestPointOnLine` returns a point exactly on the polygon's boundary. `booleanPointInPolygon` treats boundary points as inside by default, so the `isInsideRegion(snapped, ...)` assertion should hold. If it doesn't, the most likely cause is a numerical precision issue from turf — in that case, switch the assertion to a small-epsilon check (`Math.abs(isInside - true) < 1e-9` style) or remove the assertion entirely and just keep the "lng moved east" check.

**Step 5: Commit**

```bash
git add src/utils/storm-placement-region.ts src/utils/storm-placement-region.test.ts
git commit -m "Add storm placement region singleton"
```

---

## Task 4: `PolygonRegion` component (TDD)

**Files:**
- Create: `src/components/polygon-region.test.tsx`
- Create: `src/components/polygon-region.tsx`

The component is intentionally stateless — visibility is decided by the caller.

**Step 1: Write the failing test**

Create `src/components/polygon-region.test.tsx`:

```tsx
import * as React from "react";
import { render } from "@testing-library/react";
import { MapContainer } from "react-leaflet";
import { PolygonRegion } from "./polygon-region";
import { createRegion } from "../utils/region";
import { FeatureCollection } from "geojson";

const unitSquare: FeatureCollection = {
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

describe("PolygonRegion component", () => {
  it("renders without crashing inside a MapContainer", () => {
    const region = createRegion(unitSquare);
    const pathOptions = { color: "red", weight: 2, fillColor: "red", fillOpacity: 0.1 };
    render(
      <MapContainer center={[0, 0]} zoom={2}>
        <PolygonRegion region={region} pathOptions={pathOptions} />
      </MapContainer>
    );
    // react-leaflet renders polygons as SVG paths inside the leaflet overlay pane.
    const paths = document.querySelectorAll("path.leaflet-interactive");
    expect(paths.length).toBeGreaterThan(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/components/polygon-region.test.tsx`

Expected: Fails because `polygon-region.tsx` doesn't exist.

**Step 3: Write the implementation**

Create `src/components/polygon-region.tsx`:

```tsx
import * as React from "react";
import { Polygon } from "react-leaflet";
import { PathOptions } from "leaflet";
import { Region } from "../utils/region";

interface IProps {
  region: Region;
  pathOptions: PathOptions;
}

export const PolygonRegion = ({ region, pathOptions }: IProps) => (
  <Polygon positions={region.latLngs} pathOptions={pathOptions} />
);
```

**Step 4: Run test to verify it passes**

Run: `npx jest src/components/polygon-region.test.tsx`

Expected: Test passes.

**Step 5: Commit**

```bash
git add src/components/polygon-region.tsx src/components/polygon-region.test.tsx
git commit -m "Add generic PolygonRegion overlay component"
```

---

## Task 5: Render the storm placement region in `MapView`

**Files:**
- Modify: `src/components/map-view.tsx`

The polygon should appear inside the existing `<MapContainer>`, gated on `ui.setupMode === "stormLocation"`. `MapView` is a class component already wrapped with `inject("stores") @observer`, so `this.stores.ui.setupMode` is reactive without new wiring.

**Step 1: Add imports**

In [src/components/map-view.tsx](../../src/components/map-view.tsx), add to the existing imports near the top of the file:

```tsx
import { PolygonRegion } from "./polygon-region";
import { stormPlacementRegion } from "../utils/storm-placement-region";
```

**Step 2: Add the path options constant**

Just above the class declaration (or wherever module-level constants live in the file), add:

```tsx
const stormPlacementPathOptions = {
  color: "#0072B2",
  weight: 2,
  fillColor: "#0072B2",
  fillOpacity: 0.1,
};
```

> The color is a placeholder accent blue that contrasts cleanly with the map tiles. If `src/components/common.scss` (or similar) exports a brand color you'd prefer, swap it in.

**Step 3: Render the overlay conditionally**

Inside the existing `render()` method, find the block that renders the conditional `ThermometerMarker` overlays (around lines 219–224 in the current file). Add this immediately after them, before the `<AttributionControl>`:

```tsx
{ui.setupMode === "stormLocation" &&
  <PolygonRegion region={stormPlacementRegion} pathOptions={stormPlacementPathOptions} />
}
```

> `ui` is already destructured from `this.stores` in this render method (verify before editing — if not, add `const { ui } = this.stores;` at the top of `render()`).

**Step 4: Verify the build / lint**

Run: `npm run lint && npx tsc --noEmit`

Expected: No new lint or type errors.

**Step 5: Run the full test suite**

Run: `npm test -- --watchAll=false`

Expected: All tests pass.

**Step 6: Commit**

```bash
git add src/components/map-view.tsx
git commit -m "Show storm placement region in MapView during setup"
```

---

## Task 6: Make the hurricane marker draggable in setup mode with clamping + logging (TDD)

**Files:**
- Modify: `src/components/hurricane-marker.tsx`
- Modify: `src/components/hurricane-marker.test.tsx`

`LeafletCustomMarker` already accepts `draggable`, `onDrag`, and `onDragEnd` props ([src/components/leaflet-custom-marker.tsx:9-16](../../src/components/leaflet-custom-marker.tsx#L9-L16)) — no changes needed to it.

**Step 1: Extend the existing hurricane-marker tests**

Open `src/components/hurricane-marker.test.tsx`. Replace the existing single test in the `HurricaneMarker` describe block with the following (keep the surrounding `HurricaneIcon` describe block untouched):

```tsx
describe("HurricaneMarker component", () => {
  let stores = createStores();
  beforeEach(() => {
    stores = createStores();
  });

  const renderMarker = () => render(
    <Provider stores={stores}>
      <MapContainer center={[0, 0]} zoom={10}>
        <HurricaneMarker />
      </MapContainer>
    </Provider>
  );

  it("renders without crashing", () => {
    renderMarker();
  });

  it("is not draggable by default (outside of setup mode)", () => {
    stores.ui.setSetupMode(undefined);
    renderMarker();
    const draggableEl = document.querySelector(".leaflet-marker-draggable");
    expect(draggableEl).toBeNull();
  });

  it("is draggable while in stormLocation setup mode and simulation has not started", () => {
    stores.ui.setSetupMode("stormLocation");
    stores.simulation.simulationStarted = false;
    renderMarker();
    const draggableEl = document.querySelector(".leaflet-marker-draggable");
    expect(draggableEl).not.toBeNull();
  });

  it("is not draggable once the simulation has started, even in setup mode", () => {
    stores.ui.setSetupMode("stormLocation");
    stores.simulation.simulationStarted = true;
    renderMarker();
    const draggableEl = document.querySelector(".leaflet-marker-draggable");
    expect(draggableEl).toBeNull();
  });
});
```

You'll also need this import at the top of the file (next to the existing `Provider` import):

```tsx
import { Provider } from "mobx-react";
```

(It's already there — confirm.)

**Step 2: Run the tests to verify they fail**

Run: `npx jest src/components/hurricane-marker.test.tsx`

Expected: The three new "draggable" tests fail. The current implementation always passes `draggable={false}`, so the "is draggable while in stormLocation" test will fail; the "is not draggable" tests will incidentally pass — that's fine.

**Step 3: Update the marker to be conditionally draggable with clamping**

Replace the entire `HurricaneMarker` class in `src/components/hurricane-marker.tsx` with:

```tsx
@inject("stores")
@observer
export class HurricaneMarker extends BaseComponent<IProps, IState> {
  public render() {
    const { ui, simulation } = this.stores;
    const hurricane = simulation.hurricane;
    const draggable = ui.setupMode === "stormLocation" && !simulation.simulationStarted;
    return (
      <LeafletCustomMarker
        position={hurricane.center}
        draggable={draggable}
        onDrag={this.handleDrag}
        onDragEnd={this.handleDragEnd}
      >
        <HurricaneIcon />
      </LeafletCustomMarker>
    );
  }

  private handleDrag = (e: Leaflet.LeafletEvent) => {
    const marker = e.target as Leaflet.Marker;
    const raw = marker.getLatLng();
    const clamped = clampToRegion({ lat: raw.lat, lng: raw.lng }, stormPlacementRegion);
    if (clamped.lat !== raw.lat || clamped.lng !== raw.lng) {
      marker.setLatLng(clamped);
    }
  }

  private handleDragEnd = (e: Leaflet.DragEndEvent) => {
    const { lat, lng } = (e.target as Leaflet.Marker).getLatLng();
    const startLocation: ICoordinates = { lat, lng };
    this.stores.simulation.setStartLocation(startLocation);
    log("StartLocationChanged", { startLocation });
  }
}
```

Add these imports to the top of `src/components/hurricane-marker.tsx` (preserve the existing ones):

```tsx
import * as Leaflet from "leaflet";
import { clampToRegion } from "../utils/region";
import { stormPlacementRegion } from "../utils/storm-placement-region";
import { ICoordinates } from "../types";
import { log } from "../log";
```

**Step 4: Run the tests to verify they pass**

Run: `npx jest src/components/hurricane-marker.test.tsx`

Expected: All tests pass, including the three new draggability cases.

**Step 5: Run the full test suite**

Run: `npm test -- --watchAll=false`

Expected: Everything green.

**Step 6: Run lint + type check**

Run: `npm run lint && npx tsc --noEmit`

Expected: Clean.

**Step 7: Commit**

```bash
git add src/components/hurricane-marker.tsx src/components/hurricane-marker.test.tsx
git commit -m "Make hurricane marker draggable in setup mode with region clamping"
```

---

## Task 7: Manual browser verification

**Files:** none.

**Step 1: Start the dev server**

Run: `npm start`

Expected: Webpack dev server boots, page loads at `http://localhost:8080` (or whatever port the project uses).

**Step 2: Verify the region overlay**

- Open the left panel and enter the Setup → Storm Location section.
- The Atlantic basin polygon should appear as a translucent shape with a stroked outline.
- Exit the Storm Location section (collapse the panel or switch to another setup section). The polygon should disappear.

**Step 3: Verify draggable + clamping**

- Re-enter Storm Location setup mode.
- Drag the hurricane marker around inside the polygon — it should follow the cursor exactly.
- Drag it well outside the polygon (e.g. into the Pacific or far ocean). The marker should snap to the polygon's boundary and ride along the edge as you keep dragging outward.
- Release the drag. The hurricane should commit to its final clamped position.

**Step 4: Verify drag is disabled outside setup mode and after sim start**

- Close the Storm Location section. Try to drag the hurricane — it should not move.
- Re-enter setup, then click "Start" to begin the simulation. While the sim runs, the marker should not be draggable (returning to setup mode after starting is out of scope).

**Step 5: Spot-check logging**

If running inside a LARA preview (or with `?logMonitor=true`), confirm that releasing a drag produces a `StartLocationChanged` log event with `{ startLocation: { lat, lng } }`.

> No commit for this task — purely a verification step.

---

## Risks / things to watch for

- **`booleanPointInPolygon` and points exactly on the boundary.** Turf treats boundary points as inside by default. Task 3's third assertion relies on this. If turf's behavior has changed in the installed version, fall back to the looser assertion noted in that task.
- **`PolygonRegion` test under jsdom.** react-leaflet renders SVG paths into Leaflet's overlay pane on layout. The test only asserts that *some* `.leaflet-interactive` path exists after mount. If the test is flaky under jsdom because of timing, swap the assertion for `await screen.findByX(...)` or check the leaflet layer registry directly.
- **`MapView` brittleness.** The insertion point in Task 5 assumes `ui` is already in scope inside `render()`. If it's not (file may have drifted since this plan was written), add the destructure at the top of `render()`.
- **Color picking.** The `#0072B2` placeholder in Task 5 is just an accessible blue. If the project already has a brand-accent variable in `common.scss`, prefer it.

## Out of scope (per design)

- Authorable region via URL params / authored state.
- Snapping behavior other than nearest-boundary-point.
- Showing the region outside of setup mode.
- Constraining the hurricane during the running simulation.
