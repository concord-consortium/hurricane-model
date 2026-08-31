import * as React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { runInAction } from "mobx";

import { defaultSimulationState } from "../../models/simulation-serialization";
import { createStores, IStores } from "../../models/stores";
import { StoresContext } from "../../stores-context";
import { RunCard } from "./run-card";

const renderPanels = (stores: IStores) =>
  render(
    <StoresContext value={stores}>
      {stores.runs.runs.map(run => <RunCard key={run.id} run={run} />)}
    </StoresContext>
  );

const completeCurrentRun = (stores: IStores) => {
  stores.simulation.simulationStarted = true;
  stores.simulation.simulationFinished = true;
  stores.simulation.hurricaneTrack.push({ position: { lat: 20, lng: -40 }, category: 2 });
};

describe("RunCard", () => {
  let stores: IStores;

  beforeEach(() => {
    stores = createStores();
  });

  it("shows reset and delete buttons only on the selected panel", () => {
    completeCurrentRun(stores);
    stores.runs.addRun();
    renderPanels(stores);

    const panels = screen.getAllByTestId("run-card");
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
    fireEvent.click(screen.getAllByTestId("run-card")[0]);
    expect(stores.runs.selectedRunId).toBe(stores.runs.runs[0].id);
  });

  // A teacher opening a report must not destroy a run the student left mid-simulation.
  it("keeps an in-progress run intact when another panel is clicked in report mode", () => {
    const inProgress = defaultSimulationState();
    inProgress.simulationStarted = true;
    inProgress.time = 50;
    inProgress.hurricaneTrack = [{ position: { lat: 20, lng: -40 }, category: 2 }] as any;
    const finished = defaultSimulationState();
    finished.simulationStarted = true;
    finished.simulationFinished = true;
    stores.runs.setRuns(
      [{ id: "run-1", simulation: finished }, { id: "run-2", simulation: inProgress }], "run-2"
    );
    stores.ui.setMode("report");
    renderPanels(stores);

    fireEvent.click(screen.getAllByTestId("run-card")[0]);
    expect(stores.runs.selectedRunId).toBe("run-1");
    expect(stores.runs.runs[1].simulation.hurricaneTrack.length).toBe(1);

    fireEvent.click(screen.getAllByTestId("run-card")[1]);
    expect(stores.simulation.simulationStarted).toBe(true);
    expect(stores.simulation.simulationFinished).toBe(false);
    expect(stores.simulation.hurricaneTrack.length).toBe(1);
    expect(stores.simulation.time).toBe(50);
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

    const panels = screen.getAllByTestId("run-card");
    expect(panels[0]).toHaveAttribute("aria-label", "Run 1");
    expect(panels[1]).toHaveAttribute("aria-label", "Run 2, Not run yet - editable");
  });

  it("selects a run with Enter or Space on a focused panel", async () => {
    const user = userEvent.setup();
    completeCurrentRun(stores);
    stores.runs.addRun();
    renderPanels(stores);

    const firstRunId = stores.runs.runs[0].id;
    screen.getAllByTestId("run-card")[0].focus();
    await user.keyboard("{Enter}");
    expect(stores.runs.selectedRunId).toBe(firstRunId);

    screen.getAllByTestId("run-card")[1].focus();
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

  describe("status message", () => {
    it("says the run is editable before it starts", () => {
      renderPanels(stores);
      expect(screen.getByTestId("run-status")).toHaveTextContent("Not run yet - editable");
    });

    it("says the run is running once the simulation starts", () => {
      stores.simulation.simulationRunning = true;
      stores.simulation.simulationStarted = true;
      renderPanels(stores);
      expect(screen.getByTestId("run-status")).toHaveTextContent("Running...");
      act(() => runInAction(() => {
        stores.simulation.simulationRunning = false;
      }));
      expect(screen.getByTestId("run-status")).toHaveTextContent("Paused");
    });

    it("is empty once the run is complete", () => {
      completeCurrentRun(stores);
      renderPanels(stores);
      expect(screen.getByTestId("run-status")).toBeEmptyDOMElement();
    });

    it("shows the message only on the selected run", () => {
      completeCurrentRun(stores);
      stores.runs.addRun();
      renderPanels(stores);

      const statuses = screen.getAllByTestId("run-status");
      expect(statuses[0]).toBeEmptyDOMElement();
      expect(statuses[1]).toHaveTextContent("Not run yet - editable");
    });

    it("updates as the simulation starts and finishes", () => {
      renderPanels(stores);
      const status = screen.getByTestId("run-status");
      expect(status).toHaveTextContent("Not run yet - editable");

      act(() => runInAction(() => {
        stores.simulation.simulationRunning = true;
        stores.simulation.simulationStarted = true;
      }));
      expect(status).toHaveTextContent("Running...");

      act(() => runInAction(() => { stores.simulation.simulationFinished = true; }));
      expect(status).toBeEmptyDOMElement();
    });

    it("is labeled for screen readers", () => {
      renderPanels(stores);
      expect(screen.getByTestId("run-status")).toHaveAttribute("aria-label", "Run status");
    });
  });
});
