# Sea-Surface-Temperature Anomalies Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let users raise/lower the sea-surface temperature of four ocean regions (Gulf, Caribbean, Central Atlantic, Coastal Africa) by ±3 °C in 1 °C steps, feeding the simulation, authorable/URL-settable, saved in interactive state, and adjustable from both a left-panel section and controls drawn on the map.

**Architecture:** `types.ts` defines `namedRegions` (an `as const` array of the four region keys) and derives the `NamedRegion` type from it; that array is the canonical iteration order used everywhere. A `temperatureAnomalyRegions` registry (`Record<NamedRegion, NamedRegionData>`) is the single source of truth for the regions' data. `SimulationModel` gains an observable `temperatureAnomalies` map (key → °C, undefined treated as 0); `seaSurfaceTempAt` adds the anomaly of any non-zero region containing the point. A reusable `RegionTemperatureControl` renders the −/status/+ control in both the left panel and centered-in-region map markers. SST PNG overlay recoloring is explicitly **out of scope** (separate follow-up).

**Tech Stack:** TypeScript, React, MobX 6 (class decorators + `makeObservable`), react-leaflet, `@turf/*`, `d3-scale`, Jest + `@testing-library/react`.

**Design doc:** `docs/plans/2026-06-08-temperature-anomalies-design.md`

**Conventions:**
- Run a single test file: `npx jest <path>`; by name: `npx jest -t "name"`.
- All commits end with the trailer:
  ```
  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  ```
- Never use `Math.random` (use `random()` from `src/seedrandom.ts`) — not needed here, but noted.
- The four region files are at `src/data/regions/{gulf,caribbean,central-atlantic,coastal-africa}-temp-anomaly-region.json`.

---

## Task 1: `NamedRegion` type + region registry

**Files:**
- Modify: `src/types.ts` (add the `NamedRegion` union)
- Create: `src/utils/regions.ts`
- Create: `src/utils/regions.test.ts`

**Step 1: Add the `namedRegions` array and derived `NamedRegion` type**

In `src/types.ts`, after the `Season` / `seasonLabels` block (around line 42), add:

```ts
// The four ocean regions whose sea surface temperature can be adjusted. This array is the
// canonical iteration order; the NamedRegion type is derived from it.
export const namedRegions = ["gulf", "caribbean", "centralAtlantic", "coastalAfrica"] as const;
export type NamedRegion = typeof namedRegions[number];
```

**Step 2: Write the failing registry test**

Create `src/utils/regions.test.ts`:

```ts
import { namedRegions } from "../types";
import { isInsideRegion } from "./region";
import { temperatureAnomalyRegions, anomalyFillColor,
  TEMP_ANOMALY_MIN, TEMP_ANOMALY_MAX } from "./regions";

describe("temperatureAnomalyRegions", () => {
  it("contains exactly the four named regions", () => {
    expect([...namedRegions].sort()).toEqual(
      ["caribbean", "centralAtlantic", "coastalAfrica", "gulf"]
    );
  });

  it("each region's anchor falls inside its own polygon", () => {
    for (const key of namedRegions) {
      const { anchor, region } = temperatureAnomalyRegions[key];
      expect(isInsideRegion(anchor, region)).toBe(true);
    }
  });

  it("exposes a ±3 clamp range", () => {
    expect(TEMP_ANOMALY_MIN).toBe(-3);
    expect(TEMP_ANOMALY_MAX).toBe(3);
  });

  it("anomalyFillColor is white at 0 and shifts blue/red at the extremes", () => {
    expect(anomalyFillColor(0)).toBe("rgb(255, 255, 255)");
    expect(anomalyFillColor(-3)).toBe("rgb(34, 85, 204)");   // #2255cc
    expect(anomalyFillColor(3)).toBe("rgb(198, 40, 40)");    // #c62828
  });
});
```

**Step 3: Run it to verify it fails**

Run: `npx jest src/utils/regions.test.ts`
Expected: FAIL — cannot find module `./regions`.

**Step 4: Implement the registry**

Create `src/utils/regions.ts`:

