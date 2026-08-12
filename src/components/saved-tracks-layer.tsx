import { clsx } from "clsx";
import { observer } from "mobx-react";
import * as React from "react";

import { setInteractiveState } from "../models/interactive-state";
import { ITrackPoint } from "../types";
import { runLetter } from "./left-panel/run-summary";
import { useStores } from "../stores-context";
import { HurricaneCategoryMarker } from "./hurricane-category-marker";
import { LeafletCustomMarker } from "./leaflet-custom-marker";
import { StaticTrack } from "./static-track";

import css from "./saved-tracks-layer.scss";

// Category-change markers for a saved run's track: one at the midpoint of each category segment.
function categoryMarkersForTrack(track: ITrackPoint[], strengthChangePositions: number[]): ITrackPoint[] {
  const markers: ITrackPoint[] = [];
  let prev = 0;
  strengthChangePositions.forEach(idx => {
    if (idx > 0 && track[prev]) {
      const mid = Math.min(track.length - 1, Math.max(0, Math.floor((prev + idx) / 2)));
      if (track[mid]) markers.push({ position: track[mid].position, category: track[prev].category });
    }
    prev = idx;
  });
  return markers;
}

/**
 * Renders each run card's track on the map in multi-track mode: the selected run "lit up" in
 * category color (shadowPane), the rest greyed. Each track also gets a letter marker (A–F) at its
 * end. The selected run also shows its category-change markers (TS/1/2…). Clicking a track or its
 * letter selects that run.
 */
export const SavedTracksLayer = observer(function SavedTracksLayer() {
  const stores = useStores();
  const { multiTrack, simulation, ui } = stores;

  const selected = multiTrack.selectedRun;
  const showCategoryMarkers = ui.categoryChangeMarkers && !simulation.simulationRunning && selected?.state;
  const categoryMarkers = showCategoryMarkers
    ? categoryMarkersForTrack(
        selected!.state!.simulation.hurricaneTrack,
        selected!.state!.simulation.strengthChangePositions || []
      )
    : [];

  return (
    <>
      {multiTrack.runs.map((run, i) => {
        const state = run.state;
        if (!state) return null; // editable (not run yet) — nothing to draw
        const track = state.simulation.hurricaneTrack;
        if (!track || track.length === 0) return null;
        const isSelected = run.id === multiTrack.selectedRunId;
        const endPos = track[track.length - 1].position;
        const select = () => {
          multiTrack.selectRun(run.id);
          multiTrack.autoCaptureSuppressed = true;
          setInteractiveState(stores, state);
          simulation.restart(false);
          multiTrack.autoCaptureSuppressed = false;
        };
        return (
          <React.Fragment key={run.id}>
            {/* Selection is in StaticTrack's key (only) so the polylines re-create when selection
                changes — react-leaflet applies pane/className only at layer creation. The letter
                marker keeps a stable key so it persists (updating zIndexOffset/className in place)
                instead of being torn down and re-added, which made the A/B/C labels blink. */}
            <StaticTrack key={isSelected ? "sel" : "ghost"} track={track} selected={isSelected} onClick={select} />
            {/* Base order is by run index (A lowest … F highest); the selected run's label jumps
                above all unselected labels, but stays below the storm marker (offset 1,000,000). */}
            <LeafletCustomMarker key="label" position={endPos} zIndexOffset={(isSelected ? 500000 : 0) + i * 10000}>
              <div className={clsx(css.trackEndLabel, { [css.selected]: isSelected })} onClick={select}>
                {runLetter(i)}
              </div>
            </LeafletCustomMarker>
          </React.Fragment>
        );
      })}
      {categoryMarkers.map((m, idx) => (
        <HurricaneCategoryMarker key={`cat-${idx}`} point={m} />
      ))}
    </>
  );
});
