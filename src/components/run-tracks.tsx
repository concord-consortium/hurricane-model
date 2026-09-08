import { observer } from "mobx-react";
import React, { Fragment, useEffect, useState } from "react";
import { Pane, Polyline } from "react-leaflet";

import { log } from "../log";
import { IRunState } from "../types/interactive-state";
import { useStores } from "../stores-context";
import { HurricaneTrack } from "./hurricane-track";
import { RunTrackLabel } from "./run-track-label";

import css from "./run-tracks.scss";

const trackWeight = 5;
const borderWeight = 7;

export const RunTracks = observer(function RunTracks() {
  const { runs, simulation, ui } = useStores();
  const [hoveredRunId, setHoveredRunId] = useState<string | null>(null);

  const positions = (run: IRunState) => {
    const simulationState = runs.getSimulation(run);
    return [
      ...simulationState.hurricaneTrack.map(point => point.position),
      { ...simulationState.hurricane.center }
    ];
  };

  const finishedTracks = runs.runs
    .filter(run => runs.isRunComplete(run))
    .map(run => ({ run, trackPositions: positions(run) }));
  const unselectedFinishedTracks = finishedTracks.filter(({ run }) => !runs.isSelected(run.id));

  // Leaflet fires no mouseout for removed layers, so clear hover when the hovered run leaves
  // unselectedFinishedTracks (selected via map or panel, or deleted) — hover is only ever set on
  // an unselected run, and a selected label has no handler left to clear it.
  const clearHoverId = hoveredRunId != null && !unselectedFinishedTracks.some(({ run }) => run.id === hoveredRunId);
  useEffect(() => {
    if (clearHoverId) {
      setHoveredRunId(null);
    }
  }, [clearHoverId]);

  const selectRun = (run: IRunState) => {
    if (simulation.inProgress && !ui.isReadOnly) simulation.restart();
    runs.selectRun(run.id);
    ui.setNorthAtlanticView();
    log("RunSelected", { runId: run.id, via: "map" });
  };

  const startHover = (run: IRunState) => setHoveredRunId(run.id);
  const endHover = (run: IRunState) => setHoveredRunId(current => (current === run.id ? null : current));

  const eventHandlers = (run: IRunState) => ({
    click: () => selectRun(run),
    mouseover: () => startHover(run),
    mouseout: () => endHover(run)
  });

  return (
    <>
      {/* Above overlayPane (z 400) and below the pane holding the selected run's track (z 430)
          and shadowPane (z 500). */}
      <Pane name="unselectedTracks" style={{ zIndex: 410 }}>
        {unselectedFinishedTracks.map(({ run, trackPositions }) =>
          <Fragment key={run.id}>
            <Polyline
              positions={trackPositions}
              eventHandlers={eventHandlers(run)}
              pathOptions={{
                bubblingMouseEvents: false,
                color: css.borderColor,
                weight: borderWeight
              }}
            />
            <Polyline
              positions={trackPositions}
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
      {finishedTracks.map(({ run, trackPositions }) =>
        <RunTrackLabel
          key={run.id}
          letter={runs.runLetter(run)}
          position={trackPositions[trackPositions.length - 1]}
          selected={runs.isSelected(run.id)}
          hovered={hoveredRunId === run.id}
          onSelect={() => selectRun(run)}
          onHoverStart={() => startHover(run)}
          onHoverEnd={() => endHover(run)}
        />
      )}
      <HurricaneTrack />
    </>
  );
});
