# StormLocationSection lat/lng inputs — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fill out `StormLocationSection` with two text inputs that read and write `simulation.startLocation.lat` / `.lng`, staying live-synced with the hurricane marker during drag and snapping out-of-region values into the legal placement region while preserving the user's entered coordinate when possible.

**Architecture:** Add a pure-geometry helper `snapToRegionPreservingAxis` to [src/utils/region.ts](../../src/utils/region.ts). Turn `StormLocationSection` into an `observer` component with two text inputs whose local state syncs from `hurricane.center` on every render. Enter / blur commits via a small pipeline (parse → snap-preserving → clampToRegion fallback) that ends in `simulation.setStartLocation`. Escape reverts.

**Tech Stack:** React 18, MobX 6 (class-based with decorators, `observer` from `mobx-react`), Jest + `@testing-library/react`, TypeScript, SCSS modules. Existing utilities: `clampToRegion`, `isInsideRegion`, `resolveStartLocation`, `stormPlacementRegion`.

**Design reference:** [docs/plans/2026-05-28-storm-location-inputs-design.md](2026-05-28-storm-location-inputs-design.md)

---

## Task 1: Add `snapToRegionPreservingAxis` to region utilities

**Files:**
- Modify: `src/utils/region.ts`
- Test: `src/utils/region.test.ts`

The helper takes `coords` and tries to return a legal point with `axis` preserved at `coords[axis]`. If `coords` is already inside the region, it returns `coords` unchanged. Otherwise it finds the legal value on the `axis = coords[axis]` line closest to `coords[other]`. Returns `null` if the line doesn't intersect the region at all.

**Step 1: Write the failing tests**

Add a new describe block at the end of `src/utils/region.test.ts` (inside the existing top-level `describe("region", ...)`). Also import the new function:

```ts
import { createRegion, isInsideRegion, clampToRegion, snapToRegionPreservingAxis } from "./region";
```

Then add (just before the closing `});` of the top-level describe):

```ts
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
      const snapped = snapToRegionPreservingAxis(region, "lng", { lat: 0.75, lng: 0.25 });
      expect(snapped!.lng).toBeCloseTo(0.25, 5);
      expect(snapped!.lat).toBeCloseTo(0.75, 5);
    });
  });
```

**Step 2: Run tests to verify they fail**

Run: `npx jest src/utils/region.test.ts`
Expected: All four new tests fail with a TypeScript / "snapToRegionPreservingAxis is not a function" style error.

**Step 3: Implement the helper**

Add to the end of `src/utils/region.ts`:

```ts
export function snapToRegionPreservingAxis(
  region: Region,
  axis: "lat" | "lng",
  coords: ICoordinates
): ICoordinates | null {
  if (isInsideRegion(coords, region)) return coords;

  // Walk the polygon ring and collect "other-axis" values where the ring
  // crosses the line `axis = target`. The closest of these is the
  // nearest legal value on that line, given that `coords` is outside the
  // region (and therefore `preferredOther` is outside every valid
  // interval on that line — assuming a simple polygon).
  const ringCoords = region.ring.geometry.coordinates;
  const crossings: number[] = [];
  const [target, preferredOther] = axis === "lat" ? [coords.lat, coords.lng] : [coords.lng, coords.lat];

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
    crossings.push(o1 + t * (o2 - o1));
  }

  if (crossings.length <= 0) return null;

  let best: number | null = null;
  let bestDist = Infinity;
  crossings.forEach(crossing => {
    const dist = Math.abs(crossing - preferredOther);
    if (dist < bestDist) {
      bestDist = dist;
      best = crossing;
    }
  });

  if (best === null) return null;
  return axis === "lat"
    ? { lat: target, lng: best }
    : { lat: best, lng: target };
}
```

**Step 4: Run tests to verify they pass**

Run: `npx jest src/utils/region.test.ts`
Expected: All tests pass (existing + 4 new).

**Step 5: Commit**

```bash
git add src/utils/region.ts src/utils/region.test.ts
git commit -m "Add snapToRegionPreservingAxis helper."
```

---

## Task 2: Add SCSS for the storm-location section

**Files:**
- Create: `src/components/left-panel/storm-location-section.scss`

