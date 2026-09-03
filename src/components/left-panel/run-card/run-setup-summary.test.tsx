import { render, screen } from "@testing-library/react";
import React from "react";

import { selectPressureSystems } from "../../../config";
import { IRunSetup, RunSetupSummary } from "./run-setup-summary";

const baseSetup = (): IRunSetup => ({
  season: "fall",
  startLocation: { lat: 10.5, lng: -20 },
  startingCategory: 3,
  pressureSystems: selectPressureSystems("atlantic").map(ps => ({ ...ps, center: { ...ps.center } })),
  temperatureAnomalies: {}
});

describe("RunSetupSummary", () => {
  it("shows the start location as lat/lng", () => {
    render(<RunSetupSummary setup={baseSetup()} />);
    expect(screen.getByTestId("setup-location")).toHaveTextContent("10.50°N, 20.00°W");
  });

  it("resolves a named start location to its coordinates", () => {
    render(<RunSetupSummary setup={{ ...baseSetup(), startLocation: "atlantic" }} />);
    expect(screen.getByTestId("setup-location")).toHaveTextContent("°N");
  });

  it("shows the starting category", () => {
    render(<RunSetupSummary setup={baseSetup()} />);
    expect(screen.getByTestId("setup-category")).toHaveTextContent("Cat 3");
  });

  it("shows TS for category 0 and when the category is missing", () => {
    const { rerender } = render(<RunSetupSummary setup={{ ...baseSetup(), startingCategory: 0 }} />);
    expect(screen.getByTestId("setup-category")).toHaveTextContent("TS");
    rerender(<RunSetupSummary setup={{ ...baseSetup(), startingCategory: undefined }} />);
    expect(screen.getByTestId("setup-category")).toHaveTextContent("TS");
  });

  it("shows the season label", () => {
    render(<RunSetupSummary setup={{ ...baseSetup(), season: "earlyFall" }} />);
    expect(screen.getByTestId("setup-season")).toHaveTextContent("Early Fall");
  });

  it("shows Baseline when no SST anomalies are set", () => {
    render(<RunSetupSummary setup={baseSetup()} />);
    expect(screen.getByTestId("setup-anomalies")).toHaveTextContent("Baseline");
  });

  it("lists each nonzero SST anomaly with its region and signed value", () => {
    render(<RunSetupSummary setup={{ ...baseSetup(), temperatureAnomalies: { caribbean: 1, centralAtlantic: -2 } }} />);
    const anomalies = screen.getByTestId("setup-anomalies");
    expect(anomalies).toHaveTextContent("Caribbean +1 °C");
    expect(anomalies).toHaveTextContent("C. Atlantic −2 °C");
    expect(anomalies).not.toHaveTextContent("Baseline");
    expect(anomalies).not.toHaveTextContent("Gulf");
  });

  it("lists each pressure system with its label, position, and mb value", () => {
    render(<RunSetupSummary setup={baseSetup()} />);
    const pressure = screen.getByTestId("setup-pressure-systems");
    expect(pressure).toHaveTextContent("H1: Default, 1023 mb");
    expect(pressure).toHaveTextContent("L2: Default, 1007 mb");
  });
});