```ts
import { FeatureCollection } from "geojson";
import { scaleLinear } from "d3-scale";
import { ICoordinates, NamedRegion } from "../types";
import { Region, createRegion } from "./region";
// Note: iterate regions via `namedRegions` from "../types"; this module no longer exports a keys array.
import gulfData from "../data/regions/gulf-temp-anomaly-region.json";
import caribbeanData from "../data/regions/caribbean-temp-anomaly-region.json";
import centralAtlanticData from "../data/regions/central-atlantic-temp-anomaly-region.json";
import coastalAfricaData from "../data/regions/coastal-africa-temp-anomaly-region.json";

export const TEMP_ANOMALY_MIN = -3;
export const TEMP_ANOMALY_MAX = 3;

export interface NamedRegionData {
  label: string;
  // Where the centered map control is placed. Hand-picked to sit inside the
  // (possibly concave) region rather than relying on a computed centroid.
  anchor: ICoordinates;
  region: Region;
}

export const temperatureAnomalyRegions: Record<NamedRegion, NamedRegionData> = {
  gulf: {
    label: "Gulf",
    anchor: { lat: 24.77, lng: -90.92 },
    region: createRegion(gulfData as FeatureCollection)
  },
  caribbean: {
    label: "Caribbean",
    anchor: { lat: 16.88, lng: -76.92 },
    region: createRegion(caribbeanData as FeatureCollection)
  },
  centralAtlantic: {
    label: "Central Atlantic",
    anchor: { lat: 15.95, lng: -59.39 },
    region: createRegion(centralAtlanticData as FeatureCollection)
  },
  coastalAfrica: {
    label: "Coastal Africa",
    anchor: { lat: 14.54, lng: -16.42 },
    region: createRegion(coastalAfricaData as FeatureCollection)
  }
};

// d3-scale's default interpolator detects hex color strings and interpolates them in
// RGB, returning an "rgb(r, g, b)" string. clamp(true) keeps values within [-3, 3].
const colorScale = scaleLinear<string>()
  .domain([TEMP_ANOMALY_MIN, 0, TEMP_ANOMALY_MAX])
  .range(["#2255cc", "#ffffff", "#c62828"])
  .clamp(true);

export function anomalyFillColor(anomaly: number): string {
  return colorScale(anomaly);
}
```

**Step 5: Run it to verify it passes**

Run: `npx jest src/utils/regions.test.ts`
Expected: PASS. If the "anchor inside polygon" test fails for a region, nudge that region's `anchor` toward the center of its `lngRange`/`latRange` until it passes. If the color test fails on exact rgb formatting, adjust the expected strings to match d3's output (then keep them as the regression baseline).

**Step 6: Commit**

