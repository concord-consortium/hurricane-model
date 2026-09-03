import { observer } from "mobx-react";
import React, { Fragment, useEffect, useState } from "react";
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

  const unselectedFinishedRuns = runs.runs.filter(run => !runs.isSelected(run.id) && runs.isRunComplete(run));

  // Leaflet fires no mouseout for removed layers, so clear hover state when the
  // hovered run leaves the list (selection via map or panel, or deletion).
  const clearHoverId = hoveredRunId != null && !unselectedFinishedRuns.some(run => run.id === hoveredRunId);
  useEffect(() => {
    if (clearHoverId) {
      setHoveredRunId(null);
    }
  }, [clearHoverId]);

  const positions = (run: IRunState) => {
    const simulationState = runs.getSimulation(run);
    return [
      ...simulationState.hurricaneTrack.map(point => point.position),
      simulationState.hurricane.center
    ];
  };

  const eventHandlers = (run: IRunState) => ({
    click: () => {
      if (simulation.inProgress && !ui.isReadOnly) simulation.restart();
      runs.selectRun(run.id);
      ui.setNorthAtlanticView();
      log("RunSelected", { runId: run.id, via: "map" });
    },
    mouseover: () => setHoveredRunId(run.id),
    mouseout: () => setHoveredRunId(current => (current === run.id ? null : current))
  });

  // Above overlayPane (z 400) and below the pane holding the selected run's track (z 430) and shadowPane (z 500).
  return (
    <Pane name="unselectedTracks" style={{ zIndex: 410 }}>
      {unselectedFinishedRuns.map(run =>
        <Fragment key={run.id}>
          <Polyline
            positions={positions(run)}
            eventHandlers={eventHandlers(run)}
            pathOptions={{
              bubblingMouseEvents: false,
              color: css.borderColor,
              weight: borderWeight
            }}
          />
          <Polyline
            positions={positions(run)}
            eventHandlers={eventHandlers(run)}
            pathOptions={{
              bubblingMouseEvents: false,
              color: hoveredRunId === run.id ? css.trackHoverColor : css.trackColor,
              weight: trackWeight
            }}
          />
        </Fragment>
      )}
    </Pane>
  );
});
