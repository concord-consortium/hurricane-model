# Multiple Simulation Runs Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Support up to six persistent simulation runs — switchable, displayed together on the map, and manageable from the storm setup panel.

**Architecture:** A new `RunsModel` MobX store holds run records, each a serialized `ISimulationState` (the shape interactive state already saves). The existing live `SimulationModel` singleton always represents the selected run; switching serializes the live sim into its record and hydrates it from the target record. Interactive state moves to version 2 (`runs` array + `selectedRunId` replacing the single `simulation`). See `docs/plans/2026-08-21-multiple-runs-design.md` for the approved design.

**Tech Stack:** TypeScript, React 19, MobX 6 (class decorators + `makeObservable`), react-leaflet 5, MUI, Jest + React Testing Library, SCSS modules.

**Conventions to follow throughout:**
- Never use `Math.random`; ids come from a counter, not randomness.
- Match MobX idiom: `@observable`/`@computed`/`@action` + `makeObservable(this)` in the constructor.
- Minimal comments — only non-obvious "why" comments (user preference).
- `data-test` attributes for testability (Jest config maps `getByTestId` to `data-test`).
- Run tests with `npx jest <path>`. If Jest hangs at startup, the fix is `brew reinstall watchman` (known machine issue).

---

### Task 1: Extract simulation serialization helpers

Extract the simulation-serialize and simulation-apply logic out of `src/models/interactive-state.ts` into a new module so run switching and state restore share one code path. Pure refactor plus two small behavior additions (cache clearing) needed by run switching.

**Files:**
- Create: `src/models/simulation-serialization.ts`
- Create: `src/models/simulation-serialization.test.ts`
- Modify: `src/models/interactive-state.ts`

**Step 1: Write the failing test**

Create `src/models/simulation-serialization.test.ts`:

```ts
import { serializeSimulation, applySimulationState } from "./simulation-serialization";
import { createStores } from "./stores";
import { PressureSystem } from "./pressure-system";

describe("simulation-serialization", () => {
  describe("serializeSimulation", () => {
    it("serializes all simulation properties", () => {
      const { simulation } = createStores();
      const state = serializeSimulation(simulation);

      expect(state.season).toBe(simulation.season);
      expect(state.startLocation).toBe(simulation.startLocation);
      expect(state.pressureSystems).toEqual(simulation.pressureSystems.map(ps => ps.serialize()));
      expect(state.simulationStarted).toBe(false);
      expect(state.simulationFinished).toBe(false);
      expect(state.time).toBe(0);
      expect(state.hurricane.center).toEqual(simulation.hurricane.center);
      expect(state.hurricaneTrack).toEqual([]);
      expect(state.landfalls).toEqual([]);
      expect(state.consumedExtendedLandfallAreas).toEqual([]);
      expect(state.temperatureAnomalies).toBeDefined();
    });
  });

  describe("applySimulationState", () => {
    it("round-trips simulation state between two store instances", () => {
      const source = createStores().simulation;
      source.season = "winter";
      source.simulationStarted = true;
      source.simulationFinished = true;
      source.time = 42;
      source.hurricaneTrack.push({ position: { lat: 20, lng: -40 }, category: 2 });
      source.landfalls.push({ position: { lat: 25, lng: -80 }, category: 1 });
      source.strengthChangePositions.push(0);
      source.hurricane.center = { lat: 21, lng: -41 };
      source.hurricane.strength = 55;
      source.setTemperatureAnomaly("gulf", 2);

      const target = createStores().simulation;
      applySimulationState(target, serializeSimulation(source));

      expect(target.season).toBe("winter");
      expect(target.simulationStarted).toBe(true);
      expect(target.simulationFinished).toBe(true);
      expect(target.time).toBe(42);
      expect(target.hurricaneTrack).toEqual([{ position: { lat: 20, lng: -40 }, category: 2 }]);
      expect(target.landfalls).toEqual([{ position: { lat: 25, lng: -80 }, category: 1 }]);
      expect(target.hurricane.center).toEqual({ lat: 21, lng: -41 });
      expect(target.hurricane.strength).toBe(55);
      expect(target.temperatureAnomalyAt("gulf")).toBe(2);
    });

    it("clears stale per-run caches", () => {
      const { simulation } = createStores();
      simulation.windKdTreeCache = {};
      simulation.pressureSystemSettings = [new PressureSystem({ center: { lat: 30, lng: -40 } })];
      simulation.simulationRunning = true;

      applySimulationState(simulation, serializeSimulation(simulation));

      expect(simulation.windKdTreeCache).toBeNull();
      expect(simulation.pressureSystemSettings).toEqual([]);
      expect(simulation.simulationRunning).toBe(false);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/models/simulation-serialization.test.ts`
Expected: FAIL — cannot find module `./simulation-serialization`.

**Step 3: Create the module**

Create `src/models/simulation-serialization.ts`. Move the code bodies from `src/models/interactive-state.ts` — the simulation block of `getInteractiveState` (lines building the `simulation:` object) becomes `serializeSimulation`, and the simulation-restoring `runInAction` block of `setInteractiveState` becomes `applySimulationState`. Keep the existing comments that travel with the moved code (the MobX unconditional-reads warning, the consumed-landfall-areas explanation).

```ts
import { runInAction, toJS } from "mobx";
import { namedRegions } from "../types";
import { ISimulationState } from "../types/interactive-state";
import { safeStartLocation } from "../utils/interactive-state";
import { PressureSystem } from "./pressure-system";
import { SimulationModel, extendedLandfallBounds } from "./simulation";

/**
 * Serializes the live simulation into the shape stored per run and in interactive state.
 *
 * IMPORTANT: Do not add conditional access to observables in this function.
 * MobX reactions rely on unconditional reads to track dependencies correctly.
 */
export function serializeSimulation(simulation: SimulationModel): ISimulationState {
  const { hurricane, startLocation } = simulation;
  return {
    season: simulation.season,
    startLocation: safeStartLocation(startLocation),
    pressureSystems: simulation.pressureSystems.map(ps => ps.serialize()),
    simulationStarted: simulation.simulationStarted,
    simulationFinished: simulation.simulationFinished,
    time: simulation.time,
    hurricane: {
      center: { ...hurricane.center },
      strength: hurricane.strength,
      speed: { ...hurricane.speed },
      startingCategory: hurricane.startingCategory,
      cat3SSTThresholdReached: hurricane.cat3SSTThresholdReached
    },
    hurricaneTrack: toJS(simulation.hurricaneTrack),
    landfalls: toJS(simulation.landfalls),
    strengthChangePositions: toJS(simulation.strengthChangePositions),
    precipitationPoints: toJS(simulation.precipitationPoints),
    numberOfStepsOverSea: simulation.numberOfStepsOverSea,
    numberOfStepsOverLand: simulation.numberOfStepsOverLand,
    consumedExtendedLandfallAreas: Object.keys(extendedLandfallBounds)
      .filter(key => !simulation.extendedLandfallAreas
        .some(area => area.equals(extendedLandfallBounds[key]))),
    temperatureAnomalies: Object.fromEntries(simulation.temperatureAnomalies)
  };
}

export function applySimulationState(simulation: SimulationModel, simState: ISimulationState): void {
  const { hurricane: hurState, startLocation } = simState;
  runInAction(() => {
    // ... move the existing body of setInteractiveState's simulation runInAction block here,
    // verbatim (season, startLocation, pressureSystems, progress flags, track data, hurricane
    // fields, time, strengthChangePositions, precipitationPoints, steps-over-sea/land,
    // consumedExtendedLandfallAreas reconstruction, temperatureAnomalies) ...

    // Run switching swaps the whole simulation, so per-run caches must not leak across runs.
    simulation.pressureSystemSettings = [];
    simulation.windKdTreeCache = null;
    simulation.simulationRunning = false;
  });
}
```