```bash
git add src/types.ts src/utils/regions.ts src/utils/regions.test.ts
git commit -m "Add NamedRegion type and temperatureAnomalyRegions registry

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Model — `temperatureAnomalies` map, accessors, config seeding, reset

**Files:**
- Modify: `src/models/simulation.ts`
- Modify: `src/models/simulation.test.ts`

**Step 1: Write the failing tests**

In `src/models/simulation.test.ts`, add a new `describe` block (place it after the existing "sea surface temperature data" block):

```ts
describe("temperature anomalies", () => {
  it("defaults every region to 0", () => {
    const sim = new SimulationModel(options);
    expect(sim.temperatureAnomalyAt("gulf")).toBe(0);
    expect(sim.temperatureAnomalyAt("coastalAfrica")).toBe(0);
  });

  it("adjusts and clamps to [-3, 3]", () => {
    const sim = new SimulationModel(options);
    sim.adjustTemperatureAnomaly("gulf", 2);
    expect(sim.temperatureAnomalyAt("gulf")).toBe(2);
    sim.adjustTemperatureAnomaly("gulf", 2);   // would be 4
    expect(sim.temperatureAnomalyAt("gulf")).toBe(3);
    sim.adjustTemperatureAnomaly("gulf", -10); // would be -7
    expect(sim.temperatureAnomalyAt("gulf")).toBe(-3);
  });

  it("seeds starting values from config and clamps them", () => {
    const original = config.temperatureAnomalies;
    config.temperatureAnomalies = { gulf: 2, caribbean: 99 };
    try {
      const sim = new SimulationModel(options);
      expect(sim.temperatureAnomalyAt("gulf")).toBe(2);
      expect(sim.temperatureAnomalyAt("caribbean")).toBe(3); // clamped
      expect(sim.temperatureAnomalyAt("centralAtlantic")).toBe(0);
    } finally {
      config.temperatureAnomalies = original;
    }
  });

  it("reset() restores anomalies to the config-seeded values", () => {
    const sim = new SimulationModel(options);
    sim.adjustTemperatureAnomaly("gulf", 3);
    expect(sim.temperatureAnomalyAt("gulf")).toBe(3);
    sim.reset();
    expect(sim.temperatureAnomalyAt("gulf")).toBe(0);
  });
});
```

**Step 2: Run to verify failure**

Run: `npx jest src/models/simulation.test.ts -t "temperature anomalies"`
Expected: FAIL — `temperatureAnomalyAt` is not a function.

**Step 3: Implement model changes**

In `src/models/simulation.ts`:

(a) Extend the leaflet import (line 4) to include `latLng`:
```ts
import { LatLngExpression, CRS, LatLngBounds, latLngBounds, latLng } from "leaflet";
```

(b) Add imports near the other `../utils` / `../types` imports:
```ts
import { NamedRegion, namedRegions } from "../types";
import { isInsideRegion } from "../utils/region";
import { temperatureAnomalyRegions,
  TEMP_ANOMALY_MIN, TEMP_ANOMALY_MAX } from "../utils/regions";
```

(c) Add the observable field next to the other `@observable` declarations (e.g. after `seaSurfaceTempData`, around line 116):
```ts
// Per-region sea-surface-temperature anomalies in °C. Every region is always present
// (seeded to 0). MobX converts this Map into an ObservableMap via the @observable annotation.
@observable public temperatureAnomalies = new Map<NamedRegion, number>();
```

(d) In the constructor, immediately after `makeObservable(this);` and before the `autorun(...)`, seed the map:
```ts
this.seedTemperatureAnomalies();
```

(e) Add these methods (place them near `seaSurfaceTempAt`):
```ts
private seedTemperatureAnomalies() {
  const fromConfig = (config.temperatureAnomalies ?? {}) as Record<string, number>;
  const next = new Map<NamedRegion, number>();
  for (const key of namedRegions) {
    const raw = Number(fromConfig[key]);
    next.set(key, isFinite(raw) ? this.clampAnomaly(raw) : 0);
  }
  this.temperatureAnomalies.replace(next);
}

private clampAnomaly(value: number) {
  return Math.max(TEMP_ANOMALY_MIN, Math.min(TEMP_ANOMALY_MAX, value));
}

public temperatureAnomalyAt(key: NamedRegion): number {
  return this.temperatureAnomalies.get(key) ?? 0;
}

@action.bound public adjustTemperatureAnomaly(key: NamedRegion, delta: number) {
  this.temperatureAnomalies.set(key, this.clampAnomaly(this.temperatureAnomalyAt(key) + delta));
}
```

(f) In `reset()` (around line 495), after `this.restart();` add:
```ts
this.seedTemperatureAnomalies();
```

**Step 4: Run to verify pass**

Run: `npx jest src/models/simulation.test.ts -t "temperature anomalies"`
Expected: PASS.

**Step 5: Run the whole simulation test file (no regressions)**

Run: `npx jest src/models/simulation.test.ts`
Expected: PASS.

**Step 6: Commit**

```bash
git add src/models/simulation.ts src/models/simulation.test.ts
git commit -m "Add temperatureAnomalies map and accessors to SimulationModel

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Model — `seaSurfaceTempAt` applies anomalies

**Files:**
- Modify: `src/models/simulation.ts:577-603` (the `seaSurfaceTempAt` method)
- Modify: `src/models/simulation.test.ts`

**Step 1: Write the failing test**

