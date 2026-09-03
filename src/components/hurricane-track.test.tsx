import * as React from "react";
import { runInAction } from "mobx";
import { Provider } from "mobx-react";
import { MapContainer } from "react-leaflet";
import { render } from "@testing-library/react";
import { HurricaneTrack, buildSegments } from "./hurricane-track";
import { createStores, IStores } from "../models/stores";
import { StoresContext } from "../stores-context";
import { ITrackPoint } from "../types";

// Two category runs of five points each.
const track: ITrackPoint[] = [
  ...Array.from({ length: 5 }, (_, i) => ({ position: { lat: 15 + i, lng: -40 - i }, category: 1 })),
  ...Array.from({ length: 5 }, (_, i) => ({ position: { lat: 20 + i, lng: -45 - i }, category: 2 }))
];

function renderTrack(stores: IStores) {
  runInAction(() => {
    stores.simulation.hurricaneTrack = track;
    stores.simulation.hurricane.center = { lat: 25, lng: -50 };
  });
  return render(
    <MapContainer center={[30, -45]} zoom={4}>
      <Provider stores={stores}>
        <StoresContext.Provider value={stores}>
          <HurricaneTrack />
        </StoresContext.Provider>
      </Provider>
    </MapContainer>
  );
}

describe("HurricaneTrack component", () => {
  let stores = createStores();
  beforeEach(() => {
    stores = createStores();
  });

  // One polyline per track point would make every animation frame O(track length), which would
  // slow the model down as a storm runs.
  it("draws one polyline per category run plus the live tail, not one per track point", () => {
    const { container } = renderTrack(stores);

    // 2 category runs + the segment following the hurricane.
    expect(container.querySelectorAll(".leaflet-selectedTrack-pane path").length).toBe(3);
    expect(container.querySelectorAll(".leaflet-shadow-pane path").length).toBe(3);
  });

  it("colors each polyline by its category", () => {
    const { container } = renderTrack(stores);
    const classes = Array.from(container.querySelectorAll(".leaflet-shadow-pane path"))
      .map(path => path.getAttribute("class"));

    expect(classes[0]).toContain("segmentCategory1");
    expect(classes[1]).toContain("segmentCategory2");
    // The tail carries the last track point's category.
    expect(classes[2]).toContain("segmentCategory2");
  });

  describe("buildSegments", () => {
    it("groups consecutive points of the same category", () => {
      const segments = buildSegments(track);

      expect(segments.map(s => s.category)).toEqual([1, 2]);
      // A point colors the edge leaving it, so the run ends on the first point of the next category.
      expect(segments[0].positions).toEqual(track.slice(0, 6).map(p => p.position));
    });

    it("shares the junction point so neighbouring segments join without a gap", () => {
      const segments = buildSegments(track);

      expect(segments[1].positions[0]).toEqual(track[5].position);
      expect(segments[1].positions.length).toBe(5);
    });

    it("returns no segments for a single-point track, which the live tail draws", () => {
      expect(buildSegments([track[0]])).toEqual([]);
    });

    it("returns no segments for an empty track", () => {
      expect(buildSegments([])).toEqual([]);
    });

    // A leading category change used to produce a one-position segment, which renders nothing.
    it("draws no empty segment when the track starts with a category change", () => {
      const segments = buildSegments([track[0], track[5], track[6]]);

      expect(segments.map(s => s.category)).toEqual([1, 2]);
      expect(segments.map(s => s.positions.length)).toEqual([2, 2]);
    });
  });
});
