# Compare Runs Table Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a draggable, collapsible "Compare Runs" table over the map that shows every run's setup and result side by side, sharing its cell rendering with the left-panel run cards.

**Architecture:** Per-field value components plus row descriptors (`src/components/run-summary/`) become the single source of run-summary rendering; the run cards and the new table both iterate the descriptors. Selection reuses one `selectRun` helper (cards, map tracks, table). Table UI state (expanded, position) is transient on `UIModel`. Design: [2026-09-10-compare-runs-table-design.md](2026-09-10-compare-runs-table-design.md).

**Tech Stack:** React 18 function components with `mobx-react` `observer`, MobX 6 class stores with decorators, SCSS modules, Jest + React Testing Library (`data-test` is the test-id attribute), ESLint.

---

## Conventions for every task

- Run a single test file with `npx jest <path>`; the full suite with `npm test`; lint with `npm run lint`.
- SCSS modules resolve to `identity-obj-proxy` in Jest (class `foo` → string `"foo"`), except `common.scss`, which maps to `__mocks__/common-scss-mock.js` — any new `:export` value read from JS must be added to that mock.
- SVG imports are React components (`__mocks__/svgMock.js` in Jest).
- Never use `Math.random`, `!important`, or comments that restate the code. Only comment a non-obvious *why*.
- Commit with `git add <files> && git commit -m "..."` in a single Bash call, chained with nothing else. Commit messages end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

---

### Task 1: `RunsModel.runStatus`

Moves the status-message logic out of `RunCard` so the table can share it.

**Files:**
- Modify: `src/models/runs.ts`
- Modify: `src/models/runs.test.ts`
- Modify: `src/components/left-panel/run-card/run-card.tsx:58-61`

**Step 1: Write the failing tests**

Append inside `describe("RunsModel", …)` in `src/models/runs.test.ts`:

```ts
  describe("runStatus", () => {
    it("is 'Not run yet' for a fresh run", () => {
      expect(stores.runs.runStatus(stores.runs.runs[0])).toBe("Not run yet");
    });

    it("follows the live simulation for the selected run", () => {
      const { runs, simulation } = stores;
      runInAction(() => {
        simulation.simulationStarted = true;
        simulation.simulationRunning = true;
      });
      expect(runs.runStatus(runs.runs[0])).toBe("Running...");
      runInAction(() => { simulation.simulationRunning = false; });
      expect(runs.runStatus(runs.runs[0])).toBe("Paused");
    });

    it("is empty once the run is complete", () => {
      completeCurrentRun(stores);
      expect(stores.runs.runStatus(stores.runs.runs[0])).toBe("");
    });

    it("is 'Not run yet' for an unselected, incomplete run", () => {
      const { runs } = stores;
      completeCurrentRun(stores);
      runs.addRun();
      runs.selectRun(runs.runs[0].id);
      expect(runs.runStatus(runs.runs[1])).toBe("Not run yet");
    });
  });
```

**Step 2: Run to verify failure**

Run: `npx jest src/models/runs.test.ts -t runStatus`
Expected: FAIL — `runStatus is not a function`.

**Step 3: Implement**

In `src/models/runs.ts`, after `runLetter`:

```ts
  public runStatus(run: IRunState): RunStatus {
    if (this.isRunComplete(run)) return "";
    if (!this.isSelected(run.id)) return "Not run yet";
    if (this.simulation.simulationRunning) return "Running...";
    if (this.simulation.simulationStarted) return "Paused";
    return "Not run yet";
  }
```

Add above the class:

```ts
export type RunStatus = "" | "Not run yet" | "Running..." | "Paused";
```

**Step 4: Run to verify pass**

Run: `npx jest src/models/runs.test.ts`
Expected: PASS.

**Step 5: Use it in `RunCard`**

Replace lines 58-61 of `run-card.tsx`:

```ts
  const status = runs.runStatus(run);
  const statusMessage = status === "Not run yet" ? `${status} - editable` : status;
```

`complete` is still used for the `incomplete` class; keep it.

**Step 6: Run card tests**

Run: `npx jest src/components/left-panel/run-card/run-card.test.tsx`
Expected: PASS (status-message tests unchanged).

**Step 7: Commit**

```bash
git add src/models/runs.ts src/models/runs.test.ts src/components/left-panel/run-card/run-card.tsx && git commit -m "Move run status message into RunsModel.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Shared `selectRun` helper

**Files:**
- Create: `src/utils/select-run.ts`
- Create: `src/utils/select-run.test.ts`
- Modify: `src/components/left-panel/run-card/run-card.tsx:27-33`
- Modify: `src/components/run-tracks.tsx:43-48`

**Step 1: Write the failing tests**

`src/utils/select-run.test.ts`:

```ts
import { runInAction } from "mobx";

import { log } from "../log";
import { createStores, IStores } from "../models/stores";
import { selectRun } from "./select-run";

jest.mock("../log", () => ({
  log: jest.fn()
}));
const mockLog = log as jest.Mock;

const completeCurrentRun = (stores: IStores) => {
  runInAction(() => {
    stores.simulation.simulationStarted = true;
    stores.simulation.simulationFinished = true;
  });
};

describe("selectRun", () => {
  let stores: IStores;

  beforeEach(() => {
    stores = createStores();
    mockLog.mockClear();
    completeCurrentRun(stores);
    stores.runs.addRun();
  });

  it("selects the run, resets the map view, and logs where the selection came from", () => {
    const { runs, ui } = stores;
    ui.setZoomedInView([[30, -85], [35, -80]], 3);
    expect(runs.selectedRunId).toBe(runs.runs[1].id);

    selectRun(stores, runs.runs[0], "table");

    expect(runs.selectedRunId).toBe(runs.runs[0].id);
    expect(ui.zoomedInView).toBe(false);
    expect(mockLog).toHaveBeenCalledWith("RunSelected", { runId: runs.runs[0].id, via: "table" });
  });

  it("does nothing for the already selected run", () => {
    const { runs } = stores;
    selectRun(stores, runs.runs[1], "panel");
    expect(mockLog).not.toHaveBeenCalled();
  });

  it("restarts an in-progress simulation before switching", () => {
    const { runs, simulation } = stores;
    runInAction(() => {
      simulation.simulationStarted = true;
      simulation.time = 50;
    });
    expect(runs.runs[1].simulation.simulationStarted).toBe(true);

    selectRun(stores, runs.runs[0], "map");

    // The abandoned run is stored as setup only.
    expect(runs.runs[1].simulation.simulationStarted).toBe(false);
    expect(runs.runs[1].simulation.time).toBe(0);
  });

  it("leaves an in-progress simulation alone in read-only mode", () => {
    const { runs, simulation, ui } = stores;
    runInAction(() => {
      simulation.simulationStarted = true;
      simulation.time = 50;
    });
    ui.setMode("report");

    selectRun(stores, runs.runs[0], "map");

    expect(runs.runs[1].simulation.simulationStarted).toBe(true);
    expect(runs.runs[1].simulation.time).toBe(50);
  });
});
```

**Step 2: Run to verify failure**

Run: `npx jest src/utils/select-run.test.ts`
Expected: FAIL — cannot find module `./select-run`.

**Step 3: Implement**

`src/utils/select-run.ts`:

```ts
import { log } from "../log";
import { IStores } from "../models/stores";
import { IRunState } from "../types/interactive-state";

export type RunSelectionSource = "panel" | "map" | "table";

export function selectRun({ runs, simulation, ui }: IStores, run: IRunState, via: RunSelectionSource) {
  if (runs.isSelected(run.id)) return;
  if (simulation.inProgress && !ui.isReadOnly) simulation.restart();
  runs.selectRun(run.id);
  ui.setNorthAtlanticView();
  log("RunSelected", { runId: run.id, via });
}
```

**Step 4: Run to verify pass**

Run: `npx jest src/utils/select-run.test.ts`
Expected: PASS.

**Step 5: Use it in `RunCard` and `RunTracks`**

`run-card.tsx`: replace `handleSelect` (lines 27-33) with

```ts
  const handleSelect = () => selectRun(stores, run, "panel");
```

Change `const { runs, simulation, ui } = useStores();` to

```ts
  const stores = useStores();
  const { runs, simulation, ui } = stores;
