import { observer } from "mobx-react";
import * as React from "react";

import { setInteractiveState } from "../models/interactive-state";
import { useStores } from "../stores-context";
import { StaticTrack } from "./static-track";

/**
 * Renders every saved run's track (greyed, clickable) on the map when in multi-track mode.
 * Clicking a saved track restores that run — its full setup (pressure systems, panel settings)
 * comes back and it becomes the active run. The currently selected run is drawn in full color by
 * the active <HurricaneTrack>, so it is skipped here to avoid a double-draw.
 */
export const SavedTracksLayer = observer(function SavedTracksLayer() {
  const stores = useStores();
  const { multiTrack } = stores;
  if (!multiTrack.enabled) return null;

  return (
    <>
      {multiTrack.savedRuns.map(run => {
        if (run.id === multiTrack.selectedRunId) return null;
        const track = run.state.simulation.hurricaneTrack;
        if (!track || track.length === 0) return null;
        return (
          <StaticTrack
            key={run.id}
            track={track}
            onClick={() => {
              multiTrack.restoreRun(run.id);
              setInteractiveState(stores, run.state);
            }}
          />
        );
      })}
    </>
  );
});