Add to the "temperature anomalies" describe block. This reuses the existing real-PNG fixture pattern (see the existing "reads valid temperature" test around line 193 that uses `sep-default.png` and the `_seaSurfaceTempDataParsed` callback):

```ts
it("shifts seaSurfaceTempAt by the anomaly of the containing region", done => {
  const sim = new SimulationModel(options);
  mockFetch.mockResponseOnce(fs.readFileSync("./sea-surface-temp-img/sep-default.png"));
  sim.setSeason("fall");
  sim._seaSurfaceTempDataParsed = () => {
    const { temperatureAnomalyRegions } = require("../utils/regions");
    // The anchor is guaranteed (by Task 1's test) to sit inside the Coastal Africa region.
    const pos = temperatureAnomalyRegions.coastalAfrica.anchor;
    const base = sim.seaSurfaceTempAt(pos);
    expect(base).not.toBeNull();

    // Baseline of a point outside every region, captured before any anomaly is applied.
    const far = { lat: 45, lng: -40 };
    const farBase = sim.seaSurfaceTempAt(far);

    sim.adjustTemperatureAnomaly("coastalAfrica", 2);
    expect(sim.seaSurfaceTempAt(pos)).toBeCloseTo((base as number) + 2);
    // The far point is outside Coastal Africa, so it stays unchanged.
    expect(sim.seaSurfaceTempAt(far)).toBe(farBase);
    done();
  };
});
```

**Step 2: Run to verify failure**

Run: `npx jest src/models/simulation.test.ts -t "shifts seaSurfaceTempAt"`
Expected: FAIL — anomaly not applied (returns base unchanged).

**Step 3: Implement**

Replace the end of `seaSurfaceTempAt` (the final `return invertedTemperatureScale(color);`, line ~602) with:

```ts
// Format and whitespace are very important. That's how D3 scale returns color value.
// It needs to match invertedTemperatureScale domain.
let temp = invertedTemperatureScale(color);

// Apply per-region anomalies. Skip the point-in-polygon test for unmodified regions.
const ll = latLng(position);
for (const key of namedRegions) {
  const anomaly = this.temperatureAnomalyAt(key);
  if (anomaly !== 0 && isInsideRegion({ lat: ll.lat, lng: ll.lng },
        temperatureAnomalyRegions[key].region)) {
    temp += anomaly;
  }
}
return temp;
```

**Step 4: Run to verify pass**

Run: `npx jest src/models/simulation.test.ts -t "shifts seaSurfaceTempAt"`
Expected: PASS.

**Step 5: Full file + commit**

Run: `npx jest src/models/simulation.test.ts` → PASS.

```bash
git add src/models/simulation.ts src/models/simulation.test.ts
git commit -m "Apply region temperature anomalies in seaSurfaceTempAt

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Config default + authoring parameter doc

**Files:**
- Modify: `src/config.ts:71-156` (`DEFAULT_CONFIG`)
- Modify: `src/utils/parse-authored-params.ts:18-174` (`KNOWN_PARAMETERS`)

**Step 1: Add the config default**

In `DEFAULT_CONFIG` (after `seaSurfaceTempOpacity`, around line 137) add:

```ts
  // Initial per-region sea surface temperature anomalies in °C, keyed by region:
  // gulf, caribbean, centralAtlantic, coastalAfrica. Each value is clamped to [-3, 3].
  // URL/authoring form: temperatureAnomalies={"gulf":2,"caribbean":-1}
  temperatureAnomalies: {},
```

No parsing change is needed: `config.ts` already JSON-parses object-valued params via its `isJSON` branch.

**Step 2: Add the authoring parameter doc**

In `KNOWN_PARAMETERS` (e.g. right after the `seaSurfaceTempOpacity` entry, ~line 161) add:

```ts
  {
    name: "temperatureAnomalies",
    type: "string",
    validValues: "JSON object mapping region to a number from -3 to 3",
    description: "Initial sea surface temperature anomalies per region in °C, " +
      "e.g. {\"gulf\": 2, \"caribbean\": -1}"
  },
