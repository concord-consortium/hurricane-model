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
      runs.selectRun(id);
      expect(runs.selectedRunId).toBe(id);
      expect(runs.runs.length).toBe(1);
    });
  });
});
