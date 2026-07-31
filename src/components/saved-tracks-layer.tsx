import { observer } from "mobx-react";
import * as React from "react";

import { setInteractiveState } from "../models/interactive-state";
import { useStores } from "../stores-context";
import { StaticTrack } from "./static-track";

/**
 * Renders each run card's track on the map in multi-track mode: the selected run "lit up" in
 * category color (shadowPane), the rest greyed. Editable cards (not run yet) have no track. All are
 * clickable — clicking one selects it (lights it up, greys the others) and restores its setup.
 * The live/in-progress run is drawn separately by <HurricaneTrack> from the simulation's own track.
 */
export const SavedTracksLayer = observer(function SavedTracksLayer() {
  const stores = useStores();
  const { multiTrack, simulation } = stores;
  if (!multiTrack.enabled) return null;

  return (
    <>
      {multiTrack.runs.map(run => {
        const state = run.state;
        if (!state) return null; // editable (not run yet) — nothing to draw
        const track = state.simulation.hurricaneTrack;
        if (!track || track.length === 0) return null;
        const selected = run.id === multiTrack.selectedRunId;
        return (
          <StaticTrack
            // Include selection in the key so the polylines are re-created when a run's selection
            // changes: react-leaflet applies pane/className only at layer creation.
            key={`${run.id}-${selected ? "sel" : "ghost"}`}
            track={track}
            selected={selected}
            onClick={() => {
              multiTrack.selectRun(run.id);
              multiTrack.autoCaptureSuppressed = true;
              setInteractiveState(stores, state);
              simulation.restart(false);
              multiTrack.autoCaptureSuppressed = false;
            }}
          />
        );
      })}
    </>
  );
});