```

> Why `type: "string"` with a spaces-containing `validValues`: `validateUrlParams`
> only enum-checks string params whose `validValues` look like a single-word
> enumeration. A description containing spaces is intentionally **not** treated as an
> enum, so authors can pass arbitrary JSON without a false "must be one of" error.
> `applyConfigParam` in `apply-authored-state.ts` already JSON-parses object values.

**Step 3: Verify authoring validation accepts it**

Run:
```bash
npx jest src/utils/parse-authored-params.test.ts
```
Expected: PASS (existing tests unaffected). If there is no such test file, instead run a quick sanity check that `validateUrlParams('temperatureAnomalies={"gulf":2}')` returns `valid: true` by adding a temporary test, confirming, then removing it — or simply rely on Task 9's full build.

**Step 4: Commit**

```bash
git add src/config.ts src/utils/parse-authored-params.ts
git commit -m "Add temperatureAnomalies config default and authoring doc

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Interactive state save/restore

**Files:**
- Modify: `src/types/interactive-state.ts` (`ISimulationState`)
- Modify: `src/models/interactive-state.ts` (`getInteractiveState`, `setInteractiveState`)
- Modify: `src/models/interactive-state.test.ts`

**Step 1: Write the failing test**

Add to `src/models/interactive-state.test.ts`:

```ts
describe("temperatureAnomalies round-trip", () => {
  it("serializes anomalies as a plain object", () => {
    const stores = createStores();
    stores.simulation.adjustTemperatureAnomaly("gulf", 2);
    stores.simulation.adjustTemperatureAnomaly("caribbean", -1);
    const state = getInteractiveState(stores);
    expect(state.simulation.temperatureAnomalies).toMatchObject({ gulf: 2, caribbean: -1 });
  });

  it("restores anomalies into the model", () => {
    const stores = createStores();
    const state = getInteractiveState(stores);
    state.simulation.temperatureAnomalies = { gulf: 3, coastalAfrica: -2 };
    setInteractiveState(stores, state);
    expect(stores.simulation.temperatureAnomalyAt("gulf")).toBe(3);
    expect(stores.simulation.temperatureAnomalyAt("coastalAfrica")).toBe(-2);
    expect(stores.simulation.temperatureAnomalyAt("caribbean")).toBe(0);
  });

  it("restores defaults when the field is absent (legacy state)", () => {
    const stores = createStores();
    stores.simulation.adjustTemperatureAnomaly("gulf", 2);
    const state = getInteractiveState(stores);
    delete (state.simulation as any).temperatureAnomalies;
    setInteractiveState(stores, state);
    // Absent field => no override; model keeps whatever it had (here, the prior value).
    expect(stores.simulation.temperatureAnomalyAt("gulf")).toBe(2);
  });
});
```

**Step 2: Run to verify failure**

Run: `npx jest src/models/interactive-state.test.ts -t "temperatureAnomalies round-trip"`
Expected: FAIL — `state.simulation.temperatureAnomalies` is undefined.

**Step 3: Implement**

(a) `src/types/interactive-state.ts` — import `NamedRegion` (add to the existing `../types` import) and add to `ISimulationState` (after `consumedExtendedLandfallAreas?`):
```ts
  // Per-region SST anomalies in °C. Optional for backward compatibility with pre-feature saves.
  temperatureAnomalies?: Record<NamedRegion, number>;
```

(b) `src/models/interactive-state.ts` — add import:
```ts
import { namedRegions } from "../types";
```