**Step 4: Re-point interactive-state.ts at the helpers**

In `src/models/interactive-state.ts`:
- `getInteractiveState` returns `{ version: 1, mode: config.mode, simulation: serializeSimulation(stores.simulation), ui: { ...unchanged } }`.
- `setInteractiveState` replaces its simulation `runInAction` block with `applySimulationState(stores.simulation, simState)` (keep the `if (simState)` guard and the UI block unchanged).
- Remove now-unused imports (`toJS`, `PressureSystem`, `extendedLandfallBounds`, `safeStartLocation`, `namedRegions` — whichever are no longer referenced).

**Step 5: Run tests to verify they pass**

Run: `npx jest src/models/simulation-serialization.test.ts src/models/interactive-state.test.ts`
Expected: PASS (both — interactive-state behavior is unchanged).

**Step 6: Commit**

```bash
git add src/models/simulation-serialization.ts src/models/simulation-serialization.test.ts src/models/interactive-state.ts
git commit -m "Extract simulation serialization helpers"
```

---

### Task 2: Default and setup-only state builders

Two more helpers: `defaultSimulationState()` (a fresh run's state, derived from `config` at call time so authored-state config changes are picked up) and `extractSetupState()` (strip a record's outcome, mirroring `SimulationModel.restart()`), plus `cloneSimulationState`.

**Files:**
- Modify: `src/models/simulation-serialization.ts`
- Modify: `src/models/simulation-serialization.test.ts`

**Step 1: Write the failing tests**

Append to `src/models/simulation-serialization.test.ts` (add imports for the new functions and `createStores`):

```ts
describe("defaultSimulationState", () => {
  it("matches a freshly constructed simulation", () => {
    const { simulation } = createStores();
    expect(defaultSimulationState()).toEqual(serializeSimulation(simulation));
  });
});

describe("extractSetupState", () => {
  it("keeps setup and clears the outcome of a finished run", () => {
    const { simulation } = createStores();
    simulation.season = "winter";
    simulation.setTemperatureAnomaly("gulf", 1.5);
    const finished = serializeSimulation(simulation);
    finished.simulationStarted = true;
    finished.simulationFinished = true;
    finished.time = 100;
    finished.hurricaneTrack = [{ position: { lat: 20, lng: -40 }, category: 2 }];
    finished.landfalls = [{ position: { lat: 25, lng: -80 }, category: 1 }];
    finished.strengthChangePositions = [0];
    finished.precipitationPoints = [[20, -40, 0.5, 900000]];
    finished.numberOfStepsOverSea = 5;
    finished.consumedExtendedLandfallAreas = ["PuertoRico"];
    finished.hurricane.center = { lat: 40, lng: -70 };
    finished.hurricane.strength = 2;
    finished.hurricane.cat3SSTThresholdReached = true;

    const setup = extractSetupState(finished);

    expect(setup.season).toBe("winter");
    expect(setup.startLocation).toBe(finished.startLocation);
    expect(setup.pressureSystems).toEqual(finished.pressureSystems);
    expect(setup.temperatureAnomalies).toEqual(finished.temperatureAnomalies);
    expect(setup.simulationStarted).toBe(false);
    expect(setup.simulationFinished).toBe(false);
    expect(setup.time).toBe(0);
    expect(setup.hurricaneTrack).toEqual([]);
    expect(setup.landfalls).toEqual([]);
    expect(setup.strengthChangePositions).toEqual([]);
    expect(setup.precipitationPoints).toEqual([]);
    expect(setup.numberOfStepsOverSea).toBe(0);
    expect(setup.consumedExtendedLandfallAreas).toEqual([]);
    // Hurricane returns to its starting position and strength.
    expect(setup.hurricane.center).toEqual(defaultSimulationState().hurricane.center);
    expect(setup.hurricane.strength).toBe(defaultSimulationState().hurricane.strength);
    expect(setup.hurricane.cat3SSTThresholdReached).toBe(false);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx jest src/models/simulation-serialization.test.ts`
Expected: FAIL — the new functions are not exported.

**Step 3: Implement**

Add to `src/models/simulation-serialization.ts` (extend imports as shown):

```ts
import config, { startStrengths } from "../config";
import { hurricaneCategoryInfo } from "../constants";
import { NamedRegion, isStartLocationName, namedRegions } from "../types";
import { clampAnomaly } from "../utils/regions";
import { IPressureSystemOptions } from "./pressure-system";
import { resolveStartLocation } from "./simulation";

export const cloneSimulationState = (state: ISimulationState): ISimulationState =>
  JSON.parse(JSON.stringify(state));

// Mirrors the defaults SimulationModel and Hurricane read from config at construction time.
export function defaultSimulationState(): ISimulationState {
  const startLocation = config.initialHurricanePosition;
  const startingCategory = config.startingCategory != null && isFinite(Number(config.startingCategory))
    ? config.startingCategory
    : (config.mode === "storm" ? 0 : undefined);
  const strength = startingCategory !== undefined &&
    hurricaneCategoryInfo[startingCategory]?.startingWindSpeed != null
    ? hurricaneCategoryInfo[startingCategory].startingWindSpeed
    : config.hurricaneStrength;
  const temperatureAnomalies: Partial<Record<NamedRegion, number>> = {};
  const configAnomalies: Record<string, number> = config.temperatureAnomalies ?? {};
  for (const key of namedRegions) {
    const raw = Number(configAnomalies[key]);
    temperatureAnomalies[key] = isFinite(raw) ? clampAnomaly(raw) : 0;
  }
  return {
    season: config.season,
    startLocation: safeStartLocation(startLocation),
    pressureSystems: config.pressureSystems.map((ps: IPressureSystemOptions) => ({
      type: ps.type || "low",
      center: { ...ps.center },
      strength: ps.strength ?? config.pressureSystemStrength
    })),
    simulationStarted: false,
    simulationFinished: false,
    time: 0,
    hurricane: {
      center: resolveStartLocation(startLocation),
      strength,
      speed: { ...config.initialHurricaneSpeed },
      startingCategory,
      cat3SSTThresholdReached: false
    },
    hurricaneTrack: [],
    landfalls: [],
    strengthChangePositions: [],
    precipitationPoints: [],
    numberOfStepsOverSea: 0,
    numberOfStepsOverLand: 0,
    consumedExtendedLandfallAreas: [],
    temperatureAnomalies
  };
}

export function extractSetupState(state: ISimulationState): ISimulationState {
  const setup = cloneSimulationState(state);
  setup.simulationStarted = false;
  setup.simulationFinished = false;
  setup.time = 0;
  setup.hurricaneTrack = [];
  setup.landfalls = [];
  setup.strengthChangePositions = [];
  setup.precipitationPoints = [];
  setup.numberOfStepsOverSea = 0;
  setup.numberOfStepsOverLand = 0;
  setup.consumedExtendedLandfallAreas = [];
  const { startingCategory } = state.hurricane;
  // Mirrors SimulationModel.restart(): starting strength comes from the category when set,
  // falling back to the named-location default.
  let strength = state.hurricane.strength;
  if (startingCategory !== undefined && hurricaneCategoryInfo[startingCategory]?.startingWindSpeed != null) {
    strength = hurricaneCategoryInfo[startingCategory].startingWindSpeed;
  } else if (isStartLocationName(state.startLocation)) {
    strength = startStrengths[state.startLocation];
  }
  setup.hurricane = {
    center: resolveStartLocation(state.startLocation),
    strength,
    speed: { ...config.initialHurricaneSpeed },
    startingCategory,
    cat3SSTThresholdReached: false
  };
  return setup;
}
```

