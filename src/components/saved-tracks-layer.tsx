import { clsx } from "clsx";
import { observer } from "mobx-react";
import * as React from "react";

import { setInteractiveState } from "../models/interactive-state";
import { runLetter } from "./left-panel/run-summary";
import { useStores } from "../stores-context";
import { LeafletCustomMarker } from "./leaflet-custom-marker";
import { StaticTrack } from "./static-track";

import css from "./saved-tracks-layer.scss";

/**
 * Renders each run card's track on the map in multi-track mode: the selected run "lit up" in
 * category color (shadowPane), the rest greyed. Each track also gets a letter marker (A–F) offset
 * up-and-right from its end. Clicking a track or its letter selects that run and restores its setup.
 */
export const SavedTracksLayer = observer(function SavedTracksLayer() {
  const stores = useStores();
  const { multiTrack, simulation } = stores;
  if (!multiTrack.enabled) return null;

  return (
    <>
      {multiTrack.runs.map((run, i) => {
        const state = run.state;
        if (!state) return null; // editable (not run yet) — nothing to draw
        const track = state.simulation.hurricaneTrack;
        if (!track || track.length === 0) return null;
        const selected = run.id === multiTrack.selectedRunId;
        const endPos = track[track.length - 1].position;
        const select = () => {
          multiTrack.selectRun(run.id);
          multiTrack.autoCaptureSuppressed = true;
          setInteractiveState(stores, state);
          simulation.restart(false);
          multiTrack.autoCaptureSuppressed = false;
        };
        return (
          // Include selection in the key so the polylines re-create when selection changes:
          // react-leaflet applies pane/className only at layer creation.
          <React.Fragment key={`${run.id}-${selected ? "sel" : "ghost"}`}>
            <StaticTrack track={track} selected={selected} onClick={select} />
            <LeafletCustomMarker position={endPos} zIndexOffset={i * 10000}>
              <div className={clsx(css.trackEndLabel, { [css.selected]: selected })} onClick={select}>
                {runLetter(i)}
              </div>
            </LeafletCustomMarker>
          </React.Fragment>
        );
      })}
    </>
  );
});