In `getInteractiveState`, inside the `simulation: { ... }` object, add (unconditional read — iterating the observable map registers the MobX dependency, satisfying the file's reaction-safety rule):
```ts
      temperatureAnomalies: Object.fromEntries(simulation.temperatureAnomalies),
```

In `setInteractiveState`, inside the `runInAction` simulation block, add:
```ts
      if (simState.temperatureAnomalies) {
        for (const key of namedRegions) {
          const value = simState.temperatureAnomalies[key];
          if (typeof value === "number") {
            simulation.temperatureAnomalies.set(key, value);
          }
        }
      }
```

`CURRENT_VERSION` stays `1`; no migration needed (absent field => defaults).

**Step 4: Run to verify pass**

Run: `npx jest src/models/interactive-state.test.ts -t "temperatureAnomalies round-trip"`
Expected: PASS.

**Step 5: Full file + commit**

Run: `npx jest src/models/interactive-state.test.ts` → PASS.

```bash
git add src/types/interactive-state.ts src/models/interactive-state.ts src/models/interactive-state.test.ts
git commit -m "Persist temperatureAnomalies in interactive state

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: `RegionTemperatureControl` component

**Files:**
- Create: `src/components/region-temperature-control.tsx`
- Create: `src/components/region-temperature-control.scss`
- Create: `src/components/region-temperature-control.test.tsx`

**Step 1: Write the failing test**

Create `src/components/region-temperature-control.test.tsx` (mirrors the store-provider pattern in `src/components/left-panel/season-section.test.tsx`):

```ts
import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { createStores, IStores } from "../models/stores";
import { StoresContext } from "../stores-context";
import { RegionTemperatureControl } from "./region-temperature-control";

const renderControl = (stores: IStores) =>
  render(
    <StoresContext value={stores}>
      <RegionTemperatureControl regionKey="gulf" variant="panel" />
    </StoresContext>
  );

describe("RegionTemperatureControl", () => {
  let stores: IStores;
  beforeEach(() => { stores = createStores(); });

  it("shows Baseline at 0 and signed values otherwise", () => {
    renderControl(stores);
    expect(screen.getByText("Baseline")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /increase gulf temperature/i }));
    expect(stores.simulation.temperatureAnomalyAt("gulf")).toBe(1);
    expect(screen.getByText("+1°C")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /decrease gulf temperature/i }));
    fireEvent.click(screen.getByRole("button", { name: /decrease gulf temperature/i }));
    expect(screen.getByText("-1°C")).toBeInTheDocument();
  });

  it("disables the buttons at the clamp limits", () => {
    renderControl(stores);
    const inc = screen.getByRole("button", { name: /increase gulf temperature/i });
    const dec = screen.getByRole("button", { name: /decrease gulf temperature/i });

    fireEvent.click(inc); fireEvent.click(inc); fireEvent.click(inc); // +3
    expect(inc).toBeDisabled();
    expect(dec).not.toBeDisabled();

    fireEvent.click(dec); fireEvent.click(dec); fireEvent.click(dec);
    fireEvent.click(dec); fireEvent.click(dec); fireEvent.click(dec); // -3
    expect(dec).toBeDisabled();
    expect(inc).not.toBeDisabled();
  });
});
```

**Step 2: Run to verify failure**

Run: `npx jest src/components/region-temperature-control.test.tsx`
Expected: FAIL — cannot find module `./region-temperature-control`.

**Step 3: Implement the component**

Create `src/components/region-temperature-control.scss`:

```scss
.regionTemperatureControl {
  display: flex;
  align-items: center;
  gap: 8px;

  .label { flex: 1 1 auto; }

  .status {
    min-width: 64px;
    text-align: center;
    font-variant-numeric: tabular-nums;
  }

  .button {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    line-height: 0;

    .hoverIcon { display: none; }
    &:hover:not(:disabled) {
      .baseIcon { display: none; }
      .hoverIcon { display: inline; }
    }
    &:disabled { opacity: 0.4; cursor: default; }
  }

  &.map {
    background: rgba(255, 255, 255, 0.85);
    border-radius: 6px;
    padding: 4px 8px;
    white-space: nowrap;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
  }
}
```

Create `src/components/region-temperature-control.tsx`:

```tsx
import { clsx } from "clsx";
import { observer } from "mobx-react";
import React from "react";

import { useStores } from "../stores-context";
import { NamedRegion } from "../types";
import { temperatureAnomalyRegions, TEMP_ANOMALY_MIN, TEMP_ANOMALY_MAX } from "../utils/regions";

import TempDecreaseIcon from "../assets/left-panel/temp-decrease-button.svg";
import TempDecreaseHoverIcon from "../assets/left-panel/temp-decrease-button-hover.svg";
import TempIncreaseIcon from "../assets/left-panel/temp-increase-button.svg";
import TempIncreaseHoverIcon from "../assets/left-panel/temp-increase-button-hover.svg";