Note: `defaultSimulationState` must read `config` at call time (not capture at module load) — "New Run" after authored state has mutated `config` should use the authored defaults.

**Step 4: Run tests to verify they pass**

Run: `npx jest src/models/simulation-serialization.test.ts`
Expected: PASS. If the `defaultSimulationState` equality test fails on a field, compare the two objects — the builder must match `SimulationModel`/`Hurricane` constructor defaults exactly (check `src/models/simulation.ts:112-175` and `src/models/hurricane.ts:37-50`).

**Step 5: Commit**

```bash
git add src/models/simulation-serialization.ts src/models/simulation-serialization.test.ts
git commit -m "Add default and setup-only simulation state builders"
```

---

### Task 3: RunsModel core — records, selection, completion

**Files:**
- Create: `src/models/runs.ts`
- Create: `src/models/runs.test.ts`
- Modify: `src/types/interactive-state.ts` (add `IRunState`)
- Modify: `src/models/stores.ts`
- Modify: `src/models/stores.test.ts`

**Step 1: Write the failing tests**

Create `src/models/runs.test.ts`:

```ts
import { createStores, IStores } from "./stores";

describe("RunsModel", () => {
  let stores: IStores;

  beforeEach(() => {
    stores = createStores();
  });

  it("starts with a single selected run mirroring the simulation", () => {
    const { runs, simulation } = stores;
    expect(runs.runs.length).toBe(1);
    expect(runs.selectedRunId).toBe(runs.runs[0].id);
    expect(runs.selectedRun).toBe(runs.runs[0]);
    expect(runs.runs[0].simulation.season).toBe(simulation.season);
  });

  it("reports completion from the live simulation for the selected run", () => {
    const { runs, simulation } = stores;
    expect(runs.isRunComplete(runs.runs[0])).toBe(false);
    expect(runs.allComplete).toBe(false);
    simulation.simulationFinished = true;
    expect(runs.isRunComplete(runs.runs[0])).toBe(true);
    expect(runs.allComplete).toBe(true);
  });

  describe("selectRun", () => {
    it("snapshots the current run and hydrates the target run", () => {
      const { runs, simulation } = stores;
      const firstId = runs.selectedRunId;
      simulation.season = "winter";
      simulation.simulationStarted = true;
      simulation.simulationFinished = true;
      simulation.hurricaneTrack.push({ position: { lat: 20, lng: -40 }, category: 2 });

      runs.addRun();
      const secondId = runs.selectedRunId;
      expect(secondId).not.toBe(firstId);
      // Live sim now shows the new run's default setup.
      expect(simulation.season).not.toBe("winter");
      expect(simulation.simulationFinished).toBe(false);
      expect(simulation.hurricaneTrack.length).toBe(0);
      // The first run's record kept its outcome.
      const first = runs.runs.find(run => run.id === firstId)!;
      expect(first.simulation.season).toBe("winter");
      expect(first.simulation.simulationFinished).toBe(true);
      expect(first.simulation.hurricaneTrack.length).toBe(1);

      runs.selectRun(firstId);
      expect(runs.selectedRunId).toBe(firstId);
      expect(simulation.season).toBe("winter");
      expect(simulation.simulationFinished).toBe(true);
      expect(simulation.hurricaneTrack.length).toBe(1);
      expect(runs.runs.map(run => run.id)).toEqual([firstId, secondId]);
    });

    it("resets a started-but-unfinished run to setup only when switching away", () => {
      const { runs, simulation } = stores;
      const firstId = runs.selectedRunId;
      simulation.simulationFinished = true;
      runs.addRun();
      const secondId = runs.selectedRunId;
      // Start the second run but don't finish it.
      simulation.simulationStarted = true;
      simulation.simulationFinished = false;
      simulation.hurricaneTrack.push({ position: { lat: 20, lng: -40 }, category: 2 });
      simulation.time = 50;

      runs.selectRun(firstId);

      const second = runs.runs.find(run => run.id === secondId)!;
      expect(second.simulation.simulationStarted).toBe(false);
      expect(second.simulation.hurricaneTrack).toEqual([]);
      expect(second.simulation.time).toBe(0);
    });

    it("ignores unknown ids and reselection of the current run", () => {
      const { runs } = stores;
      const id = runs.selectedRunId;
      runs.selectRun("nope");
      expect(runs.selectedRunId).toBe(id);
      runs.selectRun(id);
      expect(runs.selectedRunId).toBe(id);
      expect(runs.runs.length).toBe(1);
    });
  });
});
```

(`addRun` is implemented in Task 4 — for this task, include a minimal `addRun` as described in Step 3 so these tests compile; its gating tests come later.)

Also update `src/models/stores.test.ts`: add an assertion that `createStores()` returns a `runs` store wired to the simulation (e.g. `expect(stores.runs.runs.length).toBe(1)`).

**Step 2: Run tests to verify they fail**

Run: `npx jest src/models/runs.test.ts`
Expected: FAIL — module `./runs` / `stores.runs` missing.

**Step 3: Implement**

Add to `src/types/interactive-state.ts`:

```ts
/**
 * A single simulation run: its setup and (when finished) its outcome, as one serialized state.
 */
export interface IRunState {
  id: string;
  simulation: ISimulationState;
}
```

Create `src/models/runs.ts`:

```ts
import { action, computed, makeObservable, observable } from "mobx";
import { IRunState, ISimulationState } from "../types/interactive-state";
import {
  applySimulationState, cloneSimulationState, defaultSimulationState, extractSetupState, serializeSimulation
} from "./simulation-serialization";
import { SimulationModel } from "./simulation";

export const maxRuns = 6;

export class RunsModel {
  @observable public runs: IRunState[] = [];
  @observable public selectedRunId = "";
  private simulation: SimulationModel;
  private nextRunNumber = 1;

  constructor(simulation: SimulationModel) {
    makeObservable(this);
    this.simulation = simulation;
    const first: IRunState = { id: this.makeRunId(), simulation: serializeSimulation(simulation) };
    this.runs.push(first);
    this.selectedRunId = first.id;
  }

  @computed public get selectedRun(): IRunState | undefined {
    return this.runs.find(run => run.id === this.selectedRunId);
  }

  // The selected run's record can be stale — the live simulation is its source of truth.
  public isRunComplete(run: IRunState): boolean {
    return run.id === this.selectedRunId
      ? this.simulation.simulationFinished
      : !!run.simulation.simulationFinished;
  }

  @computed public get allComplete(): boolean {
    return this.runs.every(run => this.isRunComplete(run));
  }

  @computed public get atMaxRuns(): boolean {
    return this.runs.length >= maxRuns;
  }

  @computed public get canAddRun(): boolean {
    return this.allComplete && !this.atMaxRuns;
  }

  @action.bound public selectRun(id: string) {
    if (id === this.selectedRunId) return;
    const target = this.runs.find(run => run.id === id);
    if (!target) return;
    this.snapshotSelectedRun();
    this.selectedRunId = id;
    applySimulationState(this.simulation, target.simulation);
  }

  @action.bound public addRun() {
    if (!this.canAddRun) return;
    this.addAndSelect(defaultSimulationState());
  }

  private addAndSelect(state: ISimulationState) {
    this.snapshotSelectedRun();
    const run: IRunState = { id: this.makeRunId(), simulation: state };
    this.runs.push(run);
    this.selectedRunId = run.id;
    applySimulationState(this.simulation, run.simulation);
  }

  // An unselected run is always setup-only or complete, so a started-but-unfinished
  // run loses its partial outcome when snapshotted on switch-away.
  private snapshotSelectedRun() {
    const run = this.selectedRun;
    if (!run) return;
    const state = serializeSimulation(this.simulation);
    run.simulation = state.simulationStarted && !state.simulationFinished
      ? extractSetupState(state)
      : state;
  }

  private makeRunId() {
    return `run-${this.nextRunNumber++}`;
  }
}
```

