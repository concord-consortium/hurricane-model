import * as React from "react";
import { MapContainer } from "react-leaflet";
import { render } from "@testing-library/react";
import { RunTracks } from "./run-tracks";
import { createStores, IStores } from "../models/stores";
import { defaultSimulationState } from "../models/simulation-serialization";
import { StoresContext } from "../stores-context";
import { IRunState } from "../types/interactive-state";

// Leaflet's overlayPane (z-index 400) holds the sea surface temperature image overlay and the
// wind/precipitation canvas layers, so anything below it is both painted over and unreachable by
// the mouse (the canvases have no pointer-events: none).
const OVERLAY_PANE_Z_INDEX = 400;
// Leaflet's shadowPane, which holds the selected run's track.
const SHADOW_PANE_Z_INDEX = 500;

function finishedRun(id: string): IRunState {
  const simulation = defaultSimulationState();
  simulation.simulationStarted = true;
  simulation.simulationFinished = true;
  simulation.hurricaneTrack = [
    { position: { lat: 15, lng: -40 }, category: 1 },
    { position: { lat: 20, lng: -50 }, category: 2 }
  ] as any;
  return { id, simulation };
}

function renderRunTracks(stores: IStores) {
  stores.runs.setRuns([finishedRun("run-1"), finishedRun("run-2")], "run-2");
  return render(
    <MapContainer center={[30, -45]} zoom={4}>
      <StoresContext.Provider value={stores}>
        <RunTracks />
      </StoresContext.Provider>
    </MapContainer>
  );
}

describe("RunTracks component", () => {
  let stores = createStores();
  beforeEach(() => {
    stores = createStores();
  });

  it("renders a border and a fill polyline for each unselected finished run", () => {
    const { container } = renderRunTracks(stores);
    expect(container.querySelectorAll(".leaflet-unselectedTracks-pane path").length).toBe(2);
  });

  it("stacks unselected tracks above the overlay pane and below the selected run's track", () => {
    const { container } = renderRunTracks(stores);
    const trackPane = container.querySelector(".leaflet-unselectedTracks-pane") as HTMLElement;

    const trackZ = Number(trackPane.style.zIndex);

    // Above the sea surface temperature overlay and the wind canvas, which would otherwise
    // paint over the tracks and swallow their mouse events.
    expect(OVERLAY_PANE_Z_INDEX).toBeLessThan(trackZ);
    // Still below the selected run's track.
    expect(trackZ).toBeLessThan(SHADOW_PANE_Z_INDEX);
  });
});