import css from "./region-temperature-control.scss";

interface IProps {
  regionKey: NamedRegion;
  variant: "panel" | "map";
}

function statusText(anomaly: number): string {
  if (anomaly === 0) return "Baseline";
  return `${anomaly > 0 ? "+" : ""}${anomaly}°C`;
}

export const RegionTemperatureControl = observer(function RegionTemperatureControl(
  { regionKey, variant }: IProps
) {
  const { simulation } = useStores();
  const { label } = temperatureAnomalyRegions[regionKey];
  const anomaly = simulation.temperatureAnomalyAt(regionKey);

  return (
    <div className={clsx(css.regionTemperatureControl, css[variant])} data-testid={`region-control-${regionKey}`}>
      <span className={css.label}>{label}</span>
      <button
        type="button"
        className={css.button}
        aria-label={`Decrease ${label} temperature`}
        disabled={anomaly <= TEMP_ANOMALY_MIN}
        onClick={() => simulation.adjustTemperatureAnomaly(regionKey, -1)}
      >
        <TempDecreaseIcon className={css.baseIcon} />
        <TempDecreaseHoverIcon className={css.hoverIcon} />
      </button>
      <span className={css.status}>{statusText(anomaly)}</span>
      <button
        type="button"
        className={css.button}
        aria-label={`Increase ${label} temperature`}
        disabled={anomaly >= TEMP_ANOMALY_MAX}
        onClick={() => simulation.adjustTemperatureAnomaly(regionKey, 1)}
      >
        <TempIncreaseIcon className={css.baseIcon} />
        <TempIncreaseHoverIcon className={css.hoverIcon} />
      </button>
    </div>
  );
});
```

> The order matters per the spec: **label — minus — status — plus**.

**Step 4: Run to verify pass**

Run: `npx jest src/components/region-temperature-control.test.tsx`
Expected: PASS.

> If SVG-as-component rendering fails under Jest, check `__mocks__/` / the
> `moduleNameMapper` for `\\.svg$` (existing svg-importing components already pass
> tests, so the mock exists). No new mock should be required.

**Step 5: Commit**

```bash
git add src/components/region-temperature-control.tsx src/components/region-temperature-control.scss src/components/region-temperature-control.test.tsx
git commit -m "Add reusable RegionTemperatureControl component

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Left-panel section rows

**Files:**
- Modify: `src/components/left-panel/sea-surface-temperatures-section.tsx`

**Step 1: Implement**

Replace the file body so the section renders one control per region and uses °C hint text:

```tsx
import React from "react";

import { namedRegions } from "../../types";
import { RegionTemperatureControl } from "../region-temperature-control";
import { SetupSection } from "./setup-section";

import ThermometerIcon from "../../assets/left-panel/thermometer.svg";

const hint = "Adjust sea surface temperature by up to ±3°C in each region. Changes are highlighted on the map.";

export function SeaSurfaceTemperaturesSection() {
  return (
    <SetupSection
      dataTest="sea-surface-temperatures"
      hint={hint}
      Icon={ThermometerIcon}
      setupMode="seaSurfaceTemperatures"
      title="Sea Surface Temp Anomalies"
    >
      {namedRegions.map(key => (
        <RegionTemperatureControl key={key} regionKey={key} variant="panel" />
      ))}
    </SetupSection>
  );
}
```

**Step 2: Verify the section still mounts**

Run: `npx jest src/components -t "Sea Surface" || true`
Then the broader check in Task 9. (No section-specific test exists yet; the component test in Task 6 already covers behavior.)

**Step 3: Commit**