Update `src/models/stores.ts`:

```ts
import { RunsModel } from "./runs";
import { SimulationModel } from "./simulation";
import { UIModel } from "./ui";

export interface IStores {
  ui: UIModel;
  simulation: SimulationModel;
  runs: RunsModel;
}

export function createStores(): IStores {
  const simulation = new SimulationModel();
  const ui = new UIModel(simulation);
  const runs = new RunsModel(simulation);
  return { ui, simulation, runs };
}
```

**Step 4: Run tests to verify they pass**

Run: `npx jest src/models/runs.test.ts src/models/stores.test.ts`
Expected: PASS.

**Step 5: Run the full model test suite for regressions**

Run: `npx jest src/models`
Expected: PASS.

**Step 6: Commit**

```bash
git add src/models/runs.ts src/models/runs.test.ts src/types/interactive-state.ts src/models/stores.ts src/models/stores.test.ts
git commit -m "Add RunsModel with run records and selection"
```

---

### Task 4: RunsModel — add, duplicate, reset, delete, restore

**Files:**
- Modify: `src/models/runs.ts`
- Modify: `src/models/runs.test.ts`

**Step 1: Write the failing tests**

Append to the `RunsModel` describe block in `src/models/runs.test.ts`. Add `import { maxRuns } from "./runs";` and this helper at the top of the file:

```ts
const completeCurrentRun = (stores: IStores) => {
  stores.simulation.simulationStarted = true;
  stores.simulation.simulationFinished = true;
  stores.simulation.hurricaneTrack.push({ position: { lat: 20, lng: -40 }, category: 2 });
};
```

```ts
describe("addRun", () => {
  it("is gated on all runs being complete", () => {
    const { runs } = stores;
    expect(runs.canAddRun).toBe(false);
    runs.addRun();
    expect(runs.runs.length).toBe(1);

    completeCurrentRun(stores);
    expect(runs.canAddRun).toBe(true);
    runs.addRun();
    expect(runs.runs.length).toBe(2);
    expect(runs.selectedRunId).toBe(runs.runs[1].id);
    expect(runs.canAddRun).toBe(false);
  });

  it("refuses to exceed the maximum number of runs", () => {
    const { runs } = stores;
    for (let i = 0; i < maxRuns + 4; i++) {
      completeCurrentRun(stores);
      runs.addRun();
    }
    expect(runs.runs.length).toBe(maxRuns);
    expect(runs.atMaxRuns).toBe(true);
    expect(runs.canAddRun).toBe(false);
  });
});

describe("duplicateLastRun", () => {
  it("copies the newest run's setup without its outcome", () => {
    const { runs, simulation } = stores;
    simulation.season = "winter";
    simulation.setTemperatureAnomaly("gulf", 2);
    completeCurrentRun(stores);

    runs.duplicateLastRun();

    expect(runs.runs.length).toBe(2);
    expect(runs.selectedRunId).toBe(runs.runs[1].id);
    expect(simulation.season).toBe("winter");
    expect(simulation.temperatureAnomalyAt("gulf")).toBe(2);
    expect(simulation.simulationStarted).toBe(false);
    expect(simulation.simulationFinished).toBe(false);
    expect(simulation.hurricaneTrack.length).toBe(0);
  });
});

describe("resetSelectedRun", () => {
  it("keeps setup and clears the outcome", () => {
    const { runs, simulation } = stores;
    simulation.season = "winter";
    completeCurrentRun(stores);
    runs.resetSelectedRun();
    expect(simulation.season).toBe("winter");
    expect(simulation.simulationStarted).toBe(false);
    expect(simulation.simulationFinished).toBe(false);
    expect(simulation.hurricaneTrack.length).toBe(0);
  });
});

describe("deleteRun", () => {
  const addCompletedRuns = (count: number) => {
    for (let i = 0; i < count; i++) {
      completeCurrentRun(stores);
      stores.runs.addRun();
    }
    completeCurrentRun(stores);
  };

  it("selects the previous run when the selected run is deleted", () => {
    const { runs } = stores;
    addCompletedRuns(2); // runs: [1, 2, 3], 3 selected
    const [first, second, third] = runs.runs.map(run => run.id);
    runs.deleteRun(third);
    expect(runs.runs.map(run => run.id)).toEqual([first, second]);
    expect(runs.selectedRunId).toBe(second);
  });

  it("selects the newest remaining run when the first run is deleted", () => {
    const { runs } = stores;
    addCompletedRuns(2);
    const [first, second, third] = runs.runs.map(run => run.id);
    runs.selectRun(first);
    runs.deleteRun(first);
    expect(runs.runs.map(run => run.id)).toEqual([second, third]);
    expect(runs.selectedRunId).toBe(third);
  });

  it("keeps the selection when an unselected run is deleted", () => {
    const { runs } = stores;
    addCompletedRuns(1);
    const [first, second] = runs.runs.map(run => run.id);
    runs.deleteRun(first);
    expect(runs.runs.map(run => run.id)).toEqual([second]);
    expect(runs.selectedRunId).toBe(second);
  });

  it("replaces a sole run with a fresh default run", () => {
    const { runs, simulation } = stores;
    const originalId = runs.selectedRunId;
    simulation.season = "winter";
    completeCurrentRun(stores);
    runs.deleteRun(originalId);
    expect(runs.runs.length).toBe(1);
    expect(runs.runs[0].id).not.toBe(originalId);
    expect(runs.selectedRunId).toBe(runs.runs[0].id);
    expect(simulation.season).not.toBe("winter");
    expect(simulation.simulationFinished).toBe(false);
  });
});

describe("setRuns", () => {
  it("replaces runs, selects the given run, and hydrates the simulation", () => {
    const { runs, simulation } = stores;
    const stateA = { ...runs.runs[0].simulation, season: "winter" as const };
    const stateB = { ...runs.runs[0].simulation, season: "summer" as const, simulationFinished: true };
    runs.setRuns([
      { id: "run-1", simulation: stateA },
      { id: "run-2", simulation: stateB }
    ], "run-2");
    expect(runs.runs.length).toBe(2);
    expect(runs.selectedRunId).toBe("run-2");
    expect(simulation.season).toBe("summer");
    expect(simulation.simulationFinished).toBe(true);
  });

  it("falls back to the newest run when the selected id is unknown", () => {
    const { runs } = stores;
    const state = runs.runs[0].simulation;
    runs.setRuns([{ id: "run-1", simulation: state }, { id: "run-2", simulation: state }], "missing");
    expect(runs.selectedRunId).toBe("run-2");
  });

  it("continues run ids without collisions after a restore", () => {
    const { runs, simulation } = stores;
    const state = { ...runs.runs[0].simulation, simulationFinished: true };
    runs.setRuns([{ id: "run-7", simulation: state }], "run-7");
    simulation.simulationFinished = true;
    runs.addRun();
    expect(runs.runs[1].id).toBe("run-8");
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx jest src/models/runs.test.ts`
Expected: FAIL — `duplicateLastRun`, `resetSelectedRun`, `deleteRun`, `setRuns` missing.