**Step 1: Create the stylesheet**

Write to `src/components/left-panel/storm-location-section.scss`:

```scss
@use "../common" as *;

.coordinates {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 8px 12px;
  align-items: center;
}

.label {
  font-family: $scaleFont;
  font-size: 13px;
  font-weight: bold;
}

.input {
  font-family: $scaleFont;
  font-size: 13px;
  padding: 4px 6px;
  border: 1px solid #797979;
  border-radius: 4px;
  width: 100%;
  box-sizing: border-box;
}
```

Note: this mirrors the patterns in [storm-category-section.scss](../../src/components/left-panel/storm-category-section.scss) (uses `common` partial and `$scaleFont`).

**Step 2: Commit**

```bash
git add src/components/left-panel/storm-location-section.scss
git commit -m "Add SCSS for storm location coordinate inputs."
```

---

## Task 3: Render the storm-location inputs reading from the model

This task adds the inputs and the read-only sync from `hurricane.center` → input text. No commit / edit handling yet — that's Task 4.

**Files:**
- Modify: `src/components/left-panel/storm-location-section.tsx`
- Test: `src/components/left-panel/storm-location-section.test.tsx`

**Step 1: Write the failing test**

Create `src/components/left-panel/storm-location-section.test.tsx`:

```tsx
import * as React from "react";
import { act, render, screen, fireEvent } from "@testing-library/react";
import { Provider } from "mobx-react";

import { createStores, IStores } from "../../models/stores";
import { StoresContext } from "../../stores-context";
import { StormLocationSection } from "./storm-location-section";

const renderSection = (stores: IStores) =>
  render(
    <Provider stores={stores}>
      <StoresContext value={stores}>
        <StormLocationSection />
      </StoresContext>
    </Provider>
  );

const openSection = () => {
  fireEvent.click(screen.getByTestId("storm-location-button"));
};

const latInput = () => screen.getByTestId("storm-location-lat-input") as HTMLInputElement;
const lngInput = () => screen.getByTestId("storm-location-lng-input") as HTMLInputElement;

// A coordinate that is well inside the storm placement region (Caribbean / Gulf).
const interiorPoint = { lat: 20, lng: -60 };

describe("StormLocationSection", () => {
  let stores: IStores;

  beforeEach(() => {
    stores = createStores();
    // Force a known starting coord so display assertions are deterministic.
    stores.simulation.setStartLocation(interiorPoint);
  });

  it("displays the current hurricane center coordinates with 2 decimals", () => {
    renderSection(stores);
    openSection();
    expect(latInput().value).toBe("20.00");
    expect(lngInput().value).toBe("-60.00");
  });

  it("updates both inputs live when the hurricane center moves (e.g. drag)", () => {
    renderSection(stores);
    openSection();

    act(() => {
      // Simulate the drag handler updating just hurricane.center.
      stores.simulation.hurricane.setCenter({ lat: 25.123, lng: -75.987 }, stores.simulation.pressureSystems);
    });

    expect(latInput().value).toBe("25.12");
    expect(lngInput().value).toBe("-75.99");
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx jest src/components/left-panel/storm-location-section.test.tsx`
Expected: tests fail because `storm-location-lat-input` / `storm-location-lng-input` test IDs don't exist yet.

**Step 3: Implement the display-only version of the component**

Replace the contents of `src/components/left-panel/storm-location-section.tsx`:

