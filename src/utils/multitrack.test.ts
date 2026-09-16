import { runInAction } from "mobx";

import { log } from "../log";
import { defaultSimulationState } from "../models/simulation-serialization";
import { createStores, IStores } from "../models/stores";
import { selectRun } from "./multitrack";

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

// A finished run A and a selected, mid-simulation run B.
const setInProgressRuns = (stores: IStores) => {
  const finished = defaultSimulationState();
  finished.simulationStarted = true;
  finished.simulationFinished = true;
  const inProgress = defaultSimulationState();
  inProgress.simulationStarted = true;
  inProgress.time = 50;
  stores.runs.setRuns([{ id: "run-1", simulation: finished }, { id: "run-2", simulation: inProgress }], "run-2");
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
    setInProgressRuns(stores);
    const restart = jest.spyOn(simulation, "restart");

    selectRun(stores, runs.runs[0], "map");

    expect(restart).toHaveBeenCalled();
    // The abandoned run is stored as setup only.
    expect(runs.runs[1].simulation.simulationStarted).toBe(false);
    expect(runs.runs[1].simulation.time).toBe(0);
  });

  it("leaves an in-progress run intact in read-only mode", () => {
    const { runs, simulation, ui } = stores;
    setInProgressRuns(stores);
    ui.setMode("report");
    const restart = jest.spyOn(simulation, "restart");

    selectRun(stores, runs.runs[0], "map");

    expect(restart).not.toHaveBeenCalled();
    expect(runs.runs[1].simulation.simulationStarted).toBe(true);
    expect(runs.runs[1].simulation.time).toBe(50);
  });
});
