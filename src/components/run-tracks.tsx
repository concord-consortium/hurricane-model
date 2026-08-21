import { observer } from "mobx-react";
import React, { useState } from "react";
import { Pane, Polyline } from "react-leaflet";

import { log } from "../log";
import { IRunState } from "../types/interactive-state";
import { useStores } from "../stores-context";

import css from "./run-tracks.scss";

const trackWeight = 5;
const borderWeight = 7;

export const RunTracks = observer(function RunTracks() {
  const { runs, simulation, ui } = useStores();
  const [hoveredRunId, setHoveredRunId] = useState<string | null>(null);

  const unselectedFinishedRuns = runs.runs.filter(run =>
    run.id !== runs.selectedRunId && run.simulation.simulationFinished);

  const positions = (run: IRunState) => [
    ...run.simulation.hurricaneTrack.map(point => point.position),
    run.simulation.hurricane.center
  ];

  const eventHandlers = (run: IRunState) => ({
    click: () => {
      if (simulation.simulationRunning || ui.isReportMode) return;
      runs.selectRun(run.id);
      ui.setNorthAtlanticView();
      log("RunSelected", { runId: run.id, via: "map" });
    },
    mouseover: () => setHoveredRunId(run.id),
    mouseout: () => setHoveredRunId(current => (current === run.id ? null : current))
  });

  // Two panes so every border renders below every track fill. Both sit under
  // overlayPane (z 400) and shadowPane (z 500), which hold the selected run's track.
  return (
    <>
      <Pane name="unselectedTrackBorders" style={{ zIndex: 380 }}>
        {unselectedFinishedRuns.map(run =>
          <Polyline
            key={run.id}
            positions={positions(run)}
            eventHandlers={eventHandlers(run)}
            pathOptions={{
              bubblingMouseEvents: false,
              color: css.borderColor,
              weight: borderWeight
            }}
          />
        )}
      </Pane>
      <Pane name="unselectedTracks" style={{ zIndex: 390 }}>
        {unselectedFinishedRuns.map(run =>
          <Polyline
            key={run.id}
            positions={positions(run)}
            eventHandlers={eventHandlers(run)}
            pathOptions={{
              bubblingMouseEvents: false,
              color: hoveredRunId === run.id ? css.trackHoverColor : css.trackColor,
              weight: trackWeight
            }}
          />
        )}
      </Pane>
    </>
  );
});