```

and add `import { selectRun } from "../../../utils/select-run";`. `log` is still used by reset/delete; keep the import.

`run-tracks.tsx`: delete the local `selectRun` (lines 43-48) and the `log` import; add `import { selectRun } from "../utils/select-run";`. Replace `const { runs, simulation, ui } = useStores();` with

```ts
  const stores = useStores();
  const { runs } = stores;
```

and every `selectRun(run)` call with `selectRun(stores, run, "map")`.

**Step 6: Run affected tests and lint**

Run: `npx jest src/components/left-panel/run-card src/components/run-tracks.test.tsx src/components/left-panel/runs-section.test.tsx && npm run lint`
Expected: PASS, no lint errors.

**Step 7: Commit**

```bash
git add src/utils/select-run.ts src/utils/select-run.test.ts src/components/left-panel/run-card/run-card.tsx src/components/run-tracks.tsx && git commit -m "Share the run selection flow between cards and map tracks.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Compare-table state on `UIModel`

**Files:**
- Modify: `src/types.ts`
- Modify: `src/models/ui.ts`
- Modify: `src/models/ui.test.ts`

**Step 1: Write the failing tests**

Append inside `describe("UI model", …)` in `src/models/ui.test.ts`:

```ts
  describe("compare table", () => {
    it("starts collapsed at the default position", () => {
      const ui = new UIModel(new SimulationModel());
      expect(ui.compareTableExpanded).toBe(false);
      expect(ui.compareTablePosition).toBeNull();
    });

    it("stores the expanded state and position", () => {
      const ui = new UIModel(new SimulationModel());
      ui.setCompareTableExpanded(true);
      ui.setCompareTablePosition({ left: 40, top: 12 });
      expect(ui.compareTableExpanded).toBe(true);
      expect(ui.compareTablePosition).toEqual({ left: 40, top: 12 });
    });

    it("clears both on reset", () => {
      const ui = new UIModel(new SimulationModel());
      ui.setCompareTableExpanded(true);
      ui.setCompareTablePosition({ left: 40, top: 12 });
      ui.reset();
      expect(ui.compareTableExpanded).toBe(false);
      expect(ui.compareTablePosition).toBeNull();
    });
  });
```

**Step 2: Run to verify failure**

Run: `npx jest src/models/ui.test.ts -t "compare table"`
Expected: FAIL.

**Step 3: Implement**

In `src/types.ts`, add after `ICoordinates` (screen-space shapes, in px; `ICoordinates` is the map-space one):

```ts
export interface IPosition {
  left: number;
  top: number;
}

export interface IBox extends IPosition {
  width: number;
  height: number;
}
```

In `src/models/ui.ts`, add `import { IPosition } from "../types";` and observables after `thermometerPositionHover`:

```ts
  @observable public compareTableExpanded = false;
  // null means the default dock (top-center of the map), set in CSS.
  @observable public compareTablePosition: IPosition | null = null;
```

Add actions after `disableThermometer`:

```ts
  @action.bound public setCompareTableExpanded(expanded: boolean) {
    this.compareTableExpanded = expanded;
  }

  @action.bound public setCompareTablePosition(position: IPosition | null) {
    this.compareTablePosition = position;
  }
```

In `reset()`, add:

```ts
    this.compareTableExpanded = false;
    this.compareTablePosition = null;
```

**Step 4: Run to verify pass**

Run: `npx jest src/models/ui.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/types.ts src/models/ui.ts src/models/ui.test.ts && git commit -m "Add compare table UI state.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: Move `CategorySparkline` into `run-summary/`

Pure move; no behavior change.

**Files:**
- Move: `src/components/left-panel/run-card/category-sparkline.{tsx,scss,test.tsx}` → `src/components/run-summary/`
- Modify: `src/components/left-panel/run-card/run-result.tsx:9`

**Step 1: Move**

```bash
mkdir -p src/components/run-summary
git mv src/components/left-panel/run-card/category-sparkline.tsx src/components/run-summary/category-sparkline.tsx
git mv src/components/left-panel/run-card/category-sparkline.scss src/components/run-summary/category-sparkline.scss
git mv src/components/left-panel/run-card/category-sparkline.test.tsx src/components/run-summary/category-sparkline.test.tsx
```

**Step 2: Fix imports**

- `category-sparkline.tsx`: `"../../../utils/hurricane-categories"` → `"../../utils/hurricane-categories"`; `"../../common.scss"` → `"../common.scss"`.
- `category-sparkline.scss`: `@use "../../common.scss" as *;` → `@use "../common.scss" as *;`.
- `category-sparkline.test.tsx`: check its imports and adjust any `../../../` to `../../` the same way.
- `run-result.tsx`: `import { CategorySparkline } from "../../run-summary/category-sparkline";`

**Step 3: Verify**

Run: `npx jest src/components/run-summary src/components/left-panel/run-card && npm run lint`
Expected: PASS.

**Step 4: Commit**

```bash
git add -A src/components/run-summary src/components/left-panel/run-card && git commit -m "Move CategorySparkline to a shared run-summary folder.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: Run summary value components

**Files:**
- Create: `src/components/run-summary/run-summary-values.tsx`
- Create: `src/components/run-summary/run-summary.scss`
- Create: `src/components/run-summary/run-summary-values.test.tsx`

**Step 1: Write the failing tests**