```bash
git add src/components/left-panel/sea-surface-temperatures-section.tsx
git commit -m "Render region temperature controls in SST section

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Map rendering in `seaSurfaceTemperatures` setup mode

**Files:**
- Modify: `src/components/map-view.tsx` (imports + the block near line 243-246)

**Step 1: Add imports**

Near the existing `PolygonRegion` / `stormPlacementRegion` imports (lines 27-28) add:

```ts
import { LeafletCustomMarker } from "./leaflet-custom-marker";
import { RegionTemperatureControl } from "./region-temperature-control";
import { namedRegions } from "../types";
import { temperatureAnomalyRegions, anomalyFillColor } from "../utils/regions";
```

**Step 2: Render colored regions + centered controls**

Immediately after the existing storm-location block (lines 243-246):

```tsx
          {
            ui.setupMode === "stormLocation" &&
            <PolygonRegion region={stormPlacementRegion} />
          }
```

add:

```tsx
          {
            ui.setupMode === "seaSurfaceTemperatures" &&
            namedRegions.map(key => {
              const { region, anchor } = temperatureAnomalyRegions[key];
              return (
                <React.Fragment key={key}>
                  <PolygonRegion
                    region={region}
                    pathOptions={{
                      color: "#333333",
                      weight: 1,
                      fillColor: anomalyFillColor(sim.temperatureAnomalyAt(key)),
                      fillOpacity: 0.6
                    }}
                  />
                  <LeafletCustomMarker position={anchor}>
                    <RegionTemperatureControl regionKey={key} variant="map" />
                  </LeafletCustomMarker>
                </React.Fragment>
              );
            })
          }
```

> `map-view` already reads `sim.*`/`ui.*` reactively in `render`, so reading
> `sim.temperatureAnomalyAt(key)` here makes the polygon fill update live as the
> control changes the anomaly. Confirm `React` and `sim`/`ui` are already in scope in
> this method (they are used by the surrounding JSX).

**Step 3: Verify map-view tests still pass**

Run: `npx jest src/components/map-view.test.tsx`
Expected: PASS. If the test mounts the map without entering setup mode, the new block simply doesn't render; if it does enter `seaSurfaceTemperatures`, confirm no crash (the controls require a stores provider, which the existing map-view test already supplies).

**Step 4: Commit**

```bash
git add src/components/map-view.tsx
git commit -m "Draw colored anomaly regions and in-map controls in SST setup mode

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Full verification + manual check

**Step 1: Typecheck / unused**

Run: `npm run lint:unused`
Expected: no errors. (Catches unused imports/locals.)

**Step 2: Lint (build-level, so no-console etc. are errors)**

Run: `npm run lint:build`
Expected: clean.

**Step 3: Full test suite**

Run: `npm test`
Expected: all green. (See the memory note: if Jest hangs at startup, run `brew reinstall watchman`.)

**Step 4: Manual smoke test**

Run: `npm start`, then:
1. Open the "Sea Surface Temp Anomalies" left-panel section — four rows, each **label — minus — status — plus**; status reads "Baseline".
2. Click +/− — status updates `+X°C` / `-X°C`, buttons disable at ±3.
3. With the section open (`setupMode === "seaSurfaceTemperatures"`), the four regions render on the map, colored white→`#2255cc` (cold) / white→`#c62828` (warm) at 0.6 opacity, each with a centered control that stays in sync with the panel.
4. Append `?temperatureAnomalies={"gulf":2,"caribbean":-1}` to the URL → those regions start pre-adjusted.
5. Confirm the thermometer tool over a modified region reads the shifted temperature.

**Step 5: Final commit (if any cleanups)**

```bash
git add -A
git commit -m "Tidy up sea-surface-temperature anomalies feature

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Out of scope (follow-up task)

- Recoloring the SST PNG `ImageOverlay` (`map-view.tsx:163`) to reflect anomalies (per-pixel patch + precompute/cache). `seaSurfaceTempAt` is the clean seam to reuse later. Consider leaving a code comment near the overlay noting it is not yet anomaly-aware.

## Notes / possible deviations

- **Anchors:** if the Task 1 "anchor inside polygon" test fails for any region, adjust that region's `anchor` (the test is the guard).
- **Exact rgb strings:** d3's color output format is the regression baseline in Task 1; match the actual output if it differs from the literals.
- **`LeafletCustomMarker` styling:** the floating control uses the `.map` variant background so it's legible over the colored polygon; tune padding/opacity during the manual check.