```tsx
import { observer } from "mobx-react";
import React, { useEffect, useState } from "react";

import { useStores } from "../../stores-context";
import { SetupSection } from "./setup-section";

import HurricaneIcon from "../../assets/left-panel/hurricane.svg";

import css from "./storm-location-section.scss";

const hint = "Drag the storm to a starting position within the highlighted area on the map, "
  + "or type a latitude and longitude below.";

const formatCoord = (value: number) => value.toFixed(2);

export const StormLocationSection = observer(function StormLocationSection() {
  const stores = useStores();
  const center = stores?.simulation.hurricane.center;
  const lat = center?.lat ?? 0;
  const lng = center?.lng ?? 0;

  const [latText, setLatText] = useState(formatCoord(lat));
  const [lngText, setLngText] = useState(formatCoord(lng));

  // Keep inputs synced to the model on every model change — including while
  // focused, so drag updates the focused input live (per design).
  useEffect(() => {
    setLatText(formatCoord(lat));
  }, [lat]);
  useEffect(() => {
    setLngText(formatCoord(lng));
  }, [lng]);

  return (
    <SetupSection
      dataTest="storm-location"
      hint={hint}
      Icon={HurricaneIcon}
      setupMode="stormLocation"
      title="Storm Start Location"
    >
      <div className={css.coordinates}>
        <label className={css.label} htmlFor="storm-location-lat">Latitude</label>
        <input
          id="storm-location-lat"
          className={css.input}
          type="text"
          value={latText}
          onChange={e => setLatText(e.target.value)}
          data-test="storm-location-lat-input"
        />
        <label className={css.label} htmlFor="storm-location-lng">Longitude</label>
        <input
          id="storm-location-lng"
          className={css.input}
          type="text"
          value={lngText}
          onChange={e => setLngText(e.target.value)}
          data-test="storm-location-lng-input"
        />
      </div>
    </SetupSection>
  );
});
```

**Step 4: Run tests to verify they pass**

Run: `npx jest src/components/left-panel/storm-location-section.test.tsx`
Expected: both tests pass.

**Step 5: Commit**

```bash
git add src/components/left-panel/storm-location-section.tsx src/components/left-panel/storm-location-section.test.tsx
git commit -m "Render storm location inputs that sync with hurricane center."
```

---

## Task 4: Add commit / cancel handling with snap pipeline

This task wires up the keyboard / blur handling and the in-region → snap-preserving → clamp fallback pipeline that ends in `simulation.setStartLocation`.

**Files:**
- Modify: `src/components/left-panel/storm-location-section.tsx`
- Test: `src/components/left-panel/storm-location-section.test.tsx`

**Step 1: Write the failing tests**

Append to the `describe("StormLocationSection", ...)` block in `src/components/left-panel/storm-location-section.test.tsx`:

```tsx
  it("commits a valid in-region value on Enter and updates startLocation", () => {
    renderSection(stores);
    openSection();

    fireEvent.change(latInput(), { target: { value: "22.5" } });
    fireEvent.keyDown(latInput(), { key: "Enter" });

    expect(stores.simulation.startLocation).toEqual({ lat: 22.5, lng: -60 });
    expect(latInput().value).toBe("22.50");
  });

  it("commits a valid in-region value on blur", () => {
    renderSection(stores);
    openSection();

    fireEvent.change(lngInput(), { target: { value: "-65" } });
    fireEvent.blur(lngInput());

    expect(stores.simulation.startLocation).toEqual({ lat: 20, lng: -65 });
    expect(lngInput().value).toBe("-65.00");
  });

  it("reverts to the model value on Escape without committing", () => {
    renderSection(stores);
    openSection();

    fireEvent.change(latInput(), { target: { value: "99" } });
    expect(latInput().value).toBe("99");
    fireEvent.keyDown(latInput(), { key: "Escape" });

    expect(latInput().value).toBe("20.00");
    expect(stores.simulation.startLocation).toEqual(interiorPoint);
  });

  it("reverts silently when the input is non-numeric", () => {
    renderSection(stores);
    openSection();

    fireEvent.change(latInput(), { target: { value: "abc" } });
    fireEvent.blur(latInput());

    expect(latInput().value).toBe("20.00");
    expect(stores.simulation.startLocation).toEqual(interiorPoint);
  });

  it("reverts silently when the input is empty", () => {
    renderSection(stores);
    openSection();

    fireEvent.change(lngInput(), { target: { value: "" } });
    fireEvent.blur(lngInput());

    expect(lngInput().value).toBe("-60.00");
    expect(stores.simulation.startLocation).toEqual(interiorPoint);
  });

  it("preserves the entered lat when (lat, currentLng) is outside the region", () => {
    // Pick a lat that's inside the region's lat range but where the *current*
    // lng (-60) is outside the legal lng range for that lat. The storm
    // placement region's southern tip is around lat 4 with lng around -45 to -52.
    // At lat = 5, current lng = -60 is outside; snap should preserve lat = 5
    // and pick an in-region lng close to -60.
    renderSection(stores);
    openSection();

    fireEvent.change(latInput(), { target: { value: "5" } });
    fireEvent.blur(latInput());

    expect(stores.simulation.startLocation.lat).toBeCloseTo(5, 5);
    // Lng was preserved-via-snap, not clamped along the polygon edge — so it
    // should still be close to a legal lng on the lat=5 line. Just assert
    // we're in the region.
    const committed = stores.simulation.startLocation as { lat: number; lng: number };
    // Imported lazily to keep the test file's imports tidy.
    const { isInsideRegion } = require("../../utils/region");
    const { stormPlacementRegion } = require("../../utils/storm-placement-region");
    expect(isInsideRegion(committed, stormPlacementRegion)).toBe(true);
  });

  it("falls back to clampToRegion when the entered axis is outside the region entirely", () => {
    renderSection(stores);
    openSection();

    // lat = 90 is way above the region — no legal lng exists at that lat.
    fireEvent.change(latInput(), { target: { value: "90" } });
    fireEvent.blur(latInput());

    const committed = stores.simulation.startLocation as { lat: number; lng: number };
    const { isInsideRegion } = require("../../utils/region");
    const { stormPlacementRegion } = require("../../utils/storm-placement-region");
    expect(isInsideRegion(committed, stormPlacementRegion)).toBe(true);
    // The clamped lat should NOT be 90 — it should snap into the region.
    expect(committed.lat).toBeLessThan(90);
  });
```