`src/components/run-summary/run-summary-values.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import React from "react";

import { defaultSimulationState } from "../../models/simulation-serialization";
import { createStores, IStores } from "../../models/stores";
import { StoresContext } from "../../stores-context";
import { INormalizedSimulationState, IRunState } from "../../types/interactive-state";
import {
  CategoryOverTimeValue, LandfallValue, PeakCategoryValue, PressureSystemsValue, SeaSurfaceTempValue,
  SeasonValue, StartLocationValue, StartingCategoryValue
} from "./run-summary-values";

type ValueComponent = React.ComponentType<{ run: IRunState; maxSparklineWidth?: number }>;

const setupSim = (customize?: (sim: INormalizedSimulationState) => void) => {
  const sim = defaultSimulationState();
  sim.startLocation = { lat: 10.5, lng: -20 };
  sim.season = "fall";
  sim.hurricane.startingCategory = 3;
  customize?.(sim);
  return sim;
};

const completedSim = () => {
  const sim = defaultSimulationState();
  sim.simulationStarted = true;
  sim.simulationFinished = true;
  sim.time = 100;
  sim.hurricaneTrack = [
    { position: { lat: 20, lng: -40 }, category: 1 },
    { position: { lat: 22, lng: -42 }, category: 3 }
  ];
  sim.landfalls = [{ position: { lat: 22, lng: -42 }, category: 3 }];
  return sim;
};

const renderValue = (stores: IStores, Value: ValueComponent, simulation: INormalizedSimulationState,
  maxSparklineWidth?: number) => {
  stores.runs.setRuns([{ id: "run-1", simulation }], "run-1");
  return render(
    <StoresContext value={stores}>
      <span data-test="value"><Value run={stores.runs.runs[0]} maxSparklineWidth={maxSparklineWidth} /></span>
    </StoresContext>
  );
};

describe("run summary values", () => {
  let stores: IStores;

  beforeEach(() => {
    stores = createStores();
  });

  describe("StartLocationValue", () => {
    it("shows the start location as lat/lng", () => {
      renderValue(stores, StartLocationValue, setupSim());
      expect(screen.getByTestId("value")).toHaveTextContent("10.50°N, 20.00°W");
    });

    it("resolves a named start location to its coordinates", () => {
      renderValue(stores, StartLocationValue, setupSim(sim => { sim.startLocation = "gulf"; }));
      expect(screen.getByTestId("value")).toHaveTextContent("23.50°N");
    });
  });

  describe("StartingCategoryValue", () => {
    it("shows the starting category with a category-colored icon", () => {
      renderValue(stores, StartingCategoryValue, setupSim());
      expect(screen.getByTestId("value")).toHaveTextContent("Cat 3");
      expect(screen.getByTestId("value").querySelector("svg")).toHaveClass("category3");
    });

    it("shows TS when the category is 0 or missing", () => {
      renderValue(stores, StartingCategoryValue, setupSim(sim => { sim.hurricane.startingCategory = 0; }));
      expect(screen.getByTestId("value")).toHaveTextContent("TS");

      renderValue(stores, StartingCategoryValue, setupSim(sim => { delete sim.hurricane.startingCategory; }));
      expect(screen.getByTestId("value")).toHaveTextContent("TS");
    });
  });

  describe("SeasonValue", () => {
    it("shows the season label", () => {
      renderValue(stores, SeasonValue, setupSim(sim => { sim.season = "earlyFall"; }));
      expect(screen.getByTestId("value")).toHaveTextContent("Early Fall");
    });
  });

  describe("SeaSurfaceTempValue", () => {
    it("shows Baseline when no anomalies are set", () => {
      renderValue(stores, SeaSurfaceTempValue, setupSim());
      expect(screen.getByTestId("value")).toHaveTextContent("Baseline");
    });

    it("lists each nonzero anomaly with its region and signed value", () => {
      renderValue(stores, SeaSurfaceTempValue, setupSim(sim => {
        sim.temperatureAnomalies = { ...sim.temperatureAnomalies, caribbean: 1, centralAtlantic: -2 };
      }));
      const value = screen.getByTestId("value");
      expect(value).toHaveTextContent("Caribbean +1 °C");
      expect(value).toHaveTextContent("C. Atlantic −2 °C");
      expect(value).not.toHaveTextContent("Baseline");
    });
  });

  describe("PressureSystemsValue", () => {
    it("lists each setup pressure system with its label, position, and mb value", () => {
      renderValue(stores, PressureSystemsValue, setupSim(sim => {
        sim.pressureSystems = sim.pressureSystems.map(ps => ({ ...ps, strength: 3 }));
      }));
      const value = screen.getByTestId("value");
      expect(value).toHaveTextContent("H1: Default, 1023 mb");
      expect(value).toHaveTextContent("L2: Default, 1007 mb");
    });
  });

  describe("PeakCategoryValue", () => {
    it("shows a dash before the run completes", () => {
      renderValue(stores, PeakCategoryValue, defaultSimulationState());
      expect(screen.getByTestId("value")).toHaveTextContent("—");
    });

    it("shows the peak category", () => {
      renderValue(stores, PeakCategoryValue, completedSim());
      expect(screen.getByTestId("value")).toHaveTextContent("Cat 3");
      expect(screen.getByTestId("value").querySelector("svg")).toHaveClass("category3");
    });
  });

  describe("LandfallValue", () => {
    it("shows a dash before the run completes", () => {
      renderValue(stores, LandfallValue, defaultSimulationState());
      expect(screen.getByTestId("value")).toHaveTextContent("—");
    });

    it("shows the landfall count", () => {
      renderValue(stores, LandfallValue, completedSim());
      expect(screen.getByTestId("value")).toHaveTextContent("1×");
    });

    it("shows None when there were no landfalls", () => {
      const sim = completedSim();
      sim.landfalls = [];
      renderValue(stores, LandfallValue, sim);
      expect(screen.getByTestId("value")).toHaveTextContent("None");
    });
  });

  describe("CategoryOverTimeValue", () => {
    it("shows a dash before the run completes", () => {
      renderValue(stores, CategoryOverTimeValue, defaultSimulationState());
      expect(screen.getByTestId("value")).toHaveTextContent("—");
    });

    it("renders the sparkline for a completed run", () => {
      renderValue(stores, CategoryOverTimeValue, completedSim());
      expect(screen.getByTestId("value").querySelector("polyline")).toBeInTheDocument();
    });

    it("fills the given width for the longest run", () => {
      renderValue(stores, CategoryOverTimeValue, completedSim(), 100);
      expect(screen.getByTestId("value").querySelector("svg")).toHaveAttribute("width", "100");
    });

    it("scales shorter runs by duration", () => {
      const longer = completedSim();
      const shorter = completedSim();
      shorter.time = 50;
      stores.runs.setRuns([{ id: "run-1", simulation: longer }, { id: "run-2", simulation: shorter }], "run-1");
      render(
        <StoresContext value={stores}>
          <span data-test="value"><CategoryOverTimeValue run={stores.runs.runs[1]} maxSparklineWidth={100} /></span>
        </StoresContext>
      );
      expect(screen.getByTestId("value").querySelector("svg")).toHaveAttribute("width", "50");
    });
  });
});
```

**Step 2: Run to verify failure**

Run: `npx jest src/components/run-summary/run-summary-values.test.tsx`
Expected: FAIL — cannot find module.

**Step 3: Create the stylesheet**

`src/components/run-summary/run-summary.scss` (moved from `run-setup.scss` / `run-result.scss`, plus the value icon):

```scss
@use "../common.scss" as *;

.icon {
  flex-shrink: 0;
  height: 18px;
  width: 18px;
}

.singleLine { white-space: nowrap; }

.categoryValue {
  align-items: center;
  display: inline-flex;
  gap: 7px;
}

.stackedLines {
  align-items: flex-start;
  display: inline-flex;
  flex-direction: column;
  gap: 2px;
  white-space: nowrap;
}

.warm { color: $warmColor; }
.cool { color: $coldColor; }

.pressureSystem {
  align-items: baseline;
  display: flex;
  gap: 4px;
}

.pressureDetail {
  align-items: flex-start;
  display: inline-flex;
  flex-direction: column;
}

.high { color: $highPressureColor; }
.low { color: $lowPressureColor; }

.sparklineSlot {
  align-items: center;
  display: flex;
  flex: 1;
  min-width: 0;
}

.dash { color: $charcoal; }

.fillWhite { color: #fff; }
```

**Step 4: Create the value components**

`src/components/run-summary/run-summary-values.tsx`:

