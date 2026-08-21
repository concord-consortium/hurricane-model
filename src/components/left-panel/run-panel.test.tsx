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
