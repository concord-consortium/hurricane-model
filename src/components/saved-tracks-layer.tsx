import { observer } from "mobx-react";
import * as React from "react";

import { setInteractiveState } from "../models/interactive-state";
import { useStores } from "../stores-context";
import { StaticTrack } from "./static-track";

/**
 * Renders every saved run's track on the map when in multi-track mode: the selected run "lit up"
 * in category color, the rest greyed. All are clickable — clicking one selects it (lights it up,
 * greys the others) and restores its setup so the pressure systems and panel reflect that run.
 * The live/in-progress run is drawn separately by <HurricaneTrack> from the simulation's own track.
 */
export const SavedTracksLayer = observer(function SavedTracksLayer() {
  const stores = useStores();
  const { multiTrack, simulation } = stores;
  if (!multiTrack.enabled) return null;

  return (
    <>
      {multiTrack.savedRuns.map(run => {
        const track = run.state.simulation.hurricaneTrack;
        if (!track || track.length === 0) return null;
        const selected = run.id === multiTrack.selectedRunId;
        return (
          <StaticTrack
            // Include selection in the key so the polylines are re-created when a run's selection
            // changes: react-leaflet applies pane/className only at layer creation, so without this
            // a run's color/pane would not update when it becomes selected or deselected.
            key={`${run.id}-${selected ? "sel" : "ghost"}`}
            track={track}
            selected={selected}
            onClick={() => {
              // Restore the run's setup (pressure systems move to its positions, panel reflects it),
              // then clear the loaded track — it stays drawn (lit up) by this layer as the selected
              // run, and the storm resets to its start position.
              multiTrack.restoreRun(run.id);
              setInteractiveState(stores, run.state);
              simulation.restart(false);
            }}
          />
        );
      })}
    </>
  );
});