```tsx
import { clsx } from "clsx";
import { observer } from "mobx-react";
import React, { useLayoutEffect, useRef, useState } from "react";

import { clampCategory } from "../../config";
import { resolveStartLocation } from "../../models/simulation";
import { useStores } from "../../stores-context";
import { namedRegions, seasonLabels } from "../../types";
import { IRunState } from "../../types/interactive-state";
import { categoryLabel } from "../../utils/hurricane-categories";
import { formatLatLng } from "../../utils/lat-long";
import { pressureSystemReport } from "../../utils/pressure-systems";
import { temperatureAnomalyRegions } from "../../utils/regions";
import { intensitySeries, landfallSummary, peakCategory } from "../../utils/run-outcomes";
import { CategorySparkline } from "./category-sparkline";

import HurricaneIcon from "../../assets/left-panel/hurricane.svg";
import PeakCategoryIcon from "../../assets/left-panel/peak-category.svg";

import categoryCss from "../hurricane-category.scss";
import css from "./run-summary.scss";

// Used until the sparkline's slot has been measured on the first layout pass.
const fallbackSparklineWidth = 83;

export type SvgIcon = React.ComponentType<React.SVGProps<SVGSVGElement>>;

export interface IRunSummaryValueProps {
  run: IRunState;
  // Width the longest-lived run's sparkline fills; shorter runs scale down proportionally.
  // When omitted the value measures its own slot.
  maxSparklineWidth?: number;
}

export function Dash() {
  return <span className={css.dash}>—</span>;
}

function anomalyText(value: number): string {
  return `${value > 0 ? "+" : "−"}${Math.abs(value)} °C`;
}

interface ICategoryValueProps {
  Icon: SvgIcon;
  category: number | null;
}

export const StartLocationValue = observer(function StartLocationValue({ run }: IRunSummaryValueProps) {
  const { runs } = useStores();
  const start = resolveStartLocation(runs.getSimulationSetup(run).startLocation);
  return <span className={css.singleLine}>{formatLatLng(start.lat, start.lng)}</span>;
});

function CategoryValue({ Icon, category }: ICategoryValueProps) {
  const fillClass = category !== null ? categoryCss["category" + category] : css.fillWhite;
  return (
    <span className={css.categoryValue}>
      <Icon aria-hidden={true} className={clsx(css.icon, fillClass)} />
      {category !== null ? <span>{categoryLabel(category)}</span> : <Dash />}
    </span>
  );
}

export const StartingCategoryValue = observer(function StartingCategoryValue({ run }: IRunSummaryValueProps) {
  const { runs } = useStores();
  const category = clampCategory(runs.getSimulationSetup(run).startingCategory ?? 0);
  return <CategoryValue Icon={HurricaneIcon} category={category} />;
});

export const SeasonValue = observer(function SeasonValue({ run }: IRunSummaryValueProps) {
  const { runs } = useStores();
  const { season } = runs.getSimulationSetup(run);
  return <span>{seasonLabels[season] ?? season}</span>;
});

export const SeaSurfaceTempValue = observer(function SeaSurfaceTempValue({ run }: IRunSummaryValueProps) {
  const { runs } = useStores();
  const { temperatureAnomalies } = runs.getSimulationSetup(run);
  const anomalies = namedRegions
    .map(region => ({
      label: temperatureAnomalyRegions[region].shortLabel,
      value: temperatureAnomalies?.[region] ?? 0
    }))
    .filter(a => a.value !== 0);

  return (
    <span className={css.stackedLines}>
      {anomalies.length === 0 && <span>Baseline</span>}
      {anomalies.map(a => (
        <span key={a.label} className={a.value > 0 ? css.warm : css.cool}>
          {a.label} {anomalyText(a.value)}
        </span>
      ))}
    </span>
  );
});

export const PressureSystemsValue = observer(function PressureSystemsValue({ run }: IRunSummaryValueProps) {
  const { runs } = useStores();
  const report = pressureSystemReport(runs.getSimulationSetup(run).pressureSystemsSetup);
  return (
    <span className={css.stackedLines}>
      {report.map((r, i) => (
        <span key={i} className={css.pressureSystem}>
          <span className={r.type === "high" ? css.high : css.low}>{r.label}:</span>
          {" "}
          <span className={css.pressureDetail}>
            <span>{r.position},</span>
            {" "}
            <span>{r.mb}</span>
          </span>
        </span>
      ))}
    </span>
  );
});

export const PeakCategoryValue = observer(function PeakCategoryValue({ run }: IRunSummaryValueProps) {
  const { runs } = useStores();
  return <CategoryValue Icon={PeakCategoryIcon} category={peakCategory(runs.getSimulationResult(run))} />;
});

export const LandfallValue = observer(function LandfallValue({ run }: IRunSummaryValueProps) {
  const { runs } = useStores();
  const landfalls = landfallSummary(runs.getSimulationResult(run));
  if (!landfalls) return <Dash />;
  return <span>{landfalls.count === 0 ? "None" : `${landfalls.count}×`}</span>;
});

function useMeasuredWidth(ref: React.RefObject<HTMLElement | null>, enabled: boolean) {
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!enabled || !element || typeof ResizeObserver === "undefined") return;
    const measure = () => setWidth(element.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, enabled]);
  return width;
}

export const CategoryOverTimeValue = observer(function CategoryOverTimeValue(
  { run, maxSparklineWidth }: IRunSummaryValueProps
) {
  const { runs } = useStores();
  const result = runs.getSimulationResult(run);
  const series = intensitySeries(result);
  const slotRef = useRef<HTMLSpanElement>(null);
  const measuredWidth = useMeasuredWidth(slotRef, maxSparklineWidth === undefined);

  const maxWidth = maxSparklineWidth ?? (measuredWidth > 0 ? measuredWidth : fallbackSparklineWidth);
  const duration = result?.time ?? 0;
  const { maxDuration } = runs;
  const width = maxDuration > 0 ? (duration / maxDuration) * maxWidth : maxWidth;

  return (
    <span ref={slotRef} className={css.sparklineSlot}>
      {series.length > 0 ? <CategorySparkline series={series} widthPx={width} /> : <Dash />}
    </span>
  );
});
```

**Step 5: Run to verify pass**

Run: `npx jest src/components/run-summary/run-summary-values.test.tsx`
Expected: PASS. If `toHaveAttribute("width", "100")` fails because the SVG renders `width="100"` as a number, check the rendered markup with `screen.debug()` and match what `CategorySparkline` emits (it passes `width={width}`, so the attribute is the numeric string).

**Step 6: Lint and commit**

Run: `npm run lint`

```bash
git add src/components/run-summary && git commit -m "Add shared run summary value components.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: Row descriptors and run card refactor

**Files:**
- Create: `src/components/run-summary/run-summary-rows.tsx`
- Create: `src/components/left-panel/run-card/summary-rows.tsx`
- Modify: `src/components/left-panel/run-card/run-setup.tsx`
- Modify: `src/components/left-panel/run-card/run-result.tsx`
- Modify: `src/components/left-panel/run-card/run-result.scss`
- Modify: `src/components/left-panel/run-card/run-card.scss:120-130`
- Delete: `src/components/left-panel/run-card/run-setup.scss`

The existing tests (`run-setup.test.tsx`, `run-result.test.tsx`, `run-card.test.tsx`) are the safety net for this task; they must pass unchanged.

**Step 1: Create the descriptors**

`src/components/run-summary/run-summary-rows.tsx`:

```tsx
import React from "react";

import {
  CategoryOverTimeValue, IRunSummaryValueProps, LandfallValue, PeakCategoryValue, PressureSystemsValue,
  SeaSurfaceTempValue, SeasonValue, StartLocationValue, StartingCategoryValue, SvgIcon
} from "./run-summary-values";

import CategoryOverTimeIcon from "../../assets/left-panel/category-over-time.svg";
import HurricaneIcon from "../../assets/left-panel/hurricane.svg";
import LandfallIcon from "../../assets/left-panel/landfall.svg";
import PeakCategoryIcon from "../../assets/left-panel/peak-category.svg";
import PressureSystemIcon from "../../assets/left-panel/pressure-system.svg";
import SeasonIcon from "../../assets/left-panel/season.svg";
import StormLocationIcon from "../../assets/left-panel/storm-location.svg";
import ThermometerIcon from "../../assets/left-panel/thermometer.svg";

import css from "./run-summary.scss";

export interface IRunSummaryRow {
  // Suffix of the row's data-test attribute, e.g. "setup-location".
  key: string;
  label: string;
  Icon: SvgIcon;
  iconClassName?: string;
  Value: React.ComponentType<IRunSummaryValueProps>;
  // The value draws its own category-colored icon, so a host that puts icons beside values skips Icon.
  valueHasIcon?: boolean;
}

export const setupRows: IRunSummaryRow[] = [
  { key: "location", label: "Storm Location", Icon: StormLocationIcon, Value: StartLocationValue },
  {
    key: "category", label: "Storm Category", Icon: HurricaneIcon, iconClassName: css.fillWhite,
    Value: StartingCategoryValue, valueHasIcon: true
  },
  { key: "season", label: "Season", Icon: SeasonIcon, Value: SeasonValue },
  { key: "anomalies", label: "Sea Surface Temp", Icon: ThermometerIcon, Value: SeaSurfaceTempValue },
  { key: "pressure-systems", label: "Pressure Systems", Icon: PressureSystemIcon, Value: PressureSystemsValue }
];

export const resultRows: IRunSummaryRow[] = [
  {
    key: "peak-category", label: "Peak Category", Icon: PeakCategoryIcon, iconClassName: css.fillWhite,
    Value: PeakCategoryValue, valueHasIcon: true
  },
  { key: "landfalls", label: "Landfall", Icon: LandfallIcon, Value: LandfallValue },
  {
    key: "category-over-time", label: "Category Over Time", Icon: CategoryOverTimeIcon,
    iconClassName: css.fillWhite, Value: CategoryOverTimeValue
  }
];
```

**Step 2: Create the card row renderer**

`src/components/left-panel/run-card/summary-rows.tsx`:

```tsx
import { clsx } from "clsx";
import React from "react";

import { IRunState } from "../../../types/interactive-state";
import { IRunSummaryRow } from "../../run-summary/run-summary-rows";

import cardCss from "./run-card.scss";

interface IProps {
  rows: IRunSummaryRow[];
  run: IRunState;
  section: "setup" | "result";
}

export function SummaryRows({ rows, run, section }: IProps) {
  return (
    <>
      {rows.map(({ key, Icon, iconClassName, Value, valueHasIcon }) => (
        <div key={key} className={cardCss.categoryRow} data-test={`${section}-${key}`}>
          {!valueHasIcon && <Icon aria-hidden={true} className={clsx(cardCss.icon, iconClassName)} />}
          <Value run={run} />
        </div>
      ))}
    </>
  );
}
```

**Step 3: Rewrite `run-setup.tsx`**

```tsx
import React from "react";

import { IRunState } from "../../../types/interactive-state";
import { setupRows } from "../../run-summary/run-summary-rows";
import { SummaryRows } from "./summary-rows";

import cardCss from "./run-card.scss";

