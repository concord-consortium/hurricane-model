import { render, screen } from "@testing-library/react";
import React from "react";

import { defaultSimulationState } from "../../../models/simulation-serialization";
import { RunResult } from "./run-result";

const completedSim = () => {
  const sim = defaultSimulationState();
  sim.hurricaneTrack = [
    { position: { lat: 20, lng: -40 }, category: 1 },
    { position: { lat: 22, lng: -42 }, category: 3 }
  ];
  sim.landfalls = [{ position: { lat: 22, lng: -42 }, category: 3 }];
  return sim;
};

describe("RunResult", () => {
  it("shows dashes before a run completes", () => {
    render(<RunResult result={null} runId="run-1" />);
    expect(screen.getAllByText("—").length).toBe(3);
  });

  it("shows the peak category", () => {
    render(<RunResult result={completedSim()} runId="run-1" />);
    expect(screen.getByTestId("result-peak-category")).toHaveTextContent("Cat 3");
  });

  it("shows the landfall count", () => {
    render(<RunResult result={completedSim()} runId="run-1" />);
    expect(screen.getByTestId("result-landfalls")).toHaveTextContent("1×");
  });

  it("shows None when there were no landfalls", () => {
    const sim = completedSim();
    sim.landfalls = [];
    render(<RunResult result={sim} runId="run-1" />);
    expect(screen.getByTestId("result-landfalls")).toHaveTextContent("None");
  });

  it("renders the category sparkline for a completed run", () => {
    const { container } = render(<RunResult result={completedSim()} runId="run-1" />);
    expect(container.querySelector("polyline")).toBeInTheDocument();
  });
});
