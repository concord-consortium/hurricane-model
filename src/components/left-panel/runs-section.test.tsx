import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import { log } from "../../log";
import { maxRuns } from "../../models/runs";
import { createStores, IStores } from "../../models/stores";
import { StoresContext } from "../../stores-context";
import { RunsSection } from "./runs-section";

jest.mock("../../log", () => ({
  log: jest.fn()
}));
const mockLog = log as jest.Mock;

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
    mockLog.mockClear();
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
    expect(mockLog).toHaveBeenCalledWith("RunAdded", { runId: stores.runs.runs[1].id });
  });

  it("duplicates the last run's setup via Duplicate Last Run", () => {
    stores.simulation.season = "winter";
    completeCurrentRun(stores);
    renderSection(stores);

    const duplicatedRunId = stores.runs.runs[0].id;
    fireEvent.click(screen.getByTestId("duplicate-run-button"));
    expect(stores.runs.runs.length).toBe(2);
    expect(stores.simulation.season).toBe("winter");
    expect(stores.simulation.simulationFinished).toBe(false);
    expect(mockLog).toHaveBeenCalledWith("RunDuplicated", { runId: stores.runs.runs[1].id, duplicatedRunId });
  });

  it("duplicates the last run even when an earlier run is selected", () => {
    stores.simulation.season = "winter";
    completeCurrentRun(stores);
    stores.runs.addRun();
    stores.simulation.season = "summer";
    completeCurrentRun(stores);
    stores.runs.selectRun(stores.runs.runs[0].id);
    renderSection(stores);

    fireEvent.click(screen.getByTestId("duplicate-run-button"));
    expect(stores.runs.runs.length).toBe(3);
    expect(stores.simulation.season).toBe("summer");
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
