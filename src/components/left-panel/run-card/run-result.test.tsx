import { render, screen } from "@testing-library/react";
import React from "react";

import { defaultSimulationState } from "../../../models/simulation-serialization";
import { createStores, IStores } from "../../../models/stores";
import { StoresContext } from "../../../stores-context";
import { INormalizedSimulationState } from "../../../types/interactive-state";
import { RunResult } from "./run-result";

const completedSim = (): INormalizedSimulationState => {
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

const renderResult = (stores: IStores, simulation: INormalizedSimulationState) => {
  stores.runs.setRuns([{ id: "run-1", simulation }], "run-1");
  return render(
    <StoresContext value={stores}>
      <RunResult run={stores.runs.runs[0]} />
    </StoresContext>
  );
};

describe("RunResult", () => {
  let stores: IStores;

  beforeEach(() => {
    stores = createStores();
  });

  it("shows dashes before a run completes", () => {
    renderResult(stores, defaultSimulationState());
    expect(screen.getAllByText("—").length).toBe(3);
  });

  it("shows the peak category", () => {
    renderResult(stores, completedSim());
    expect(screen.getByTestId("result-peak-category")).toHaveTextContent("Cat 3");
  });

  it("shows the landfall count", () => {
    renderResult(stores, completedSim());
    expect(screen.getByTestId("result-landfalls")).toHaveTextContent("1×");
  });

  it("shows None when there were no landfalls", () => {
    const sim = completedSim();
    sim.landfalls = [];
    renderResult(stores, sim);
    expect(screen.getByTestId("result-landfalls")).toHaveTextContent("None");
  });

  it("renders the category sparkline for a completed run", () => {
    renderResult(stores, completedSim());
    expect(screen.getByTestId("result-category-over-time").querySelector("polyline")).toBeInTheDocument();
  });
});