**Step 2: Run tests to verify they fail**

Run: `npx jest src/components/left-panel/storm-location-section.test.tsx`
Expected: the 7 new tests fail (Enter / blur do nothing yet, Escape doesn't reset, etc.). The original 2 tests still pass.

**Step 3: Update the component with commit / cancel logic**

Replace the contents of `src/components/left-panel/storm-location-section.tsx`:

```tsx
import { observer } from "mobx-react";
import React, { useEffect, useState } from "react";

import { ICoordinates } from "../../types";
import { useStores } from "../../stores-context";
import { clampToRegion, snapToRegionPreservingAxis } from "../../utils/region";
import { stormPlacementRegion } from "../../utils/storm-placement-region";
import { SetupSection } from "./setup-section";

import HurricaneIcon from "../../assets/left-panel/hurricane.svg";

import css from "./storm-location-section.scss";

const hint = "Drag the storm to a starting position within the highlighted area on the map, "
  + "or type a latitude and longitude below.";

const formatCoord = (value: number) => value.toFixed(2);

type Axis = "lat" | "lng";

const resolveCommit = (
  axis: Axis,
  target: number,
  currentOther: number
): ICoordinates => {
  const candidate: ICoordinates = axis === "lat"
    ? { lat: target, lng: currentOther }
    : { lat: currentOther, lng: target };

  const preserved = snapToRegionPreservingAxis(stormPlacementRegion, axis, candidate);
  if (preserved) return preserved;

  return clampToRegion(candidate, stormPlacementRegion);
};

export const StormLocationSection = observer(function StormLocationSection() {
  const stores = useStores();
  const center = stores?.simulation.hurricane.center;
  const lat = center?.lat ?? 0;
  const lng = center?.lng ?? 0;

  const [latText, setLatText] = useState(formatCoord(lat));
  const [lngText, setLngText] = useState(formatCoord(lng));

  useEffect(() => { setLatText(formatCoord(lat)); }, [lat]);
  useEffect(() => { setLngText(formatCoord(lng)); }, [lng]);

  const commit = (axis: Axis, text: string) => {
    if (!stores) return;
    const parsed = parseFloat(text);
    if (!isFinite(parsed)) {
      // Non-numeric or empty — revert silently.
      if (axis === "lat") setLatText(formatCoord(lat));
      else setLngText(formatCoord(lng));
      return;
    }
    const currentOther = axis === "lat" ? lng : lat;
    const next = resolveCommit(axis, parsed, currentOther);
    stores.simulation.setStartLocation(next);
  };

  const revert = (axis: Axis) => {
    if (axis === "lat") setLatText(formatCoord(lat));
    else setLngText(formatCoord(lng));
  };

  const handleKeyDown = (axis: Axis) => (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      commit(axis, e.currentTarget.value);
      e.currentTarget.blur();
    } else if (e.key === "Escape") {
      revert(axis);
      e.currentTarget.blur();
    }
  };

  return (
    <SetupSection
      dataTest="storm-location"
      hint={hint}
      Icon={HurricaneIcon}
      setupMode="stormLocation"
      title="Storm Start Location"
    >
      <div className={css.coordinates}>
        <label className={css.label} htmlFor="storm-location-lat">Latitude</label>
        <input
          id="storm-location-lat"
          className={css.input}
          type="text"
          value={latText}
          onChange={e => setLatText(e.target.value)}
          onBlur={e => commit("lat", e.target.value)}
          onKeyDown={handleKeyDown("lat")}
          data-test="storm-location-lat-input"
        />
        <label className={css.label} htmlFor="storm-location-lng">Longitude</label>
        <input
          id="storm-location-lng"
          className={css.input}
          type="text"
          value={lngText}
          onChange={e => setLngText(e.target.value)}
          onBlur={e => commit("lng", e.target.value)}
          onKeyDown={handleKeyDown("lng")}
          data-test="storm-location-lng-input"
        />
      </div>
    </SetupSection>
  );
});
```

**Step 4: Run tests to verify they pass**

Run: `npx jest src/components/left-panel/storm-location-section.test.tsx`
Expected: all 9 tests pass.

**Step 5: Commit**

```bash
git add src/components/left-panel/storm-location-section.tsx src/components/left-panel/storm-location-section.test.tsx
git commit -m "Wire up storm location inputs to commit, revert, and snap to region."
```

---

## Task 5: Verification pass

**Step 1: Run full test suite**

Run: `npx jest`
Expected: all tests pass with no regressions.

**Step 2: Run linter**

Run: `npm run lint`
Expected: no new errors. If `no-unused-vars` complains about anything I removed in the rewrite, drop those imports.

**Step 3: Manual smoke test (per CLAUDE.md guidance on UI changes)**

Run: `npm start` and open the app in a browser. Verify:
- Open the "Storm Start Location" section in the left panel. Inputs show the current lat / lng with 2 decimals.
- Drag the hurricane marker on the map. Both inputs update live.
- Type a new in-region lat, press Enter. Marker jumps to that lat at the current lng. Input reformats to 2 decimals.
- Type a new lng, blur the field. Marker jumps. Input reformats.
- Type a value, press Escape. Input reverts; marker doesn't move.
- Type `lat = 5` (a lat where current lng is outside the region). Marker jumps to `lat = 5` with an adjusted lng inside the region — not to the nearest edge point of the original (lat, lng).
- Type `lat = 90`. Marker snaps to somewhere inside the region (clamp fallback). Lat is not 90.
- Type letters or empty. On blur / Enter, input reverts to the model value silently.

**Step 4: Commit any cleanup**

If there are last-minute tweaks, commit them. Otherwise nothing to do.

---

## Notes for the implementer

- Existing patterns: copy structure from [storm-category-section.tsx](../../src/components/left-panel/storm-category-section.tsx) for the observer + `useStores` pattern, and from [storm-category-section.test.tsx](../../src/components/left-panel/storm-category-section.test.tsx) for the test harness (Provider + StoresContext, click section button to open).
- The `useEffect` deps `[lat]` / `[lng]` are intentional: any model change re-syncs the input, even when focused. This is the agreed UX (drag-during-edit clobbers the user's text).
- `simulation.setStartLocation` handles the drag-end equivalent path — for `ICoordinates` input it just sets the start location and updates `hurricane.center`. Pressure-system / strength logic only runs for named locations.
- Do **not** read `simulation.startLocation` for display: it can be a string (`"atlantic"` / `"gulf"`). Read `hurricane.center` instead — it's always `ICoordinates` and follows drag live.
- Keep the LARA logging behavior consistent: the existing drag handler logs `"StartLocationChanged"` on drag-end. Coordinate-input commits go through `setStartLocation`, which doesn't log directly — for parity, we could add a `log("StartLocationChanged", { startLocation: next })` call in the `commit` function. **Optional**: include this in Task 4's `commit` function if the team wants telemetry parity. If unsure, leave it out — it's easy to add later.
