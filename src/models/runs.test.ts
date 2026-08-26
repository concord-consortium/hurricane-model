import { maxRuns } from "./runs";
import { createStores, IStores } from "./stores";
import { PressureSystem } from "./pressure-system";

// Runs the simulation for a tick, then merges the low into the hurricane the way tick() does.
const runAndMergeTheLow = (stores: IStores) => {
  const { simulation } = stores;
  simulation.pressureSystemsSetup = [
    new PressureSystem({ type: "low", center: { lat: 30, lng: -40 }, strength: 10 }),
    new PressureSystem({ type: "high", center: { lat: 20, lng: -60 }, strength: 8 })
  ];
  simulation.start();
  simulation.stop();
  simulation.removePressureSystem(simulation.activePressureSystems[0]);
  simulation.simulationFinished = true;
};

const systemTypes = (stores: IStores) => stores.simulation.activePressureSystems.map(ps => ps.type);

const completeCurrentRun = (stores: IStores) => {
  stores.simulation.simulationStarted = true;
  stores.simulation.simulationFinished = true;
  stores.simulation.hurricaneTrack.push({ position: { lat: 20, lng: -40 }, category: 2 });
};

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

  describe("duplicateSelectedRun", () => {
    it("copies the selected run's setup without its outcome", () => {
      const { runs, simulation } = stores;
      simulation.season = "winter";
      simulation.setTemperatureAnomaly("gulf", 2);
      completeCurrentRun(stores);

      runs.duplicateSelectedRun();

      expect(runs.runs.length).toBe(2);
      expect(runs.selectedRunId).toBe(runs.runs[1].id);
      expect(simulation.season).toBe("winter");
      expect(simulation.temperatureAnomalyAt("gulf")).toBe(2);
      expect(simulation.simulationStarted).toBe(false);
      expect(simulation.simulationFinished).toBe(false);
      expect(simulation.hurricaneTrack.length).toBe(0);
    });

    it("copies the older run's setup when an older run is selected", () => {
      const { runs, simulation } = stores;
      const firstId = runs.selectedRunId;
      simulation.season = "winter";
      completeCurrentRun(stores);
      runs.addRun();
      simulation.season = "summer";
      completeCurrentRun(stores);
      runs.selectRun(firstId);

      runs.duplicateSelectedRun();

      expect(runs.runs.length).toBe(3);
      expect(runs.selectedRunId).toBe(runs.runs[2].id);
      expect(simulation.season).toBe("winter");
      expect(simulation.simulationStarted).toBe(false);
    });

    it("is a no-op when runs are incomplete", () => {
      const { runs } = stores;
      runs.duplicateSelectedRun();
      expect(runs.runs.length).toBe(1);
    });

    it("copies the setup, not the systems the run merged away", () => {
      const { runs } = stores;
      runAndMergeTheLow(stores);

      runs.duplicateSelectedRun();

      expect(systemTypes(stores)).toEqual(["low", "high"]);
    });
  });

  describe("pressure systems across runs", () => {
    it("shows a finished run's own systems, and rewinds to the setup on reset", () => {
      const { runs, simulation } = stores;
      runAndMergeTheLow(stores);
      const firstId = runs.selectedRunId;

      runs.addRun();
      runs.selectRun(firstId);
      // Reselecting the finished run shows the systems that produced its track, not its setup.
      expect(systemTypes(stores)).toEqual(["high"]);

      runs.resetSelectedRun();
      expect(simulation.simulationStarted).toBe(false);
      expect(systemTypes(stores)).toEqual(["low", "high"]);
    });

    it("keeps each run's systems separate when switching between them", () => {
      const { runs } = stores;
      runAndMergeTheLow(stores);
      const firstId = runs.selectedRunId;

      runs.addRun();
      // The new run starts from the default setup and hasn't run.
      expect(systemTypes(stores)).not.toEqual(["high"]);
      const secondSetup = systemTypes(stores);

      runs.selectRun(firstId);
      expect(systemTypes(stores)).toEqual(["high"]);
      runs.selectRun(runs.runs[1].id);
      expect(systemTypes(stores)).toEqual(secondSetup);
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

  describe("reset", () => {
    it("discards all saved runs and keeps a single run mirroring the simulation", () => {
      const { runs, simulation } = stores;
      completeCurrentRun(stores);
      runs.addRun();
      completeCurrentRun(stores);
      runs.addRun();
      expect(runs.runs.length).toBe(3);

      simulation.reset();
      runs.reset();
      expect(runs.runs.length).toBe(1);
      expect(runs.selectedRunId).toBe(runs.runs[0].id);
      expect(runs.runs[0].simulation.simulationFinished).toBe(false);
      expect(runs.runs[0].simulation.hurricaneTrack.length).toBe(0);
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

    it("fills partial and missing simulation records from the defaults", () => {
      const { runs } = stores;
      runs.setRuns([
        { id: "run-1", simulation: { simulationStarted: true, simulationFinished: true } as any },
        { id: "run-2", simulation: undefined as any }
      ], "run-2");
      const [first, second] = runs.runs;
      expect(first.simulation.simulationFinished).toBe(true);
      expect(first.simulation.hurricaneTrack).toEqual([]);
      expect(first.simulation.landfalls).toEqual([]);
      expect(first.simulation.hurricane.center).toBeDefined();
      expect(second.simulation.simulationFinished).toBe(false);
      expect(second.simulation.hurricane.center).toBeDefined();
    });

    it("ignores an empty runs array", () => {
      const { runs } = stores;
      const originalId = runs.selectedRunId;
      runs.setRuns([], "x");
      expect(runs.runs.length).toBe(1);
      expect(runs.selectedRunId).toBe(originalId);
    });
  });

  it("ignores deleteRun with an unknown id", () => {
    const { runs } = stores;
    const originalId = runs.selectedRunId;
    runs.deleteRun("unknown");
    expect(runs.runs.map(run => run.id)).toEqual([originalId]);
    expect(runs.selectedRunId).toBe(originalId);
  });
});