**Step 3: Implement**

Add to `RunsModel`:

```ts
@action.bound public duplicateLastRun() {
  if (!this.canAddRun) return;
  // Snapshot first so a stale selected-run record can't be duplicated.
  this.snapshotSelectedRun();
  const last = this.runs[this.runs.length - 1];
  this.addAndSelect(extractSetupState(last.simulation));
}

@action.bound public resetSelectedRun() {
  this.simulation.restart();
}

@action.bound public deleteRun(id: string) {
  const index = this.runs.findIndex(run => run.id === id);
  if (index === -1) return;
  if (this.runs.length === 1) {
    // There is never zero runs — deleting the sole run resets it to the default setup.
    const replacement: IRunState = { id: this.makeRunId(), simulation: defaultSimulationState() };
    this.runs[0] = replacement;
    this.selectedRunId = replacement.id;
    applySimulationState(this.simulation, replacement.simulation);
    return;
  }
  const wasSelected = id === this.selectedRunId;
  this.runs.splice(index, 1);
  if (wasSelected) {
    const target = index > 0 ? this.runs[index - 1] : this.runs[this.runs.length - 1];
    this.selectedRunId = target.id;
    applySimulationState(this.simulation, target.simulation);
  }
}

@action.bound public setRuns(runs: IRunState[], selectedRunId?: string) {
  if (!runs.length) return;
  this.runs = runs.map(run => ({ id: run.id, simulation: cloneSimulationState(run.simulation) }));
  const selected = this.runs.find(run => run.id === selectedRunId) ?? this.runs[this.runs.length - 1];
  this.selectedRunId = selected.id;
  this.nextRunNumber = this.runs.reduce((max, run) => {
    const num = parseInt(run.id.replace(/^run-/, ""), 10);
    return isFinite(num) && num >= max ? num + 1 : max;
  }, this.nextRunNumber);
  applySimulationState(this.simulation, selected.simulation);
}
```

**Step 4: Run tests to verify they pass**

Run: `npx jest src/models/runs.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/models/runs.ts src/models/runs.test.ts
git commit -m "Add run management operations to RunsModel"
```

---

### Task 5: Interactive state version 2

**Files:**
- Modify: `src/types/interactive-state.ts`
- Modify: `src/models/interactive-state.ts`
- Modify: `src/models/interactive-state.test.ts`

**Step 1: Update the types**

In `src/types/interactive-state.ts`, rename the current top-level interface and add v2:

```ts
/**
 * Version 1 interactive state (single run). Kept for migration.
 */
export interface IHurricaneInteractiveStateV1 {
  version: 1;
  mode?: AppMode;
  simulation: ISimulationState;
  ui: IUIState;
}

/**
 * Complete interactive state saved to LARA.
 * This represents student work that can be saved and restored.
 */
export interface IHurricaneInteractiveState {
  version: 2;
  mode?: AppMode;
  runs: IRunState[];
  selectedRunId: string;
  ui: IUIState;
}
```

**Step 2: Write the failing tests**

Rework `src/models/interactive-state.test.ts`:
- The "returns state unchanged if version is current" test: build a v2 state (wrap the existing `simulation` fixture as `runs: [{ id: "run-1", simulation: ... }]`, `selectedRunId: "run-1"`, `version: 2`) and assert it passes through unchanged.
- Add a v1 → v2 migration test:

```ts
it("migrates v1 state by wrapping the simulation as a single run", () => {
  const v1State = { version: 1, simulation: v1SimulationFixture, ui: uiFixture };
  const migrated = migrateState(v1State);
  expect(migrated?.version).toBe(2);
  expect(migrated?.runs).toEqual([{ id: "run-1", simulation: v1SimulationFixture }]);
  expect(migrated?.selectedRunId).toBe("run-1");
  expect(migrated?.ui).toEqual(uiFixture);
});
```

- Update the legacy-state test to expect `version === 2` and a single wrapped run.
- Update `getInteractiveState` tests: `state.version` is 2; the simulation assertions move to `state.runs[0].simulation`; add `expect(state.selectedRunId).toBe(stores.runs.selectedRunId)`.
- Add a multi-run round trip:

```ts
it("round-trips multiple runs through get/setInteractiveState", () => {
  const source = createStores();
  source.simulation.season = "winter";
  source.simulation.simulationStarted = true;
  source.simulation.simulationFinished = true;
  source.runs.addRun();
  const saved = JSON.parse(JSON.stringify(getInteractiveState(source)));
  expect(saved.runs.length).toBe(2);

  const target = createStores();
  setInteractiveState(target, saved);
  expect(target.runs.runs.map((r: any) => r.id)).toEqual(source.runs.runs.map(r => r.id));
  expect(target.runs.selectedRunId).toBe(source.runs.selectedRunId);
  expect(target.runs.runs[0].simulation.season).toBe("winter");
  expect(target.simulation.simulationFinished).toBe(false); // selected (second) run is fresh
});
```

- Add a stale-record test proving the selected run is serialized live:

```ts
it("serializes the selected run from the live simulation", () => {
  const stores = createStores();
  stores.simulation.season = "winter";
  const state = getInteractiveState(stores);
  expect(state.runs[0].simulation.season).toBe("winter");
});
```

**Step 3: Run tests to verify they fail**

Run: `npx jest src/models/interactive-state.test.ts`
Expected: FAIL (type errors and assertion failures).

**Step 4: Implement**

In `src/models/interactive-state.ts`:

```ts
import { toJS } from "mobx";
import config from "../config";
import { appModes } from "../types";
import {
  IHurricaneInteractiveState, IHurricaneInteractiveStateV1
} from "../types/interactive-state";
import { serializeSimulation } from "./simulation-serialization";
import { IStores } from "./stores";

const CURRENT_VERSION = 2;

export function migrateState(state: unknown): IHurricaneInteractiveState | null {
  if (!state || typeof state !== "object") {
    return null;
  }
  const rawState = state as Record<string, unknown>;
  if (!("version" in rawState)) {
    const legacy = migrateLegacyState(rawState);
    return legacy ? migrateV1ToV2(legacy) : null;
  }
  const version = rawState.version;
  if (version === CURRENT_VERSION) {
    return state as IHurricaneInteractiveState;
  }
  if (version === 1) {
    return migrateV1ToV2(state as IHurricaneInteractiveStateV1);
  }
  // eslint-disable-next-line no-console
  console.warn(`Unknown interactive state version: ${version}. Using defaults.`);
  return null;
}

function migrateLegacyState(rawState: Record<string, unknown>): IHurricaneInteractiveStateV1 | null {
  // ... unchanged body, now typed as V1 ...
}

function migrateV1ToV2(state: IHurricaneInteractiveStateV1): IHurricaneInteractiveState {
  return {
    version: 2,
    mode: state.mode,
    runs: [{ id: "run-1", simulation: state.simulation }],
    selectedRunId: "run-1",
    ui: state.ui
  };
}
```

`setInteractiveState`: replace the simulation block with

```ts
if (state.mode != null && appModes.includes(state.mode)) config.mode = state.mode;

if (state.runs?.length) {
  stores.runs.setRuns(state.runs, state.selectedRunId);
}

// Restore UI state
// ... unchanged ...
```

`getInteractiveState` (keep the IMPORTANT unconditional-reads comment):

