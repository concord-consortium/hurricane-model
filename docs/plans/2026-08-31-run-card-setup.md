# Run Card SETUP/RESULT Columns Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add SETUP and RESULT columns to the run cards; fill in SETUP with a five-row readout of the run's setup (location, category, season, SST anomalies, pressure systems). RESULT is heading-only for now.

**Architecture:** A new presentational `RunSetupSummary` component renders the readout from a plain `IRunSetup` object. `RunCard` builds that object from the live `SimulationModel` when the run is selected (the stored record is stale then) or from `run.simulation` otherwise. Pressure info always comes from the *setup* systems (`pressureSystemsSetup`), never the run-mutated `pressureSystems`. Readout helpers live in new/extended utils (`utils/pressure.ts`, `formatLatLng`, region `shortLabel`s), ported from the Storm Explorer prototype (PR #151).

**Tech Stack:** React function components + `mobx-react` `observer`, SCSS modules, Jest + Testing Library, `geolocation-utils` (already a dependency) for moved-direction math.

**Design doc:** `docs/plans/2026-08-31-run-card-setup-design.md`

Conventions (from CLAUDE.md and memory): minimal comments — only non-obvious "why"; no `!important` in SCSS; run single tests with `npx jest <path>`.

---

### Task 1: `formatLatLng` util

**Files:**
- Modify: `src/utils/lat-long.ts`
- Create: `src/utils/lat-long.test.ts`

**Step 1: Write the failing test**

```ts
import { formatLatLng, getDirectionLetter } from "./lat-long";

describe("getDirectionLetter", () => {
  it("returns hemisphere letters", () => {
    expect(getDirectionLetter(10, "lat")).toBe("N");
    expect(getDirectionLetter(-10, "lat")).toBe("S");
    expect(getDirectionLetter(10, "lng")).toBe("E");
    expect(getDirectionLetter(-10, "lng")).toBe("W");
  });
});

describe("formatLatLng", () => {
  it("formats with two decimals and hemisphere letters", () => {
    expect(formatLatLng(10.5, -20)).toBe("10.50°N, 20.00°W");
    expect(formatLatLng(-3.456, 12.345)).toBe("3.46°S, 12.35°E");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/utils/lat-long.test.ts`
Expected: FAIL — `formatLatLng` is not exported.

**Step 3: Write minimal implementation**

Append to `src/utils/lat-long.ts`:

```ts
// Canonical lat/lng label, e.g. "10.50°N, 20.00°W" — two decimals plus the hemisphere letter.
export function formatLatLng(lat: number, lng: number): string {
  const latL = getDirectionLetter(lat, "lat");
  const lngL = getDirectionLetter(lng, "lng");
  return `${Math.abs(lat).toFixed(2)}°${latL}, ${Math.abs(lng).toFixed(2)}°${lngL}`;
}
```

**Step 4: Run test to verify it passes**

Run: `npx jest src/utils/lat-long.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/utils/lat-long.ts src/utils/lat-long.test.ts
git commit -m "Add formatLatLng util for run card readouts."
```

---

### Task 2: Region `shortLabel`s

**Files:**
- Modify: `src/utils/regions.ts` (the `NamedRegionData` interface and `temperatureAnomalyRegions`)
- Modify: `src/utils/regions.test.ts`

**Step 1: Write the failing test**

Append to the `describe("temperatureAnomalyRegions", ...)` block in `src/utils/regions.test.ts`:

```ts
  it("exposes compact labels for the run cards", () => {
    expect(temperatureAnomalyRegions.gulf.shortLabel).toBe("Gulf");
    expect(temperatureAnomalyRegions.caribbean.shortLabel).toBe("Caribbean");
    expect(temperatureAnomalyRegions.centralAtlantic.shortLabel).toBe("C. Atlantic");
    expect(temperatureAnomalyRegions.coastalAfrica.shortLabel).toBe("C. Africa");
  });
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/utils/regions.test.ts`
Expected: FAIL — `shortLabel` is undefined.

**Step 3: Write minimal implementation**

In `src/utils/regions.ts`, add to `NamedRegionData`:

```ts
  shortLabel: string; // compact form used on the run cards (the section control uses label)
```

and add a `shortLabel` to each region entry: `"Gulf"`, `"Caribbean"`, `"C. Atlantic"`, `"C. Africa"`.

**Step 4: Run test to verify it passes**

Run: `npx jest src/utils/regions.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/utils/regions.ts src/utils/regions.test.ts
git commit -m "Add compact region labels for run cards."
```

---

### Task 3: `strengthToMb` in a new `utils/pressure.ts` (single source for mb mapping)

The mb mapping currently lives privately in `src/components/pressure-system-icon.tsx` (`getPressureLabel`). Move it to a util both the map icon and the run cards share. `pressure-system-icon.test.tsx` imports `minStrength`/`maxStrength`/`mbLabelRange` from the icon module, so keep re-exports there.

**Files:**
- Create: `src/utils/pressure.ts`
- Create: `src/utils/pressure.test.ts`
- Modify: `src/components/pressure-system-icon.tsx:15-17` (constants) and `:40-47` (`getPressureLabel`)

**Step 1: Write the failing test**

Create `src/utils/pressure.test.ts`:

```ts
import { maxStrength, minStrength, strengthToMb } from "./pressure";

describe("strengthToMb", () => {
  it("maps high-pressure strength to 1015..1028 mb", () => {
    expect(strengthToMb("high", minStrength)).toBe(1015);
    expect(strengthToMb("high", maxStrength)).toBe(1028);
    expect(strengthToMb("high", 19.5)).toBe(1028);
    expect(strengthToMb("high", 13.6)).toBe(1023);
  });

  it("maps low-pressure strength to 1010..997 mb (stronger = lower)", () => {
    expect(strengthToMb("low", minStrength)).toBe(1010);
    expect(strengthToMb("low", maxStrength)).toBe(997);
    expect(strengthToMb("low", 6)).toBe(1008);
    expect(strengthToMb("low", 7)).toBe(1007);
  });
});
```

(The 19.5/13.6/6/7 cases are the default Atlantic systems — they must read 1028/1023/1008/1007 as in the mockup.)

**Step 2: Run test to verify it fails**

Run: `npx jest src/utils/pressure.test.ts`
Expected: FAIL — module not found.

**Step 3: Write minimal implementation**

Create `src/utils/pressure.ts`:

```ts
import { PressureSystemType } from "../models/pressure-system";

// Strength (m/s) -> barometric-pressure label (mb): the user-facing unit shown on the map markers.
// High pressure reads 1015..1028 mb (stronger = higher); low reads 1010..997 mb (stronger = lower).
// Single source of truth for this mapping — pressure-system-icon.tsx re-exports the constants.
export const minStrength = 3;
export const maxStrength = 20;
export const mbLabelRange = 13;

export function strengthToMb(type: PressureSystemType, strength: number): number {
  const norm = (strength - minStrength) / (maxStrength - minStrength);
  return type === "high"
    ? Math.round(1015 + norm * mbLabelRange)
    : Math.round(1010 - norm * mbLabelRange);
}
```

In `src/components/pressure-system-icon.tsx`, delete the three constant declarations (lines 15–17) and add:

```ts
import { maxStrength, minStrength, strengthToMb } from "../utils/pressure";

export { maxStrength, mbLabelRange, minStrength } from "../utils/pressure";
```

and replace `getPressureLabel` with:

```ts
const getPressureLabel = (model: PressureSystem) => strengthToMb(model.type, model.strength) + "mb";
```

**Step 4: Run tests to verify they pass**

Run: `npx jest src/utils/pressure.test.ts src/components/pressure-system-icon.test.tsx`
Expected: PASS (both files — icon behavior unchanged).

**Step 5: Commit**

```bash
git add src/utils/pressure.ts src/utils/pressure.test.ts src/components/pressure-system-icon.tsx
git commit -m "Extract strengthToMb into a shared pressure util."
```

---

### Task 4: `pressureDeltas` + `pressureReport`

Compares a run's *setup* systems to their per-start-location defaults and produces the card lines ("H1: Default, 1028 mb" / "H2: Moved SW, 1023 mb"). Labels come from each system's own `label` field (matches the "H1"/"L2" badges on the map), falling back to per-type numbering when absent.

**Files:**
- Modify: `src/utils/pressure.ts`
- Modify: `src/utils/pressure.test.ts`

**Step 1: Write the failing tests**

Append to `src/utils/pressure.test.ts`:

```ts
import { selectPressureSystems } from "../config";
import { IPressureSystemState } from "../types/interactive-state";
import { pressureReport } from "./pressure";

const defaultSetup = (): IPressureSystemState[] =>
  selectPressureSystems("atlantic").map(ps => ({ ...ps, center: { ...ps.center } }));

describe("pressureReport", () => {
  it("reports every default Atlantic system as Default with its mb value", () => {
    const report = pressureReport("atlantic", defaultSetup());
    expect(report.map(r => `${r.label}: ${r.position}, ${r.mb}`)).toEqual([
      "H1: Default, 1028 mb",
      "H2: Default, 1023 mb",
      "L1: Default, 1008 mb",
      "L2: Default, 1007 mb"
    ]);
    expect(report.map(r => r.type)).toEqual(["high", "high", "low", "low"]);
  });

  it("reports a moved system with its compass direction", () => {
    const systems = defaultSetup();
    systems[1].center = { lat: systems[1].center.lat - 2, lng: systems[1].center.lng - 2 };
    expect(pressureReport("atlantic", systems)[1].position).toBe("Moved SW");
  });

  it("reports a strength change through the mb value", () => {
    const systems = defaultSetup();
    systems[0].strength = minStrength;
    expect(pressureReport("atlantic", systems)[0].mb).toBe("1015 mb");
  });

  it("numbers unlabeled systems per type", () => {
    const systems = defaultSetup().map(ps => ({ ...ps, label: undefined }));
    expect(pressureReport("atlantic", systems).map(r => r.label)).toEqual(["H1", "H2", "L1", "L2"]);
  });

  it("baselines a custom-coordinate start against the Atlantic defaults", () => {
    const report = pressureReport({ lat: 10, lng: -20 }, defaultSetup());
    expect(report.every(r => r.position === "Default")).toBe(true);
  });
});
```

Merge the imports at the top of the file into one statement (`maxStrength, minStrength, pressureReport, strengthToMb` from `./pressure`).

**Step 2: Run test to verify it fails**

Run: `npx jest src/utils/pressure.test.ts`
Expected: FAIL — `pressureReport` is not exported.

**Step 3: Write minimal implementation**

Append to `src/utils/pressure.ts` (add the new imports to the top of the file):

```ts
import { distanceTo, headingTo } from "geolocation-utils";

import { selectPressureSystems } from "../config";
import { isStartLocationName, StartLocation } from "../types";
import { IPressureSystemState } from "../types/interactive-state";
```

```ts
// Numbers each system within its type (H1, H2, L1, L2…) — fallback when a system has no label.
export function perTypeNumbers(systems: { type: PressureSystemType }[]): number[] {
  const counts: Record<PressureSystemType, number> = { high: 0, low: 0 };
  return systems.map(s => (counts[s.type] += 1));
}

// 16-point compass label for a heading in degrees (0 = N, clockwise), e.g. "SSW".
const COMPASS = [
  "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
  "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"
] as const;
export type Compass = typeof COMPASS[number];
function toCompass(deg: number): Compass {
  const i = Math.round((((deg % 360) + 360) % 360) / 22.5) % 16;
  return COMPASS[i];
}

// Report even the tiniest drag: an untouched system sits exactly at its default (distance 0), so
// this epsilon only absorbs floating-point noise.
const MOVED_THRESHOLD_M = 1;

export interface IPressureReport {
  type: PressureSystemType;
  label: string;    // e.g. "H1" (colored per type on the card)
  position: string; // "Default" (unmoved) or "Moved <dir>"
  mb: string;       // e.g. "1028 mb"
}

// Run-card readout for a run's setup pressure systems: one entry per system, compared to its
// per-start-location default (matched by slot order). The mb value is always shown, so an
// unchanged system reads "H1: Default, 1028 mb". Defaults exist only for named start locations;
// a custom-coordinate start is baselined against the Atlantic defaults — a known approximation.
export function pressureReport(startLocation: StartLocation, systems: IPressureSystemState[]): IPressureReport[] {
  const defaults = selectPressureSystems(isStartLocationName(startLocation) ? startLocation : "atlantic");
  const nums = perTypeNumbers(systems);
  return systems.map((ps, i) => {
    const def = defaults[i];
    let position = "Default";
    if (def) {
      const from = { lat: def.center.lat, lon: def.center.lng };
      const to = { lat: ps.center.lat, lon: ps.center.lng };
      if (distanceTo(from, to) > MOVED_THRESHOLD_M) {
        position = `Moved ${toCompass(headingTo(from, to))}`;
      }
    }
    return {
      type: ps.type,
      label: `${ps.type === "high" ? "H" : "L"}${ps.label || nums[i]}`,
      position,
      // Non-breaking space so the value and its "mb" unit never split across a wrap.
      mb: `${strengthToMb(ps.type, ps.strength)} mb`
    };
  });
}
```

Note: `selectPressureSystems` returns `as const` config objects; if TypeScript complains about `readonly` mismatches in the test's `defaultSetup`, spread into fresh objects as shown (already handled).

**Step 4: Run test to verify it passes**

Run: `npx jest src/utils/pressure.test.ts`
Expected: PASS (6 tests).

**Step 5: Commit**

```bash
git add src/utils/pressure.ts src/utils/pressure.test.ts
git commit -m "Add pressureReport for run card setup readouts."
```

---

### Task 5: `RunSetupSummary` component

Presentational component: five icon rows in the setup-section order from `left-panel.tsx` (location, category, season, SST anomalies, pressure systems). No heading — the card renders the SETUP/RESULT column headings (Task 6).

**Files:**
- Create: `src/components/left-panel/run-setup-summary.tsx`
- Create: `src/components/left-panel/run-setup-summary.scss`
- Create: `src/components/left-panel/run-setup-summary.test.tsx`

**Step 1: Write the failing test**

Create `src/components/left-panel/run-setup-summary.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import React from "react";

import { selectPressureSystems } from "../../config";
import { IRunSetup, RunSetupSummary } from "./run-setup-summary";

const baseSetup = (): IRunSetup => ({
  season: "fall",
  startLocation: { lat: 10.5, lng: -20 },
  startingCategory: 3,
  pressureSystems: selectPressureSystems("atlantic").map(ps => ({ ...ps, center: { ...ps.center } })),
  temperatureAnomalies: {}
});

describe("RunSetupSummary", () => {
  it("shows the start location as lat/lng", () => {
    render(<RunSetupSummary setup={baseSetup()} />);
    expect(screen.getByTestId("setup-location")).toHaveTextContent("10.50°N, 20.00°W");
  });

  it("resolves a named start location to its coordinates", () => {
    render(<RunSetupSummary setup={{ ...baseSetup(), startLocation: "atlantic" }} />);
    expect(screen.getByTestId("setup-location")).toHaveTextContent("°N");
  });

  it("shows the starting category", () => {
    render(<RunSetupSummary setup={baseSetup()} />);
    expect(screen.getByTestId("setup-category")).toHaveTextContent("Cat 3");
  });

  it("shows TS for category 0 and when the category is missing", () => {
    const { rerender } = render(<RunSetupSummary setup={{ ...baseSetup(), startingCategory: 0 }} />);
    expect(screen.getByTestId("setup-category")).toHaveTextContent("TS");
    rerender(<RunSetupSummary setup={{ ...baseSetup(), startingCategory: undefined }} />);
    expect(screen.getByTestId("setup-category")).toHaveTextContent("TS");
  });

  it("shows the season label", () => {
    render(<RunSetupSummary setup={{ ...baseSetup(), season: "earlyFall" }} />);
    expect(screen.getByTestId("setup-season")).toHaveTextContent("Early Fall");
  });

  it("shows Baseline when no SST anomalies are set", () => {
    render(<RunSetupSummary setup={baseSetup()} />);
    expect(screen.getByTestId("setup-anomalies")).toHaveTextContent("Baseline");
  });

  it("lists each nonzero SST anomaly with its region and signed value", () => {
    render(<RunSetupSummary setup={{ ...baseSetup(), temperatureAnomalies: { caribbean: 1, centralAtlantic: -2 } }} />);
    const anomalies = screen.getByTestId("setup-anomalies");
    expect(anomalies).toHaveTextContent("Caribbean +1 °C");
    expect(anomalies).toHaveTextContent("C. Atlantic −2 °C");
    expect(anomalies).not.toHaveTextContent("Baseline");
    expect(anomalies).not.toHaveTextContent("Gulf");
  });

  it("lists each pressure system with its label, position, and mb value", () => {
    render(<RunSetupSummary setup={baseSetup()} />);
    const pressure = screen.getByTestId("setup-pressure-systems");
    expect(pressure).toHaveTextContent("H1: Default, 1028 mb");
    expect(pressure).toHaveTextContent("L2: Default, 1007 mb");
  });
});
```

Note: `toHaveTextContent` normalizes whitespace, so the ` ` in "1028 mb" and "+1 °C" matches a regular space in the expectation.

**Step 2: Run test to verify it fails**

Run: `npx jest src/components/left-panel/run-setup-summary.test.tsx`
Expected: FAIL — module not found.

**Step 3: Write the implementation**

Create `src/components/left-panel/run-setup-summary.tsx`:

```tsx
import { clsx } from "clsx";
import React from "react";

import { clampCategory } from "../../config";
import { resolveStartLocation } from "../../models/simulation";
import { NamedRegion, namedRegions, Season, seasonLabels, StartLocation } from "../../types";
import { IPressureSystemState } from "../../types/interactive-state";
import { formatLatLng } from "../../utils/lat-long";
import { pressureReport } from "../../utils/pressure";
import { temperatureAnomalyRegions } from "../../utils/regions";

import HurricaneIcon from "../../assets/left-panel/hurricane.svg";
import PressureSystemIcon from "../../assets/left-panel/pressure-system.svg";
import SeasonIcon from "../../assets/left-panel/season.svg";
import StormLocationIcon from "../../assets/left-panel/storm-location.svg";
import ThermometerIcon from "../../assets/left-panel/thermometer.svg";

import categoryCss from "../hurricane-category.scss";
import css from "./run-setup-summary.scss";

// The subset of a run's setup that a card summarizes.
export interface IRunSetup {
  season: Season;
  startLocation: StartLocation;
  startingCategory?: number;
  pressureSystems: IPressureSystemState[];
  temperatureAnomalies?: Partial<Record<NamedRegion, number>>;
}

function anomalyText(value: number): string {
  return `${value > 0 ? "+" : "−"}${Math.abs(value)} °C`;
}

interface IProps {
  setup: IRunSetup;
}

export function RunSetupSummary({ setup }: IProps) {
  const start = resolveStartLocation(setup.startLocation);
  const category = clampCategory(setup.startingCategory ?? 0);
  const anomalies = namedRegions
    .map(region => ({ label: temperatureAnomalyRegions[region].shortLabel, value: setup.temperatureAnomalies?.[region] ?? 0 }))
    .filter(a => a.value !== 0);
  const report = pressureReport(setup.startLocation, setup.pressureSystems);

  return (
    <div className={css.runSetupSummary} data-test="run-setup-summary">
      <div className={css.row} data-test="setup-location">
        <StormLocationIcon aria-hidden={true} className={css.icon} />
        <span>{formatLatLng(start.lat, start.lng)}</span>
      </div>
      <div className={css.row} data-test="setup-category">
        <HurricaneIcon aria-hidden={true} className={clsx(css.icon, categoryCss["category" + category])} />
        <span>{category === 0 ? "TS" : `Cat ${category}`}</span>
      </div>
      <div className={css.row} data-test="setup-season">
        <SeasonIcon aria-hidden={true} className={css.icon} />
        <span>{seasonLabels[setup.season] ?? setup.season}</span>
      </div>
      <div className={css.row} data-test="setup-anomalies">
        <ThermometerIcon aria-hidden={true} className={css.icon} />
        <span className={css.stackedLines}>
          {anomalies.length === 0 && <span>Baseline</span>}
          {anomalies.map(a => (
            <span key={a.label} className={a.value > 0 ? css.warm : css.cool}>
              {a.label} {anomalyText(a.value)}
            </span>
          ))}
        </span>
      </div>
      <div className={css.row} data-test="setup-pressure-systems">
        <PressureSystemIcon aria-hidden={true} className={css.icon} />
        <span className={css.stackedLines}>
          {report.map(r => (
            <span key={r.label} className={css.pressureSystem}>
              <span className={r.type === "high" ? css.high : css.low}>{r.label}:</span>
              <span className={css.pressureDetail}>
                <span>{r.position},</span>
                <span>{r.mb}</span>
              </span>
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}
```

Create `src/components/left-panel/run-setup-summary.scss`:

```scss
@use "../common.scss" as *;

.runSetupSummary {
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 14px;
  color: $charcoal;

  .row {
    display: flex;
    align-items: flex-start;
    gap: 7px;
    min-height: 16px;
  }

  .icon {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
  }

  // SST anomaly and pressure system entries stack as left-aligned lines.
  .stackedLines {
    display: inline-flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    white-space: nowrap;
  }

  .warm { color: $warmColor; }
  .cool { color: $coldColor; }

  // Label inline with a stacked, left-aligned position / mb, so "Default" and "1028 mb"
  // line up under each other.
  .pressureSystem {
    display: flex;
    align-items: baseline;
    gap: 4px;
  }

  .pressureDetail {
    display: inline-flex;
    flex-direction: column;
    align-items: flex-start;
  }

  // The map markers' blue/red, darkened to meet WCAG AA (normal text) on the card fills.
  .high { color: #2a69d6; }
  .low { color: #c93f22; }
}
```

**Step 4: Run test to verify it passes**

Run: `npx jest src/components/left-panel/run-setup-summary.test.tsx`
Expected: PASS (8 tests). If an SVG import renders oddly under Jest, the existing `__mocks__` asset mocks already cover `.svg` — no new mock needed.

**Step 5: Check the category icon classes**

`hurricane-category.scss` uses doubled selectors (`.category0.category0`) for specificity — the class name lookup `categoryCss["category" + category]` matches keys `category0`..`category5`, same as `storm-category-section.tsx` does. Nothing to change; just verify no typo by the passing test run.

**Step 6: Commit**

```bash
git add src/components/left-panel/run-setup-summary.tsx src/components/left-panel/run-setup-summary.scss src/components/left-panel/run-setup-summary.test.tsx
git commit -m "Add RunSetupSummary readout component."
```

---

### Task 6: Wire SETUP/RESULT columns into `RunCard`

**Files:**
- Modify: `src/components/left-panel/run-card.tsx`
- Modify: `src/components/left-panel/run-card.scss`
- Modify: `src/components/left-panel/run-card.test.tsx`

**Step 1: Write the failing tests**

Append to the top-level `describe("RunCard", ...)` in `src/components/left-panel/run-card.test.tsx`:

```tsx
  describe("setup and result columns", () => {
    it("renders SETUP and RESULT column headings", () => {
      renderPanels(stores);
      expect(screen.getByText("Setup")).toBeInTheDocument();
      expect(screen.getByText("Result")).toBeInTheDocument();
    });

    it("summarizes the selected run from the live simulation", () => {
      stores.simulation.season = "winter";
      renderPanels(stores);
      expect(screen.getByTestId("setup-season")).toHaveTextContent("Winter");
    });

    it("updates the selected run's summary as the setup is edited", () => {
      renderPanels(stores);
      expect(screen.getByTestId("setup-anomalies")).toHaveTextContent("Baseline");
      act(() => runInAction(() => { stores.simulation.setTemperatureAnomaly("caribbean", 2); }));
      expect(screen.getByTestId("setup-anomalies")).toHaveTextContent("Caribbean +2 °C");
    });

    it("summarizes an unselected run from its stored record", () => {
      stores.simulation.season = "winter";
      completeCurrentRun(stores);
      stores.runs.addRun();
      renderPanels(stores);
      // First card (unselected) keeps winter; second (selected) shows the new run's default season.
      const seasons = screen.getAllByTestId("setup-season");
      expect(seasons[0]).toHaveTextContent("Winter");
      expect(seasons[1]).not.toHaveTextContent("Winter");
    });

    it("summarizes pressure systems from the setup, not the run's mutated systems", () => {
      completeCurrentRun(stores);
      stores.runs.addRun();
      // Corrupt the stored run's live systems; the setup systems stay at their defaults.
      const stored = stores.runs.runs[0].simulation;
      stored.pressureSystems = stored.pressureSystems.map(ps => ({ ...ps, strength: 3 }));
      renderPanels(stores);
      expect(screen.getAllByTestId("setup-pressure-systems")[0]).toHaveTextContent("H1: Default, 1028 mb");
    });
  });
```

Check the default season first: `defaultSimulationState()` derives from config — if the new run's default season IS "winter" this test is tautological; use a non-default season (e.g. `"spring"`) for the first run instead. (Default is `config.season`; inspect `src/config.ts` — it is `"fall"`, so "winter" is safe.)

**Step 2: Run test to verify it fails**

Run: `npx jest src/components/left-panel/run-card.test.tsx`
Expected: FAIL — no "Setup"/"Result" text, no `setup-season` test ids.

**Step 3: Implement**

In `src/components/left-panel/run-card.tsx`:

Add imports:

```tsx
import { namedRegions } from "../../types";
import { IRunSetup, RunSetupSummary } from "./run-setup-summary";
```

Inside the component, after `runNumber`, build the setup (the selected run's stored record is stale — the live simulation is its source of truth, matching `runs.isRunComplete`):

```tsx
const setup: IRunSetup = selected
  ? {
      season: simulation.season,
      startLocation: simulation.startLocation,
      startingCategory: simulation.hurricane.startingCategory,
      pressureSystems: simulation.pressureSystemsSetup.map(ps => ps.serialize()),
      temperatureAnomalies: Object.fromEntries(namedRegions.map(r => [r, simulation.temperatureAnomalyAt(r)]))
    }
  : {
      season: run.simulation.season,
      startLocation: run.simulation.startLocation,
      startingCategory: run.simulation.hurricane.startingCategory,
      pressureSystems: run.simulation.pressureSystemsSetup ?? run.simulation.pressureSystems,
      temperatureAnomalies: run.simulation.temperatureAnomalies
    };
```

After the `runCardHeader` div (inside `runCard`), add the columns:

```tsx
<div className={css.runCardBody}>
  <div className={css.column}>
    <div className={css.columnHeading}>Setup</div>
    <RunSetupSummary setup={setup} />
  </div>
  <div className={css.column}>
    <div className={css.columnHeading}>Result</div>
  </div>
</div>
```

In `src/components/left-panel/run-card.scss`, inside `.runCard` (after `.runCardHeader`):

```scss
    .runCardBody {
      display: flex;
      gap: 10px;
      margin-top: 7px;

      .column {
        flex: 1 1 0;
        min-width: 0;
      }

      .columnHeading {
        font-size: 14px;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        margin-bottom: 5px;
      }
    }
```

**Step 4: Run tests to verify they pass**

Run: `npx jest src/components/left-panel/run-card.test.tsx`
Expected: PASS — the 5 new tests plus all existing ones (the existing aria-label/status tests must not break; the columns are additive).

**Step 5: Visual check**

Run: `npm start` and open the app; confirm cards show SETUP rows matching the mockup order and an empty RESULT column, on both the selected and an unselected card. (Add a run, tweak SST/pressure/category, verify the selected card updates live.)

**Step 6: Commit**

```bash
git add src/components/left-panel/run-card.tsx src/components/left-panel/run-card.scss src/components/left-panel/run-card.test.tsx
git commit -m "Add SETUP and RESULT columns to run cards."
```

---

### Task 7: Full verification

**Step 1: Run the whole Jest suite**

Run: `npm test`
Expected: all suites pass.

**Step 2: Lint**

Run: `npm run lint` and `npm run lint:unused`
Expected: no new errors (fix any — e.g. import ordering, unused vars).

**Step 3: Commit any fixes**

```bash
git add -A && git commit -m "Lint fixes for run card setup column."
```

(Skip if nothing changed.)
