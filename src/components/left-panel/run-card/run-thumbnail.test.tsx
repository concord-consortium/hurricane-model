import { render, screen } from "@testing-library/react";
import { act } from "react";
import React from "react";

import { defaultSimulationState } from "../../../models/simulation-serialization";
import { createStores, IStores } from "../../../models/stores";
import { StoresContext } from "../../../stores-context";
import { ISimulationState } from "../../../types/interactive-state";
import { RunThumbnail } from "./run-thumbnail";

const renderThumb = (stores: IStores, sim: ISimulationState = defaultSimulationState()) =>
  render(
    <StoresContext value={stores}>
      <RunThumbnail result={sim} season={sim.season} />
    </StoresContext>
  );

describe("RunThumbnail", () => {
  let stores: IStores;

  beforeEach(() => {
    stores = createStores();
  });

  it("renders an accessible mini-map", () => {
    renderThumb(stores);
    expect(screen.getByRole("img", { name: "Run result map" })).toBeInTheDocument();
  });

  it("draws a track segment per point after the first, plus one for the hurricane location", () => {
    const sim = defaultSimulationState();
    sim.hurricaneTrack = [
      { position: { lat: 20, lng: -40 }, category: 1 },
      { position: { lat: 22, lng: -42 }, category: 2 },
      { position: { lat: 24, lng: -44 }, category: 2 }
    ];
    const { container } = renderThumb(stores, sim);
    expect(container.querySelectorAll("line").length).toBe(3);
  });

  it("marks each pressure system with an H or L", () => {
    // A completed run has its own systems (they're populated when the run starts).
    const sim = defaultSimulationState();
    sim.pressureSystems = sim.pressureSystemsSetup ?? [];
    const { container } = renderThumb(stores, sim);
    const letters = [...container.querySelectorAll("text")].map(t => t.textContent);
    expect(letters.filter(l => l === "H").length).toBe(2);
    expect(letters.filter(l => l === "L").length).toBe(2);
  });

  it("shows the SST overlay images only when the overlay is on", () => {
    stores.ui.setOverlay(null);
    const { container } = renderThumb(stores);
    expect(container.querySelectorAll("image").length).toBe(1);
    act(() => stores.ui.setOverlay("sst"));
    expect(container.querySelectorAll("image").length).toBe(3);
  });
});