```ts
export function getInteractiveState(stores: IStores): IHurricaneInteractiveState {
  const { runs, simulation, ui } = stores;
  return {
    version: 2,
    mode: config.mode,
    runs: runs.runs.map(run => ({
      id: run.id,
      // The selected run's record can be stale; the live simulation is its source of truth.
      simulation: run.id === runs.selectedRunId ? serializeSimulation(simulation) : toJS(run.simulation)
    })),
    selectedRunId: runs.selectedRunId,
    ui: {
      // ... unchanged ...
    }
  };
}
```

(`toJS` matters: unselected records are MobX observables and must be converted to plain objects before being handed to the LARA API / structured clone.)

**Step 5: Run tests to verify they pass**

Run: `npx jest src/models`
Expected: PASS.

**Step 6: Type-check the whole app**

Run: `npx tsc --noEmit -p .` (or `npm run lint:unused` which runs tsc)
Expected: no errors — `cloud-storage.ts`, `app.tsx`, and `lara-app-wrapper.tsx` only pass these types through, so no call-site changes should be needed.

**Step 7: Commit**

```bash
git add src/types/interactive-state.ts src/models/interactive-state.ts src/models/interactive-state.test.ts
git commit -m "Save runs in interactive state (version 2)"
```

---

### Task 6: Display finished runs on the map

Gray tracks for unselected finished runs, below the selected run's live track; hover darkens; click selects. No Jest test (react-leaflet layers need a live map — this repo has no map-layer unit tests); model behavior is already covered, rendering is verified manually in Task 9.

**Files:**
- Create: `src/components/run-tracks.tsx`
- Create: `src/components/run-tracks.scss`
- Modify: `src/components/map-view.tsx`

**Step 1: Create the styles**

`src/components/run-tracks.scss`:

```scss
:export {
  trackColor: #e8e8e8;
  trackHoverColor: #a8a8a8;
  borderColor: #797979;
}
```

(Colors are exported to JS because Leaflet cannot update a path's `className` after creation — hover styling must go through `pathOptions.color`. No cursor rule is needed: Leaflet's own stylesheet already applies `cursor: pointer` to interactive paths via `.leaflet-interactive`.)

**Step 2: Create the component**

`src/components/run-tracks.tsx`:

```tsx
import { observer } from "mobx-react";
import React, { useState } from "react";
import { Pane, Polyline } from "react-leaflet";

import { log } from "../log";
import { IRunState } from "../types/interactive-state";
import { useStores } from "../stores-context";

import css from "./run-tracks.scss";

const trackWeight = 5;
const borderWeight = 7;

export const RunTracks = observer(function RunTracks() {
  const { runs, simulation, ui } = useStores();
  const [hoveredRunId, setHoveredRunId] = useState<string | null>(null);

  const unselectedFinishedRuns = runs.runs.filter(run =>
    run.id !== runs.selectedRunId && run.simulation.simulationFinished);

  const positions = (run: IRunState) => [
    ...run.simulation.hurricaneTrack.map(point => point.position),
    run.simulation.hurricane.center
  ];

  const eventHandlers = (run: IRunState) => ({
    click: () => {
      if (simulation.simulationRunning || ui.isReportMode) return;
      runs.selectRun(run.id);
      ui.setNorthAtlanticView();
      log("RunSelected", { runId: run.id, via: "map" });
    },
    mouseover: () => setHoveredRunId(run.id),
    mouseout: () => setHoveredRunId(current => (current === run.id ? null : current))
  });

  // Two panes so every border renders below every track fill. Both sit under
  // overlayPane (z 400) and shadowPane (z 500), which hold the selected run's track.
  return (
    <>
      <Pane name="unselectedTrackBorders" style={{ zIndex: 380 }}>
        {unselectedFinishedRuns.map(run =>
          <Polyline
            key={run.id}
            positions={positions(run)}
            eventHandlers={eventHandlers(run)}
            pathOptions={{
              bubblingMouseEvents: false,
              color: css.borderColor,
              weight: borderWeight
            }}
          />
        )}
      </Pane>
      <Pane name="unselectedTracks" style={{ zIndex: 390 }}>
        {unselectedFinishedRuns.map(run =>
          <Polyline
            key={run.id}
            positions={positions(run)}
            eventHandlers={eventHandlers(run)}
            pathOptions={{
              bubblingMouseEvents: false,
              color: hoveredRunId === run.id ? css.trackHoverColor : css.trackColor,
              weight: trackWeight
            }}
          />
        )}
      </Pane>
    </>
  );
});
```

Notes for the implementer:
- Runs render in array order = chronological order (oldest first → oldest bottom). Newly finished or reselected runs remount (their key set changes group), which keeps ordering correct.
- `bubblingMouseEvents: false` stops a track click from also firing the map's click handler (which would pin the thermometer / log `MapClicked`).
- `via: "map"` vs `"panel"` distinguishes the two selection affordances in the log (documented in Task 8).

**Step 3: Render it from MapView**

In `src/components/map-view.tsx`: `import { RunTracks } from "./run-tracks";` and render `<RunTracks />` on the line directly before `<HurricaneTrack />` (line ~202).

**Step 4: Verify compilation and lint**

Run: `npm run lint && npx tsc --noEmit -p .`
Expected: clean. (Full visual verification happens in Task 9.)

**Step 5: Commit**

```bash
git add src/components/run-tracks.tsx src/components/run-tracks.scss src/components/map-view.tsx
git commit -m "Display finished runs as selectable gray tracks"
```

---

### Task 7: Run panel component

One panel per run in the setup panel: click to select; selected panel shows Reset (disabled until complete) and Delete buttons.

**Files:**
- Create: `src/components/left-panel/run-panel.tsx`
- Create: `src/components/left-panel/run-panel.scss`
- Create: `src/components/left-panel/run-panel.test.tsx`

**Step 1: Write the failing test**

`src/components/left-panel/run-panel.test.tsx`:

```tsx
import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import { createStores, IStores } from "../../models/stores";
import { StoresContext } from "../../stores-context";
import { RunPanel } from "./run-panel";

const renderPanels = (stores: IStores) =>
  render(
    <StoresContext value={stores}>
      {stores.runs.runs.map(run => <RunPanel key={run.id} run={run} />)}
    </StoresContext>
  );

const completeCurrentRun = (stores: IStores) => {
  stores.simulation.simulationStarted = true;
  stores.simulation.simulationFinished = true;
  stores.simulation.hurricaneTrack.push({ position: { lat: 20, lng: -40 }, category: 2 });
};

describe("RunPanel", () => {
  let stores: IStores;

  beforeEach(() => {
    stores = createStores();
  });

  it("shows reset and delete buttons only on the selected panel", () => {
    completeCurrentRun(stores);
    stores.runs.addRun();
    renderPanels(stores);

    const panels = screen.getAllByTestId("run-panel");
    expect(panels.length).toBe(2);
    expect(panels[0]).not.toHaveClass("selected");
    expect(panels[1]).toHaveClass("selected");
    expect(screen.getAllByTestId("reset-run-button").length).toBe(1);
    expect(screen.getAllByTestId("delete-run-button").length).toBe(1);
  });

  it("selects a run when its panel is clicked", () => {
    completeCurrentRun(stores);
    stores.runs.addRun();
    renderPanels(stores);

    expect(stores.runs.selectedRunId).toBe(stores.runs.runs[1].id);
    fireEvent.click(screen.getAllByTestId("run-panel")[0]);
    expect(stores.runs.selectedRunId).toBe(stores.runs.runs[0].id);
  });

  it("disables reset until the run is complete", () => {
    renderPanels(stores);
    expect(screen.getByTestId("reset-run-button")).toBeDisabled();
  });

  it("resets a completed run, keeping its setup", () => {
    stores.simulation.season = "winter";
    completeCurrentRun(stores);
    renderPanels(stores);

    fireEvent.click(screen.getByTestId("reset-run-button"));
    expect(stores.simulation.simulationFinished).toBe(false);
    expect(stores.simulation.hurricaneTrack.length).toBe(0);
    expect(stores.simulation.season).toBe("winter");
  });

  it("deletes the run", () => {
    completeCurrentRun(stores);
    stores.runs.addRun();
    renderPanels(stores);

    fireEvent.click(screen.getByTestId("delete-run-button"));
    expect(stores.runs.runs.length).toBe(1);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/components/left-panel/run-panel.test.tsx`