interface IProps {
  run: IRunState;
}

export function RunSetup({ run }: IProps) {
  return (
    <div className={cardCss.summaryColumn} data-test="run-setup">
      <SummaryRows rows={setupRows} run={run} section="setup" />
    </div>
  );
}
```

Delete `run-setup.scss` (`git rm src/components/left-panel/run-card/run-setup.scss`).

**Step 4: Rewrite `run-result.tsx`**

```tsx
import { clsx } from "clsx";
import { observer } from "mobx-react";
import React from "react";

import { useStores } from "../../../stores-context";
import { IRunState } from "../../../types/interactive-state";
import { resultRows } from "../../run-summary/run-summary-rows";
import { RunThumbnail } from "./run-thumbnail";
import { SummaryRows } from "./summary-rows";

import cardCss from "./run-card.scss";
import css from "./run-result.scss";

interface IRunResultProps {
  run: IRunState;
}

export const RunResult = observer(function RunResult({ run }: IRunResultProps) {
  const { runs } = useStores();
  const result = runs.getSimulationResult(run);

  return (
    <>
      <RunThumbnail result={result} run={run} />
      <div className={clsx(cardCss.summaryColumn, css.runResult)}>
        <SummaryRows rows={resultRows} run={run} section="result" />
      </div>
    </>
  );
});
```

`run-result.scss` becomes:

```scss
.runResult {
  margin-top: 6px;
}
```

**Step 5: Adjust `run-card.scss`**

In `.summaryColumn .categoryRow` add `min-height: 18px;` (replaces the 16px/18px rules that lived in the deleted/trimmed stylesheets).

**Step 6: Run the card tests**

Run: `npx jest src/components/left-panel/run-card src/components/left-panel/runs-section.test.tsx src/components/left-panel/left-panel.test.tsx && npm run lint && npm run lint:unused`
Expected: all PASS; no unused-import errors.

**Step 7: Visual check**

Run: `npm start`, open `http://localhost:8080/?mode=storm`, open Storm Setup. The run card should look exactly as before: setup rows with icons, category rows with colored hurricane/peak icons, result rows with dashes before a run and a sparkline after. Run a storm and add a second run to confirm the sparkline widths still scale.

**Step 8: Commit**

```bash
git add -A src/components/run-summary src/components/left-panel/run-card && git commit -m "Render run cards from shared run summary rows.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: `useDraggable` hook

**Files:**
- Create: `src/components/compare-runs-table/use-draggable.ts`
- Create: `src/components/compare-runs-table/use-draggable.test.tsx`

jsdom has no layout, so the tests stub `offsetParent`, `offsetWidth/Height`, `clientWidth/Height`, and `getBoundingClientRect`. Pointer events are dispatched as `MouseEvent`s with a pointer event type name — the handlers only read `clientX/Y`.

**Step 1: Write the failing tests**

`src/components/compare-runs-table/use-draggable.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import React, { useRef } from "react";

import { IPosition } from "../../types";
import { clampToParent, useDraggable } from "./use-draggable";

