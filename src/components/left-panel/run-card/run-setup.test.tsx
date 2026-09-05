import { render, screen } from "@testing-library/react";
import React from "react";

import { defaultSimulationState } from "../../../models/simulation-serialization";
import { createStores, IStores } from "../../../models/stores";
import { StoresContext } from "../../../stores-context";
import { INormalizedSimulationState } from "../../../types/interactive-state";
import { RunSetup } from "./run-setup";

const renderSetup = (stores: IStores, customize?: (sim: INormalizedSimulationState) => void) => {
  const simulation = defaultSimulationState();
  simulation.startLocation = { lat: 10.5, lng: -20 };
  simulation.season = "fall";
  simulation.hurricane.startingCategory = 3;
  customize?.(simulation);
  stores.runs.setRuns([{ id: "run-1", simulation }], "run-1");
  return render(
    <StoresContext value={stores}>
      <RunSetup run={stores.runs.runs[0]} />
    </StoresContext>
  );
};

describe("RunSetup", () => {
  let stores: IStores;

  beforeEach(() => {
    stores = createStores();
  });

  it("shows the start location as lat/lng", () => {
    renderSetup(stores);
    expect(screen.getByTestId("setup-location")).toHaveTextContent("10.50°N, 20.00°W");
  });

  it("resolves a named start location to its coordinates", () => {
    renderSetup(stores, sim => { sim.startLocation = "gulf"; });
    expect(screen.getByTestId("setup-location")).toHaveTextContent("23.50°N");
  });

  it("shows the starting category", () => {
    renderSetup(stores);
    expect(screen.getByTestId("setup-category")).toHaveTextContent("Cat 3");
  });

  it("shows TS for category 0", () => {
    renderSetup(stores, sim => { sim.hurricane.startingCategory = 0; });
    expect(screen.getByTestId("setup-category")).toHaveTextContent("TS");
  });

  it("shows TS when the category is missing", () => {
    renderSetup(stores, sim => { delete sim.hurricane.startingCategory; });
    expect(screen.getByTestId("setup-category")).toHaveTextContent("TS");
  });

  it("shows the season label", () => {
    renderSetup(stores, sim => { sim.season = "earlyFall"; });
    expect(screen.getByTestId("setup-season")).toHaveTextContent("Early Fall");
  });

  it("shows Baseline when no SST anomalies are set", () => {
    renderSetup(stores);
    expect(screen.getByTestId("setup-anomalies")).toHaveTextContent("Baseline");
  });

  it("lists each nonzero SST anomaly with its region and signed value", () => {
    renderSetup(stores, sim => {
      sim.temperatureAnomalies = { ...sim.temperatureAnomalies, caribbean: 1, centralAtlantic: -2 };
    });
    const anomalies = screen.getByTestId("setup-anomalies");
    expect(anomalies).toHaveTextContent("Caribbean +1 °C");
    expect(anomalies).toHaveTextContent("C. Atlantic −2 °C");
    expect(anomalies).not.toHaveTextContent("Baseline");
    expect(anomalies).not.toHaveTextContent("Gulf");
  });

  it("lists each pressure system with its label, position, and mb value", () => {
    renderSetup(stores);
    const pressure = screen.getByTestId("setup-pressure-systems");
    expect(pressure).toHaveTextContent("H1: Default, 1023 mb");
    expect(pressure).toHaveTextContent("L2: Default, 1007 mb");
  });
});