Expected: FAIL — module not found.

**Step 3: Implement the component**

`src/components/left-panel/run-panel.tsx`:

```tsx
import { clsx } from "clsx";
import { observer } from "mobx-react";
import React from "react";

import { log } from "../../log";
import { IRunState } from "../../types/interactive-state";
import { useStores } from "../../stores-context";

import DeleteIcon from "../../assets/left-panel/delete.svg";
import RestartIcon from "../../assets/restart.svg";

import css from "./run-panel.scss";

interface IRunPanelProps {
  run: IRunState;
}

export const RunPanel = observer(function RunPanel({ run }: IRunPanelProps) {
  const { runs, simulation, ui } = useStores();
  const selected = run.id === runs.selectedRunId;
  const complete = runs.isRunComplete(run);

  const handleSelect = () => {
    if (selected) return;
    runs.selectRun(run.id);
    ui.setNorthAtlanticView();
    log("RunSelected", { runId: run.id, via: "panel" });
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleSelect();
    }
  };

  const handleReset = (event: React.MouseEvent) => {
    event.stopPropagation();
    log("SimulationEnded", { reason: "RunReset", outcome: simulation.getOutcomeData() });
    runs.resetSelectedRun();
    ui.setNorthAtlanticView();
    log("RunReset", { runId: run.id });
  };

  const handleDelete = (event: React.MouseEvent) => {
    event.stopPropagation();
    runs.deleteRun(run.id);
    ui.setNorthAtlanticView();
    log("RunDeleted", { runId: run.id });
  };

  return (
    <div
      className={clsx(css.runPanel, { [css.selected]: selected })}
      data-test="run-panel"
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={handleSelect}
      onKeyDown={handleKeyDown}
    >
      {selected &&
        <div className={css.runButtons}>
          <button
            type="button"
            aria-label="Reset run"
            data-test="reset-run-button"
            disabled={!complete}
            onClick={handleReset}
          >
            <RestartIcon />
          </button>
          <button
            type="button"
            aria-label="Delete run"
            data-test="delete-run-button"
            onClick={handleDelete}
          >
            <DeleteIcon />
          </button>
        </div>}
    </div>
  );
});
```

`src/components/left-panel/run-panel.scss`:

```scss
@use "../common" as *;

.runPanel {
  background-color: white;
  border: 2px solid $charcoalMedium;
  border-radius: 7px;
  cursor: pointer;
  margin: 10px 15px;
  min-height: 56px;
  padding: 10px;
  position: relative;

  &:hover:not(.selected) {
    background-color: $hoverColor;
  }

  &:focus-visible {
    outline: 2px solid $charcoal;
    outline-offset: 2px;
  }

  &.selected {
    background-color: #fdedd0;
    border-color: $secondaryColor;
    cursor: default;
  }

  .runButtons {
    display: flex;
    gap: 6px;
    position: absolute;
    right: 8px;
    top: 8px;

    button {
      align-items: center;
      background: none;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      height: 26px;
      justify-content: center;
      padding: 0;
      width: 26px;

      &:hover:not(:disabled) {
        background-color: $secondaryColorHover;
      }

      &:disabled {
        cursor: default;
        opacity: 0.35;
      }

      &:focus-visible {
        outline: 2px solid $charcoal;
        outline-offset: 1px;
      }
    }
  }
}
```

