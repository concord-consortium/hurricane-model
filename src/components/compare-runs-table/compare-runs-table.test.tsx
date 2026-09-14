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
      stored.pressureSystems = [];
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
      expect(screen.getAllByTestId("compare-cell-anomalies")[1]).toHaveTextContent("Baseline");
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