function Draggable({ onMove }: { onMove: (position: IPosition) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const handlePointerDown = useDraggable({ elementRef: ref, onMove });
  return (
    <div data-test="parent">
      <div ref={ref} data-test="box">
        <div data-test="handle" onPointerDown={handlePointerDown}>
          <button type="button" data-test="button" />
        </div>
      </div>
    </div>
  );
}

const defineSize = (element: HTMLElement, sizes: Record<string, number>) => {
  Object.entries(sizes).forEach(([name, value]) => Object.defineProperty(element, name, { value, configurable: true }));
};

const pointer = (element: HTMLElement, type: string, clientX: number, clientY: number) => {
  element.dispatchEvent(new MouseEvent(type, { bubbles: true, clientX, clientY }));
};

describe("useDraggable", () => {
  let onMove: jest.Mock;
  let handle: HTMLElement;
  let button: HTMLElement;

  beforeEach(() => {
    onMove = jest.fn();
    render(<Draggable onMove={onMove} />);
    const parent = screen.getByTestId("parent");
    const box = screen.getByTestId("box");
    handle = screen.getByTestId("handle");
    button = screen.getByTestId("button");

    defineSize(parent, { clientWidth: 800, clientHeight: 600 });
    parent.getBoundingClientRect = () => ({ left: 100, top: 50, width: 800, height: 600 } as DOMRect);
    Object.defineProperty(box, "offsetParent", { value: parent, configurable: true });
    defineSize(box, { offsetWidth: 200, offsetHeight: 100 });
    box.getBoundingClientRect = () => ({ left: 150, top: 80, width: 200, height: 100 } as DOMRect);
  });

  it("moves the element by the pointer delta, relative to its parent", () => {
    pointer(handle, "pointerdown", 160, 90);
    pointer(handle, "pointermove", 400, 300);
    expect(onMove).toHaveBeenLastCalledWith({ left: 290, top: 240 });
  });

  it("keeps the element inside its parent", () => {
    pointer(handle, "pointerdown", 160, 90);
    pointer(handle, "pointermove", 5000, 5000);
    expect(onMove).toHaveBeenLastCalledWith({ left: 600, top: 500 });
    pointer(handle, "pointermove", -5000, -5000);
    expect(onMove).toHaveBeenLastCalledWith({ left: 0, top: 0 });
  });

  it("stops following the pointer after it is released", () => {
    pointer(handle, "pointerdown", 160, 90);
    pointer(handle, "pointerup", 160, 90);
    pointer(handle, "pointermove", 400, 300);
    expect(onMove).not.toHaveBeenCalled();
  });

  it("ignores pointer-downs on buttons inside the handle", () => {
    pointer(button, "pointerdown", 160, 90);
    pointer(handle, "pointermove", 400, 300);
    expect(onMove).not.toHaveBeenCalled();
  });
});

describe("clampToParent", () => {
  it("clamps a position so the element stays inside its offset parent", () => {
    const parent = document.createElement("div");
    const element = document.createElement("div");
    defineSize(parent, { clientWidth: 800, clientHeight: 600 });
    Object.defineProperty(element, "offsetParent", { value: parent });
    defineSize(element, { offsetWidth: 200, offsetHeight: 100 });

    expect(clampToParent({ left: 700, top: 550 }, element)).toEqual({ left: 600, top: 500 });
    expect(clampToParent({ left: -5, top: -5 }, element)).toEqual({ left: 0, top: 0 });
    expect(clampToParent({ left: 10, top: 10 }, element)).toEqual({ left: 10, top: 10 });
  });
});
```

**Step 2: Run to verify failure**

Run: `npx jest src/components/compare-runs-table/use-draggable.test.tsx`
Expected: FAIL — cannot find module.

**Step 3: Implement**

`src/components/compare-runs-table/use-draggable.ts`:

```ts
import React, { useCallback } from "react";

import { IPosition } from "../../types";

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function clampToParent(position: IPosition, element: HTMLElement): IPosition {
  const parent = element.offsetParent;
  if (!parent) return position;
  return {
    left: clamp(position.left, 0, parent.clientWidth - element.offsetWidth),
    top: clamp(position.top, 0, parent.clientHeight - element.offsetHeight)
  };
}

interface IUseDraggableOptions {
  // The element being moved. Its offsetParent bounds the drag.
  elementRef: React.RefObject<HTMLElement | null>;
  onMove: (position: IPosition) => void;
}

// Returns the pointer-down handler for the drag handle.
export function useDraggable({ elementRef, onMove }: IUseDraggableOptions) {
  return useCallback((event: React.PointerEvent<HTMLElement>) => {
    const element = elementRef.current;
    const parent = element?.offsetParent;
    if (!element || !parent) return;
    if (event.target instanceof Element && event.target.closest("button")) return;

    const handle = event.currentTarget;
    const parentRect = parent.getBoundingClientRect();
    const rect = element.getBoundingClientRect();
    const grabX = event.clientX - rect.left;
    const grabY = event.clientY - rect.top;

    const handleMove = (moveEvent: PointerEvent) => {
      onMove(clampToParent({
        left: moveEvent.clientX - parentRect.left - grabX,
        top: moveEvent.clientY - parentRect.top - grabY
      }, element));
    };
    const handleEnd = () => {
      handle.removeEventListener("pointermove", handleMove);
      handle.removeEventListener("pointerup", handleEnd);
      handle.removeEventListener("pointercancel", handleEnd);
      handle.releasePointerCapture?.(event.pointerId);
    };

    // Capturing keeps move events on the handle even when the pointer outruns it.
    handle.setPointerCapture?.(event.pointerId);
    handle.addEventListener("pointermove", handleMove);
    handle.addEventListener("pointerup", handleEnd);
    handle.addEventListener("pointercancel", handleEnd);
    event.preventDefault();
  }, [elementRef, onMove]);
}
```

**Step 4: Run to verify pass**

Run: `npx jest src/components/compare-runs-table/use-draggable.test.tsx`
Expected: PASS. If `releasePointerCapture` throws in a browser because the pointer was never captured, guard it with `handle.hasPointerCapture?.(event.pointerId)`.

**Step 5: Commit**

```bash
git add src/components/compare-runs-table && git commit -m "Add useDraggable hook.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: Shared SCSS values

**Files:**
- Modify: `src/components/common.scss`
- Modify: `__mocks__/common-scss-mock.js`

**Step 1: Add variables and exports**

In `common.scss`, after `$secondaryColorLight`:

```scss
$secondaryColorDark: #a35a12;
```

After `$runLetterBadgeColor`:

```scss
// Compare Runs table run column width and horizontal cell padding, in px (unitless for the JS export).
$compareRunColumnWidth: 128;
$compareCellHorizontalPadding: 10;
```

In the `:export` block:

```scss
  compareRunColumnWidth: $compareRunColumnWidth;
  compareCellHorizontalPadding: $compareCellHorizontalPadding;
```

In `__mocks__/common-scss-mock.js` add:

```js
  compareRunColumnWidth: "128",
  compareCellHorizontalPadding: "10"
```

**Step 2: Verify build still compiles**

Run: `npx jest src/components/left-panel/run-card/run-card.test.tsx` (smoke) and `npm run lint`.

**Step 3: Commit**

```bash
git add src/components/common.scss __mocks__/common-scss-mock.js && git commit -m "Add shared values for the compare runs table.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 9: `CompareRunsTable` component

**Files:**
- Create: `src/components/compare-runs-table/compare-runs-table.tsx`
- Create: `src/components/compare-runs-table/compare-runs-table.scss`
- Create: `src/components/compare-runs-table/compare-runs-table.test.tsx`

**Step 1: Write the failing tests**

`src/components/compare-runs-table/compare-runs-table.test.tsx`:

```tsx
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { runInAction } from "mobx";
import React from "react";

import { log } from "../../log";
import { createStores, IStores } from "../../models/stores";
import { StoresContext } from "../../stores-context";
import { CompareRunsTable } from "./compare-runs-table";

jest.mock("../../log", () => ({
  log: jest.fn()
}));
const mockLog = log as jest.Mock;

const renderTable = (stores: IStores) =>
  render(
    <StoresContext value={stores}>
      <CompareRunsTable />
    </StoresContext>
  );

const completeCurrentRun = (stores: IStores) => {
  runInAction(() => {
    stores.simulation.simulationStarted = true;
    stores.simulation.simulationFinished = true;
    stores.simulation.hurricaneTrack.push({ position: { lat: 20, lng: -40 }, category: 2 });
  });
};

// Two runs: A complete (winter), B selected and not yet run.
const setUpTwoRuns = (stores: IStores) => {
  stores.simulation.season = "winter";
  completeCurrentRun(stores);
  stores.runs.addRun();
};

describe("CompareRunsTable", () => {
  let stores: IStores;

  beforeEach(() => {
    stores = createStores();
    mockLog.mockClear();
  });

  it("starts collapsed, showing only the header", () => {
    renderTable(stores);
    expect(screen.getByRole("region", { name: "Compare Runs" })).toBeInTheDocument();
    expect(screen.getByTestId("compare-toggle-button")).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("expands and collapses with the toggle button, logging each change", () => {
    renderTable(stores);
    const toggle = screen.getByTestId("compare-toggle-button");

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(mockLog).toHaveBeenLastCalledWith("CompareTableToggled", { expanded: true });

    fireEvent.click(toggle);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(mockLog).toHaveBeenLastCalledWith("CompareTableToggled", { expanded: false });
  });

  describe("expanded", () => {
    beforeEach(() => {
      setUpTwoRuns(stores);
      stores.ui.setCompareTableExpanded(true);
    });

    it("shows a header for each run with its letter and marks the selected one", () => {
      renderTable(stores);
      const headers = screen.getAllByTestId("compare-run-header");
      expect(headers.map(h => h.textContent)).toEqual(["A", "BNot run yet"]);
      expect(headers[0]).toHaveAttribute("aria-pressed", "false");
      expect(headers[1]).toHaveAttribute("aria-pressed", "true");
      expect(headers[1]).toHaveAttribute("aria-label", "Run B, Not run yet");
    });

    it("shows the setup of every run", () => {
      renderTable(stores);
      const seasons = screen.getAllByTestId("compare-cell-season");
      expect(seasons[0]).toHaveTextContent("Winter");
      expect(seasons[1]).not.toHaveTextContent("Winter");
    });

    it("shows setup pressure systems, not the systems a run finished with", () => {
      const stored = stores.runs.runs[0].simulation;
      stored.pressureSystems = stored.pressureSystems.map(ps => ({ ...ps, strength: 3 }));
      renderTable(stores);
      expect(screen.getAllByTestId("compare-cell-pressure-systems")[0]).toHaveTextContent("H1: Default, 1023 mb");
    });

    it("shows results for complete runs and dashes for the rest", () => {
      renderTable(stores);
      const peaks = screen.getAllByTestId("compare-cell-peak-category");
      expect(peaks[0]).toHaveTextContent("Cat 2");
      expect(peaks[1]).toHaveTextContent("—");
      expect(peaks[1].querySelector("svg")).not.toBeInTheDocument();
      expect(screen.getAllByTestId("compare-cell-landfalls")[0]).toHaveTextContent("None");
      expect(screen.getAllByTestId("compare-cell-category-over-time")[0].querySelector("polyline")).toBeInTheDocument();
    });

    it("updates the selected run's setup as it is edited", () => {
      renderTable(stores);
      act(() => runInAction(() => { stores.simulation.setTemperatureAnomaly("caribbean", 2); }));
      expect(screen.getAllByTestId("compare-cell-anomalies")[1]).toHaveTextContent("Caribbean +2 °C");
    });

    it("selects a run when any cell in its column is clicked", () => {
      renderTable(stores);
      fireEvent.click(screen.getAllByTestId("compare-cell-season")[0]);
      expect(stores.runs.selectedRunId).toBe(stores.runs.runs[0].id);
      expect(mockLog).toHaveBeenCalledWith("RunSelected", { runId: stores.runs.runs[0].id, via: "table" });
    });

    it("selects a run when its header is clicked", () => {
      renderTable(stores);
      fireEvent.click(screen.getAllByTestId("compare-run-header")[0]);
      expect(stores.runs.selectedRunId).toBe(stores.runs.runs[0].id);
    });

    it("does nothing when the selected column is clicked", () => {
      renderTable(stores);
      fireEvent.click(screen.getAllByTestId("compare-run-header")[1]);
      fireEvent.click(screen.getAllByTestId("compare-cell-season")[1]);
      expect(mockLog).not.toHaveBeenCalledWith("RunSelected", expect.anything());
    });

    it("selects a run with Enter or Space on its focused header", async () => {
      const user = userEvent.setup();
      renderTable(stores);
      const headers = screen.getAllByTestId("compare-run-header");

      headers[0].focus();
      await user.keyboard("{Enter}");
      expect(stores.runs.selectedRunId).toBe(stores.runs.runs[0].id);

      headers[1].focus();
      await user.keyboard(" ");
      expect(stores.runs.selectedRunId).toBe(stores.runs.runs[1].id);
    });

    it("shows the running status in the selected run's header", () => {
      renderTable(stores);
      act(() => runInAction(() => {
        stores.simulation.simulationStarted = true;
        stores.simulation.simulationRunning = true;
      }));
      expect(screen.getAllByTestId("compare-run-header")[1]).toHaveTextContent("Running...");
    });
  });

  it("positions itself from the stored position once dragged", () => {
    stores.ui.setCompareTablePosition({ left: 40, top: 12 });
    renderTable(stores);
    const table = screen.getByTestId("compare-runs-table");
    expect(table).toHaveStyle({ left: "40px", top: "12px" });
  });
});
```

**Step 2: Run to verify failure**

Run: `npx jest src/components/compare-runs-table/compare-runs-table.test.tsx`
Expected: FAIL — cannot find module.

**Step 3: Create the stylesheet**

`src/components/compare-runs-table/compare-runs-table.scss`:

```scss
@use "../common" as *;

$labelColumnWidth: 190px;
$runColumnWidth: #{$compareRunColumnWidth}px;
$cellPadding: 6px #{$compareCellHorizontalPadding}px;
$headerHeight: 40px;
$headerFill: #fafafa;
$groupRowFill: #f0f0f0;
// Darker than $secondaryColorLight so the hover step reads the same on the gray group rows.
$groupRowHoverFill: #f6e5cb;
$tablePadding: 6px;

.compareRunsTable {
  background: #fff;
  border: 1px solid $charcoalMedium;
  border-radius: 8px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.28);
  color: $charcoal;
  font-family: $mainFont;
  left: 50%;
  overflow: hidden;
  position: absolute;
  top: 10px;
  transform: translateX(-50%);
  width: fit-content;
  // Above the left panel and right-panel tabs (1000) and Leaflet's controls.
  z-index: 1100;

  .header {
    align-items: center;
    background: $headerFill;
    cursor: grab;
    display: flex;
    height: $headerHeight;
    // The one-run table width, so expanding with a single run doesn't change the card's width.
    min-width: $labelColumnWidth + $runColumnWidth + 2 * $tablePadding;
    padding: 0 4px 0 14px;
    position: relative;
    touch-action: none;
    user-select: none;

    &:active {
      cursor: grabbing;
    }
  }

  &.expanded .header {
    border-bottom: 1px solid $hoverColor;
  }

  .title {
    font-size: 15px;
    font-weight: 700;
  }

  .dragHandle {
    fill: $charcoalMedium;
    height: 14px;
    left: 50%;
    pointer-events: none;
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 14px;
  }

  .toggleButton {
    align-items: center;
    background: none;
    border: none;
    border-radius: 4px;
    color: $charcoalMedium;
    cursor: pointer;
    display: inline-flex;
    height: 32px;
    justify-content: center;
    margin-left: auto;
    padding: 0;
    width: 32px;

    &:hover {
      background: $secondaryColorHover;
      color: $charcoal;
    }

    &:active {
      background: $secondaryColor;
      color: $charcoal;
    }

    &:focus-visible {
      outline: 2px solid $charcoal;
      outline-offset: 2px;
    }

    .chevron {
      transition: transform 0.15s ease;

      path:last-child {
        fill: currentColor;
      }
    }
  }

  &.expanded .chevron {
    transform: rotate(180deg);
  }

  .tableContainer {
    padding: 0 $tablePadding $tablePadding;
    position: relative;
  }

  .selectedColumnOutline {
    border: 2px solid $secondaryColor;
    border-radius: 6px;
    box-sizing: border-box;
    pointer-events: none;
    position: absolute;
    z-index: 2;
  }

  .table {
    border-collapse: collapse;
    font-size: 14px;

    th, td {
      padding: $cellPadding;
      text-align: left;
      vertical-align: middle;
    }
  }

  .corner, .rowLabel, .groupLabel {
    box-sizing: border-box;
    width: $labelColumnWidth;
  }

  .rowLabel {
    border-right: 1px solid $hoverColor;
    font-weight: 600;
    white-space: nowrap;
  }

  .rowLabelContent {
    align-items: center;
    display: flex;
    gap: 7px;
  }

  .rowIcon {
    flex-shrink: 0;
    height: 18px;
    width: 18px;
  }

  .groupRow {
    th, td {
      background: $groupRowFill;
    }
  }

  .groupLabel {
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .runHeader, .runCell, .groupCell {
    box-sizing: border-box;
    cursor: pointer;
    max-width: $runColumnWidth;
    min-width: $runColumnWidth;
    overflow-wrap: anywhere;
    width: $runColumnWidth;
  }

  .dataRow {
    th, td {
      border-top: 1px solid $groupRowFill;
    }
  }

  .runCell {
    font-family: $scaleFont;
  }

  .runHeaderContent {
    align-items: center;
    display: flex;
    gap: 8px;
    white-space: nowrap;
  }

  .runLetter {
    @include runLetterBadge;
  }

  .runStatus {
    color: $secondaryColorDark;
    font-family: $scaleFont;
    font-weight: 700;
  }

  .selected {
    cursor: default;

    .runLetter {
      background-color: $secondaryColor;
    }
  }

  .runCell:hover, .runHeader:hover, .hovered,
  .rowLabel:hover, .rowLabel:hover ~ td {
    background: $secondaryColorLight;
  }

  .groupCell:hover, .groupRow .hovered,
  .groupLabel:hover, .groupLabel:hover ~ td {
    background: $groupRowHoverFill;
  }
}
```

**Step 4: Create the component**

`src/components/compare-runs-table/compare-runs-table.tsx`:

```tsx
import { clsx } from "clsx";
import { observer } from "mobx-react";
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { log } from "../../log";
import { useStores } from "../../stores-context";
import { IBox } from "../../types";
import { IRunState } from "../../types/interactive-state";
import { selectRun } from "../../utils/select-run";
import { IRunSummaryRow, resultRows, setupRows } from "../run-summary/run-summary-rows";
import { Dash } from "../run-summary/run-summary-values";
import { clampToParent, useDraggable } from "./use-draggable";

import DragIcon from "../../assets/drag.svg";
import DropdownArrowIcon from "../../assets/left-panel/dropdown-arrow.svg";

import commonCss from "../common.scss";
import css from "./compare-runs-table.scss";

const maxSparklineWidth = parseFloat(commonCss.compareRunColumnWidth) - 2 * parseFloat(commonCss.compareCellHorizontalPadding);

type Section = "setup" | "result";

export const CompareRunsTable = observer(function CompareRunsTable() {
  const stores = useStores();
  const { runs, ui } = stores;
  const { compareTableExpanded: expanded, compareTablePosition: position } = ui;
  const compareRunsTableRef = useRef<HTMLDivElement>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [hoveredRunId, setHoveredRunId] = useState<string | null>(null);
  const [selectedColumnBox, setSelectedColumnBox] = useState<IBox | null>(null);
  const runCount = runs.runs.length;

  const handleDragStart = useDraggable({ elementRef: compareRunsTableRef, onMove: ui.setCompareTablePosition });

  // A dragged table can end up outside the map when it grows or the window shrinks.
  useLayoutEffect(() => {
    const table = compareRunsTableRef.current;
    if (!table || !position) return;
    const keepInside = () => {
      const clamped = clampToParent(position, table);
      if (clamped.left !== position.left || clamped.top !== position.top) ui.setCompareTablePosition(clamped);
    };
    keepInside();
    window.addEventListener("resize", keepInside);
    return () => window.removeEventListener("resize", keepInside);
  }, [position, expanded, runCount, ui]);

  // One box outlines the whole selected column, including the group rows a per-cell border can't span.
  const measureSelectedColumn = useCallback(() => {
    const container = tableContainerRef.current;
    const header = container?.querySelector<HTMLElement>(`[data-run-id="${runs.selectedRunId}"]`);
    const table = container?.querySelector("table");
    if (!container || !header || !table) {
      setSelectedColumnBox(null);
      return;
    }
    const containerRect = container.getBoundingClientRect();
    const headerRect = header.getBoundingClientRect();
    const tableRect = table.getBoundingClientRect();
    setSelectedColumnBox({
      left: headerRect.left - containerRect.left,
      top: tableRect.top - containerRect.top,
      width: headerRect.width,
      height: tableRect.height
    });
  }, [runs.selectedRunId]);

  useLayoutEffect(measureSelectedColumn, [measureSelectedColumn, expanded, runCount]);

  useEffect(() => {
    window.addEventListener("resize", measureSelectedColumn);
    return () => window.removeEventListener("resize", measureSelectedColumn);
  }, [measureSelectedColumn]);

  const handleToggle = () => {
    const next = !expanded;
    ui.setCompareTableExpanded(next);
    log("CompareTableToggled", { expanded: next });
  };

  const handleSelect = (run: IRunState) => selectRun(stores, run, "table");

  const handleHeaderKeyDown = (event: React.KeyboardEvent, run: IRunState) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleSelect(run);
    }
  };

  const columnClasses = (run: IRunState) => ({
    [css.selected]: runs.isSelected(run.id),
    [css.hovered]: hoveredRunId === run.id
  });

  const renderHeader = (run: IRunState) => {
    const letter = runs.runLetter(run);
    const status = runs.runStatus(run);
    return (
      <th
        key={run.id}
        scope="col"
        role="button"
        tabIndex={0}
        aria-label={`Run ${letter}${status ? `, ${status}` : ""}`}
        aria-pressed={runs.isSelected(run.id)}
        className={clsx(css.runHeader, columnClasses(run))}
        data-run-id={run.id}
        data-test="compare-run-header"
        onClick={() => handleSelect(run)}
        onKeyDown={event => handleHeaderKeyDown(event, run)}
        onMouseEnter={() => setHoveredRunId(run.id)}
        onMouseLeave={() => setHoveredRunId(null)}
      >
        <span className={css.runHeaderContent}>
          <span className={css.runLetter}>{letter}</span>
          {status && <span className={css.runStatus}>{status}</span>}
        </span>
      </th>
    );
  };

  const renderSectionHeaderRow = (label: string) => (
    <tr className={css.groupRow}>
      <th scope="row" className={css.groupLabel}>{label}</th>
      {runs.runs.map(run => (
        <td key={run.id} className={clsx(css.groupCell, columnClasses(run))} onClick={() => handleSelect(run)} />
      ))}
    </tr>
  );

  const renderRow = ({ key, label, Icon, iconClassName, Value }: IRunSummaryRow, section: Section) => (
    <tr key={key} className={css.dataRow}>
      <th scope="row" className={css.rowLabel}>
        <span className={css.rowLabelContent}>
          <Icon aria-hidden={true} className={clsx(css.rowIcon, iconClassName)} />
          {label}
        </span>
      </th>
      {runs.runs.map(run => (
        <td
          key={run.id}
          className={clsx(css.runCell, columnClasses(run))}
          data-test={`compare-cell-${key}`}
          onClick={() => handleSelect(run)}
        >
          {section === "result" && !runs.isRunComplete(run)
            ? <Dash />
            : <Value run={run} maxSparklineWidth={maxSparklineWidth} />}
        </td>
      ))}
    </tr>
  );

  return (
    <div
      ref={compareRunsTableRef}
      className={clsx(css.compareRunsTable, { [css.expanded]: expanded })}
      style={position ? { left: position.left, top: position.top, transform: "none" } : undefined}
      role="region"
      aria-label="Compare Runs"
      data-test="compare-runs-table"
    >
      <div className={css.header} onPointerDown={handleDragStart}>
        <span className={css.title}>Compare Runs</span>
        <DragIcon aria-hidden={true} className={css.dragHandle} />
        <button
          type="button"
          className={css.toggleButton}
          aria-expanded={expanded}
          aria-label={expanded ? "Collapse compare runs" : "Expand compare runs"}
          data-test="compare-toggle-button"
          onClick={handleToggle}
        >
          <DropdownArrowIcon aria-hidden={true} className={css.chevron} />
        </button>
      </div>
      {expanded &&
        <div ref={tableContainerRef} className={css.tableContainer}>
          {selectedColumnBox &&
            <div aria-hidden={true} className={css.selectedColumnOutline} style={selectedColumnBox} />}
          <table className={css.table}>
            <thead>
              <tr>
                <th className={css.corner} />
                {runs.runs.map(renderHeader)}
              </tr>
            </thead>
            <tbody>
              {renderSectionHeaderRow("Setup")}
              {setupRows.map(row => renderRow(row, "setup"))}
              {renderSectionHeaderRow("Result")}
              {resultRows.map(row => renderRow(row, "result"))}
            </tbody>
          </table>
        </div>}
    </div>
  );
});
```

**Step 5: Run to verify pass**

Run: `npx jest src/components/compare-runs-table`
Expected: PASS. Likely adjustments:
- If `toHaveStyle({ left: "40px" })` fails, React renders numeric `left` as `40px`; confirm with `screen.debug()`.
- The header text assertion `"BNot run yet"` depends on no whitespace between the badge and status spans; keep them adjacent in JSX as written.

**Step 6: Lint**

Run: `npm run lint && npm run lint:unused`

**Step 7: Commit**

```bash
git add src/components/compare-runs-table && git commit -m "Add the compare runs table.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 10: Mount in `MapView`

**Files:**
- Modify: `src/components/map-view.tsx:284`
- Modify: `src/components/map-view.scss:3`
- Modify: `src/components/map-view.test.tsx`

**Step 1: Write the failing tests**

Add to `map-view.test.tsx` inside `describe("MapView component", …)`:

```tsx
  it("shows the compare runs table in storm mode", () => {
    const oldMode = config.mode;
    config.mode = "storm";
    renderMapView(stores);
    expect(document.querySelector("[data-test='compare-runs-table']")).toBeInTheDocument();
    config.mode = oldMode;
  });

  it("hides the compare runs table outside storm mode", () => {
    const oldMode = config.mode;
    config.mode = "hurricane";
    renderMapView(stores);
    expect(document.querySelector("[data-test='compare-runs-table']")).not.toBeInTheDocument();
    config.mode = oldMode;
  });
```

**Step 2: Run to verify failure**

Run: `npx jest src/components/map-view.test.tsx -t "compare runs table"`
Expected: the storm-mode test FAILS.

**Step 3: Implement**

In `map-view.tsx`, add `import { CompareRunsTable } from "./compare-runs-table/compare-runs-table";` and, directly after `</MapContainer>` (line 284) and before the closing `</div>`:

```tsx
        {config.mode === "storm" && <CompareRunsTable />}
```

In `map-view.scss`, add `position: relative;` to `.mapView` (first declaration) so the table's `offsetParent` and drag bounds are the map area. Do **not** add a `z-index` here — that would trap the table in a stacking context below the panels.

**Step 4: Run to verify pass**

Run: `npx jest src/components/map-view.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/map-view.tsx src/components/map-view.scss src/components/map-view.test.tsx && git commit -m "Show the compare runs table over the map in storm mode.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 11: Logged events documentation

**Files:**
- Modify: `LOGGED-EVENTS.md:23` and the Run Management table

**Step 1: Update**

Change the `RunSelected` row to:

```
| `RunSelected` | `{ runId, via: "panel" \| "map" \| "table" }` | User selects a different run by clicking its setup panel, its track on the map, or its column in the Compare Runs table |
```

Add a row after `RunDeleted`:

```
| `CompareTableToggled` | `{ expanded: boolean }` | User expands or collapses the Compare Runs table |
```

**Step 2: Commit**

```bash
git add LOGGED-EVENTS.md && git commit -m "Document compare runs table events.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 12: Full verification and manual check

**Step 1: Full suite, lint, production lint**

Run: `npm test && npm run lint:build && npm run lint:unused`
Expected: all pass, no output from lint.

**Step 2: Manual check**

Run `npm start` and open `http://localhost:8080/?mode=storm`. Verify against the design screenshots:

1. Collapsed card top-center under the top bar: "Compare Runs", drag dots, chevron.
2. Chevron expands; A column present with SETUP/RESULT rows; selected column outlined orange with an orange badge; the card's width does not change on expand with one run.
3. Run a storm, add run B, change B's season: table shows both, B header says "Not run yet", B's result cells are dashes. Result rows for A show peak/landfall/sparkline.
4. Hover a data cell → only it tints; hover a row label → the whole row; hover a column header → the whole column (group rows darker).
5. Click any cell in A → A selected, map resets to North Atlantic, run card A selected in the left panel.
6. Drag by the header: stays within the map (not over the top bar or bottom bar, not past the sides); the card renders over the open Storm Setup panel and over the right-panel tabs.
7. Resize the window smaller after dragging to the right edge: the card is pushed back inside.
8. "Clear All" collapses the card and returns it to the default dock.
9. Load with `?mode=hurricane` — no card.
10. `?logMonitor=true`: expanding logs `CompareTableToggled`, selecting from the table logs `RunSelected` with `via: "table"`.

**Step 3: Fix anything found**, with a test where the behavior is testable, then commit.