(Panel content beyond the frame and buttons is intentionally empty for now — setup/result summaries come in a later phase. Exact colors/spacing may be fine-tuned against the mockups during Task 9's visual check.)

**Step 4: Run test to verify it passes**

Run: `npx jest src/components/left-panel/run-panel.test.tsx`
Expected: PASS. If `toHaveClass("selected")` fails, check how existing tests assert SCSS-module classes (see `season-section.test.tsx` — Jest's SCSS transform returns the raw class name).

**Step 5: Commit**

```bash
git add src/components/left-panel/run-panel.tsx src/components/left-panel/run-panel.scss src/components/left-panel/run-panel.test.tsx
git commit -m "Add run panel with reset and delete controls"
```

---

### Task 8: Runs section — panel list, footer messages, add buttons

**Files:**
- Create: `src/components/left-panel/runs-section.tsx`
- Create: `src/components/left-panel/runs-section.scss`
- Create: `src/components/left-panel/runs-section.test.tsx`
- Modify: `src/components/left-panel/left-panel.tsx`
- Modify: `LOGGED-EVENTS.md`

**Step 1: Write the failing test**

`src/components/left-panel/runs-section.test.tsx`:

```tsx
import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import { maxRuns } from "../../models/runs";
import { createStores, IStores } from "../../models/stores";
import { StoresContext } from "../../stores-context";
import { RunsSection } from "./runs-section";

const renderSection = (stores: IStores) =>
  render(
    <StoresContext value={stores}>
      <RunsSection />
    </StoresContext>
  );

const completeCurrentRun = (stores: IStores) => {
  stores.simulation.simulationStarted = true;
  stores.simulation.simulationFinished = true;
};

describe("RunsSection", () => {
  let stores: IStores;

  beforeEach(() => {
    stores = createStores();
  });

  it("shows the incomplete message while any run is unfinished", () => {
    renderSection(stores);
    expect(screen.getByTestId("run-panel")).toBeInTheDocument();
    expect(screen.getByTestId("runs-message")).toHaveTextContent("Complete run(s) above to add another run");
    expect(screen.queryByTestId("new-run-button")).toBeNull();
  });

  it("shows add buttons when all runs are complete", () => {
    completeCurrentRun(stores);
    renderSection(stores);
    expect(screen.queryByTestId("runs-message")).toBeNull();
    expect(screen.getByTestId("new-run-button")).toBeInTheDocument();
    expect(screen.getByTestId("duplicate-run-button")).toBeInTheDocument();
  });

  it("adds a default run via New Run", () => {
    stores.simulation.season = "winter";
    completeCurrentRun(stores);
    renderSection(stores);

    fireEvent.click(screen.getByTestId("new-run-button"));
    expect(stores.runs.runs.length).toBe(2);
    expect(stores.simulation.season).not.toBe("winter");
    // The new run is incomplete, so the message returns.
    expect(screen.getByTestId("runs-message")).toHaveTextContent("Complete run(s) above to add another run");
  });

  it("duplicates the last run's setup via Duplicate Last Run", () => {
    stores.simulation.season = "winter";
    completeCurrentRun(stores);
    renderSection(stores);

    fireEvent.click(screen.getByTestId("duplicate-run-button"));
    expect(stores.runs.runs.length).toBe(2);
    expect(stores.simulation.season).toBe("winter");
    expect(stores.simulation.simulationFinished).toBe(false);
  });

  it("shows the limit message at the maximum number of complete runs", () => {
    for (let i = 0; i < maxRuns - 1; i++) {
      completeCurrentRun(stores);
      stores.runs.addRun();
    }
    completeCurrentRun(stores);
    renderSection(stores);

    expect(screen.getAllByTestId("run-panel").length).toBe(maxRuns);
    expect(screen.getByTestId("runs-message")).toHaveTextContent("Limit reached - delete a run to add another");
    expect(screen.queryByTestId("new-run-button")).toBeNull();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/components/left-panel/runs-section.test.tsx`
Expected: FAIL — module not found.

**Step 3: Implement**

`src/components/left-panel/runs-section.tsx`:

```tsx
import { observer } from "mobx-react";
import React from "react";

import { log } from "../../log";
import { useStores } from "../../stores-context";
import { RunPanel } from "./run-panel";

import css from "./runs-section.scss";

export const RunsSection = observer(function RunsSection() {
  const { runs, ui } = useStores();

  const handleNewRun = () => {
    runs.addRun();
    ui.setNorthAtlanticView();
    log("RunAdded", { runId: runs.selectedRunId });
  };

  const handleDuplicateLastRun = () => {
    const duplicatedRunId = runs.runs[runs.runs.length - 1].id;
    runs.duplicateLastRun();
    ui.setNorthAtlanticView();
    log("RunDuplicated", { runId: runs.selectedRunId, duplicatedRunId });
  };

  return (
    <div className={css.runsSection} data-test="runs-section">
      {runs.runs.map(run => <RunPanel key={run.id} run={run} />)}
      {!runs.allComplete &&
        <div className={css.runsMessage} data-test="runs-message">
          Complete run(s) above to add another run
        </div>}
      {runs.allComplete && runs.atMaxRuns &&
        <div className={css.runsMessage} data-test="runs-message">
          Limit reached - delete a run to add another
        </div>}
      {runs.canAddRun &&
        <div className={css.addRunButtons}>
          <button
            type="button"
            className={css.addRunButton}
            data-test="duplicate-run-button"
            onClick={handleDuplicateLastRun}
          >
            <span className={css.plusIcon} />
            Duplicate Last Run
          </button>
          <button
            type="button"
            className={css.addRunButton}
            data-test="new-run-button"
            onClick={handleNewRun}
          >
            <span className={css.plusIcon} />
            New Run
          </button>
        </div>}
    </div>
  );
});
```

`src/components/left-panel/runs-section.scss`:

```scss
@use "../common" as *;

.runsSection {
  padding-bottom: 10px;
}

.runsMessage {
  color: $charcoal;
  font-style: italic;
  margin: 10px 15px;
  text-align: center;
}

.addRunButtons {
  display: flex;
  gap: 10px;
  margin: 10px 15px;

  .addRunButton {
    align-items: center;
    background-color: white;
    border: 2px dashed $secondaryColor;
    border-radius: 7px;
    color: $charcoal;
    cursor: pointer;
    display: flex;
    flex: 1;
    flex-direction: column;
    font-family: inherit;
    font-size: 14px;
    font-weight: bold;
    gap: 8px;
    padding: 12px 6px;

    &:hover {
      background-color: $secondaryColorLight;
    }

    &:focus-visible {
      outline: 2px solid $charcoal;
      outline-offset: 2px;
    }

    .plusIcon {
      align-items: center;
      background-color: $secondaryColor;
      border-radius: 50%;
      display: flex;
      height: 28px;
      justify-content: center;
      width: 28px;

      &::before {
        content: "+";
        font-size: 22px;
        font-weight: bold;
        line-height: 1;
      }
    }
  }
}
```

In `src/components/left-panel/left-panel.tsx`: import `RunsSection` and render `<RunsSection />` directly after `<PressureSystemsSection />` inside the `List`. No mode gating — the whole panel only exists in storm mode.

**Step 4: Run tests to verify they pass**

Run: `npx jest src/components/left-panel`
Expected: PASS (new tests plus existing section tests).

**Step 5: Document the new log events**

In `LOGGED-EVENTS.md`:
- Add a `## Run Management` section:

```markdown
## Run Management

| Event | Parameters | When |
|-------|-----------|------|
| `RunSelected` | `{ runId, via: "panel" \| "map" }` | User selects a different run by clicking its setup panel or its track on the map |
| `RunAdded` | `{ runId }` | User clicks New Run |
| `RunDuplicated` | `{ runId, duplicatedRunId }` | User clicks Duplicate Last Run (`runId` is the new run, `duplicatedRunId` the run whose setup was copied) |
| `RunReset` | `{ runId }` | User clicks the reset button on the selected run's panel |
| `RunDeleted` | `{ runId }` | User clicks the delete button on the selected run's panel |
```

- In the `SimulationEnded` row, add `"RunReset"` to the list of `reason` values.

**Step 6: Commit**

```bash
git add src/components/left-panel/runs-section.tsx src/components/left-panel/runs-section.scss src/components/left-panel/runs-section.test.tsx src/components/left-panel/left-panel.tsx LOGGED-EVENTS.md
git commit -m "Add run management section to the storm setup panel"
```

---

### Task 9: Manual verification in the running app

**Step 1: Start the dev server**

Run: `npm start` (in the background) and open `http://localhost:8080/?mode=storm&skipDisclaimer=true`.

**Step 2: Walk the feature** (use the `run` skill / browser if available, otherwise ask the user to verify):

1. Open Storm Setup → one run panel, selected, with disabled Reset + enabled Delete; message "Complete run(s) above to add another run".
2. Run the simulation to completion → Reset becomes enabled; message replaced by Duplicate Last Run / New Run buttons.
3. New Run → second panel appears selected; map clears to the new run's default setup; first run's track shows in gray.
4. Change season, run to completion → both tracks visible, selected colored on top.
5. Hover a gray track → whole track darkens, cursor is a pointer; click → that run becomes selected (colored), the other grays out; panel selection follows.
6. Duplicate Last Run → new run carries the last run's setup (check season section).
7. Panel Reset on a completed run → track cleared, setup kept.
8. Delete the selected middle run → previous run becomes selected. Delete the first run while selected → newest remaining becomes selected. Delete down to one run, delete it → fresh default run remains.
9. Create 6 completed runs → "Limit reached - delete a run to add another".
10. Bottom-bar Restart resets the selected run only; gray tracks stay.
11. Reload the page mid-flow (standalone state isn't persisted — to check persistence, verify in the LARA test harness or via `?logMonitor=true` that saved state contains `runs` and `selectedRunId`; alternatively run `JSON.stringify((window as any).stores && require` — simplest is checking `window.stores.runs.runs` in the console after interactions).
12. Hurricane mode (`http://localhost:8080/`) → no behavior change, no runs UI.

**Step 3: Fix anything found, matching the mockup styling** (`docs` screenshots in the PR/issue). Commit fixes as they land.

---

### Task 10: Final verification and cleanup

Use superpowers:verification-before-completion.

**Step 1: Full test suite**

Run: `npx jest`
Expected: all suites pass.

**Step 2: Lint and unused check**

Run: `npm run lint && npm run lint:unused`
Expected: clean.

**Step 3: Production build**

Run: `npm run build`
Expected: succeeds (this also runs `lint:build`, catching stray `console.log`s).

**Step 4: Cypress smoke (optional but recommended)**

Run: `npm run test:cypress`
Expected: existing e2e specs still pass (the left panel gained a section; specs that walk the panel may need selectors checked).

**Step 5: Commit any remaining fixes, then review**

Use superpowers:requesting-code-review against the design doc (`docs/plans/2026-08-21-multiple-runs-design.md`), then superpowers:finishing-a-development-branch.
