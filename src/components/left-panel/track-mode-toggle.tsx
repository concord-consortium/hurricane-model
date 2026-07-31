import { clsx } from "clsx";
import { observer } from "mobx-react";
import React from "react";

import { getInteractiveState, setInteractiveState } from "../../models/interactive-state";
import { useStores } from "../../stores-context";

import css from "./track-mode-toggle.scss";

/**
 * Segmented toggle at the top of the Storm Setup panel that switches between regular
 * single-run mode and Multi-track mode. Both modes share the same setup options below;
 * this only flips the multi-track behavior on/off.
 */
export const TrackModeToggle = observer(function TrackModeToggle() {
  const stores = useStores();
  const { multiTrack, simulation } = stores;
  const enabled = multiTrack.enabled;

  const selectSingle = () => {
    if (!multiTrack.enabled) return;
    multiTrack.setEnabled(false);
    // Restore the stashed Single-Track run so the same run is shown again.
    if (multiTrack.singleTrackState) {
      multiTrack.autoCaptureSuppressed = true;
      setInteractiveState(stores, multiTrack.singleTrackState);
      multiTrack.autoCaptureSuppressed = false;
    }
  };

  const selectMulti = () => {
    if (multiTrack.enabled) return;
    // Stash the current Single-Track run (if any) so it's restored on return, then clear the sim so
    // Multi-track starts fresh with an empty, editable Run 1.
    const hasRun = simulation.simulationFinished && simulation.hurricaneTrack.length > 0;
    multiTrack.setSingleTrackState(hasRun ? getInteractiveState(stores) : null);
    multiTrack.autoCaptureSuppressed = true;
    simulation.restart(false);
    multiTrack.autoCaptureSuppressed = false;
    multiTrack.setEnabled(true);
    if (multiTrack.runs.length === 0) {
      multiTrack.addRun();
    }
  };

  return (
    <div className={css.trackModeToggle} role="group" aria-label="Track mode">
      <button
        type="button"
        className={clsx(css.toggleButton, { [css.active]: !enabled })}
        aria-pressed={!enabled}
        data-test="single-track-button"
        onClick={selectSingle}
      >
        Single track
      </button>
      <button
        type="button"
        className={clsx(css.toggleButton, { [css.active]: enabled })}
        aria-pressed={enabled}
        data-test="multi-track-button"
        onClick={selectMulti}
      >
        Multi-track
      </button>
    </div>
  );
});
