import * as React from "react";
import { MapContainer } from "react-leaflet";
import { fireEvent, render, screen } from "@testing-library/react";
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

function renderRunTracks(stores: IStores, runs?: IRunState[], selectedRunId?: string) {
  const _runs = runs ?? [finishedRun("run-1"), finishedRun("run-2")];
  const _selectedRunId = selectedRunId ?? "run-2";
  stores.runs.setRuns(_runs, _selectedRunId);
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

  it("labels each complete run at the end of its track", async () => {
    renderRunTracks(stores);
    const labels = await screen.findAllByTestId("run-track-label");
    expect(labels.map(label => label.textContent)).toEqual(["A", "B"]);
  });

  it("puts each label at the end of its run's track, with the selected run's label on top", async () => {
    const runA = finishedRun("run-1");
    const runB = finishedRun("run-2");
    // The two tracks differ at every point but the last, so only a label drawn at the end
    // lands in the same place for both.
    runA.simulation.hurricaneTrack = [
      { position: { lat: 10, lng: -30 }, category: 1 },
      { position: { lat: 12, lng: -35 }, category: 2 }
    ] as any;
    runB.simulation.hurricaneTrack = [
      { position: { lat: 40, lng: -70 }, category: 1 },
      { position: { lat: 38, lng: -60 }, category: 2 }
    ] as any;
    runA.simulation.hurricane.center = { lat: 25, lng: -55 };
    runB.simulation.hurricane.center = { lat: 25, lng: -55 };
    renderRunTracks(stores, [runA, runB]);
    const labels = await screen.findAllByTestId("run-track-label");
    // jsdom reports no 3D transform support, so Leaflet positions markers with left/top
    // rather than the translate3d it uses in a browser.
    const iconStyles = (label: HTMLElement) => {
      const { left, top, zIndex } = (label.closest(".leaflet-marker-icon") as HTMLElement).style;
      return { position: `${left},${top}`, zIndex };
    };

    expect(iconStyles(labels[0]).position).toBe(iconStyles(labels[1]).position);

    // The selected run's label is always on top
    const az1 = Number(iconStyles(labels[0]).zIndex);
    const bz1 = Number(iconStyles(labels[1]).zIndex);
    expect(isFinite(az1)).toBeTruthy();
    expect(isFinite(bz1)).toBeTruthy();
    expect(az1).toBeLessThan(bz1);

    renderRunTracks(stores, [runA, runB], "run-1");
    const az2 = Number(iconStyles(labels[0]).zIndex);
    const bz2 = Number(iconStyles(labels[1]).zIndex);
    expect(isFinite(az2)).toBeTruthy();
    expect(isFinite(bz2)).toBeTruthy();
    expect(az2).toBeGreaterThan(bz2);
  });

  it("marks the selected run's label as selected", async () => {
    renderRunTracks(stores);
    const labels = await screen.findAllByTestId("run-track-label");
    expect(labels[0]).not.toHaveClass("selected");
    expect(labels[1]).toHaveClass("selected");
  });

  it("does not label an incomplete run", async () => {
    const incomplete = defaultSimulationState();
    renderRunTracks(stores, [{ id: "run-2", simulation: incomplete }, finishedRun("run-1")], "run-1");
    const labels = await screen.findAllByTestId("run-track-label");
    expect(labels.map(label => label.textContent)).toEqual(["B"]);
  });

  it("selects a run when its label is clicked", async () => {
    renderRunTracks(stores);
    const labels = await screen.findAllByTestId("run-track-label");

    fireEvent.click(labels[0]);
    expect(stores.runs.selectedRunId).toBe("run-1");
  });

  it("does nothing when the selected run's label is clicked", async () => {
    renderRunTracks(stores);
    const labels = await screen.findAllByTestId("run-track-label");
    const setView = jest.spyOn(stores.ui, "setNorthAtlanticView");

    fireEvent.click(labels[1]);
    expect(setView).not.toHaveBeenCalled();
    expect(stores.runs.selectedRunId).toBe("run-2");

    fireEvent.click(labels[0]);
    expect(setView).toHaveBeenCalled();
  });

  it("highlights the track when its label is hovered", async () => {
    const { container } = renderRunTracks(stores);
    const labels = await screen.findAllByTestId("run-track-label");
    const trackColor = () =>
      container.querySelectorAll(".leaflet-unselectedTracks-pane path")[1].getAttribute("stroke");

    const unhovered = trackColor();
    fireEvent.mouseEnter(labels[0]);
    expect(trackColor()).not.toBe(unhovered);

    fireEvent.mouseLeave(labels[0]);
    expect(trackColor()).toBe(unhovered);
  });

  it("highlights the label when its track is hovered", async () => {
    const { container } = renderRunTracks(stores);
    const labels = await screen.findAllByTestId("run-track-label");
    const track = container.querySelectorAll(".leaflet-unselectedTracks-pane path")[1];

    fireEvent.mouseOver(track);
    expect(labels[0]).toHaveClass("hovered");

    fireEvent.mouseOut(track);
    expect(labels[0]).not.toHaveClass("hovered");
  });
});
