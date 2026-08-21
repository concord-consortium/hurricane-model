import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

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

  it("labels each panel by its run number", () => {
    completeCurrentRun(stores);
    stores.runs.addRun();
    renderPanels(stores);

    const panels = screen.getAllByTestId("run-panel");
    expect(panels[0]).toHaveAttribute("aria-label", "Run 1");
    expect(panels[1]).toHaveAttribute("aria-label", "Run 2");
  });

  it("selects a run with Enter or Space on a focused panel", async () => {
    const user = userEvent.setup();
    completeCurrentRun(stores);
    stores.runs.addRun();
    renderPanels(stores);

    const firstRunId = stores.runs.runs[0].id;
    screen.getAllByTestId("run-panel")[0].focus();
    await user.keyboard("{Enter}");
    expect(stores.runs.selectedRunId).toBe(firstRunId);

    screen.getAllByTestId("run-panel")[1].focus();
    await user.keyboard(" ");
    expect(stores.runs.selectedRunId).toBe(stores.runs.runs[1].id);
  });

  it("deletes with Enter on the focused delete button", async () => {
    const user = userEvent.setup();
    completeCurrentRun(stores);
    stores.runs.addRun();
    renderPanels(stores);

    screen.getByTestId("delete-run-button").focus();
    await user.keyboard("{Enter}");
    expect(stores.runs.runs.length).toBe(1);
  });

  it("resets with Space on the focused reset button", async () => {
    const user = userEvent.setup();
    completeCurrentRun(stores);
    renderPanels(stores);

    screen.getByTestId("reset-run-button").focus();
    await user.keyboard(" ");
    expect(stores.simulation.simulationFinished).toBe(false);
    expect(stores.simulation.hurricaneTrack.length).toBe(0);
  });

  it("deletes the run", () => {
    completeCurrentRun(stores);
    stores.runs.addRun();
    renderPanels(stores);

    fireEvent.click(screen.getByTestId("delete-run-button"));
    expect(stores.runs.runs.length).toBe(1);
  });
});
