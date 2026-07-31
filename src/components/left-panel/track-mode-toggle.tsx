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

  // Each mode owns its full setup snapshot (all five categories: Storm Location, Storm Category,
  // Season, SST Anomalies, Pressure Systems — plus any in-progress pre-run edits). Leaving a mode
  // stashes its live snapshot; entering a mode restores that mode's snapshot (or the pristine default
  // on the very first entry). Nothing is shared between the two modes.

  const selectSingle = () => {
    if (!multiTrack.enabled) return;
    // Save Multi-track's live work, then restore Single-track's own snapshot.
    multiTrack.setMultiWorkingState(getInteractiveState(stores));
    multiTrack.setEnabled(false);
    multiTrack.autoCaptureSuppressed = true;
    if (multiTrack.singleWorkingState) {
      setInteractiveState(stores, multiTrack.singleWorkingState);
    } else if (multiTrack.defaultState) {
      setInteractiveState(stores, multiTrack.defaultState);
      simulation.restart(false);
    } else {
      simulation.reset();
    }
    multiTrack.autoCaptureSuppressed = false;
    // Restore Single-track's edit state (only meaningful once a single run exists).
    multiTrack.setSingleTrackEditing(multiTrack.singleWorkingState ? multiTrack.singleWorkingEditing : false);
  };

  const selectMulti = () => {
    if (multiTrack.enabled) return;
    // Save Single-track's live work (pre-run or completed) so it's restored untouched on return.
    multiTrack.setSingleWorkingState(getInteractiveState(stores), multiTrack.singleTrackEditing);
    multiTrack.autoCaptureSuppressed = true;
    if (multiTrack.multiWorkingState) {
      setInteractiveState(stores, multiTrack.multiWorkingState);
    } else if (multiTrack.defaultState) {
      // First entry into Multi-track: pristine default so nothing leaks from Single-track.
      setInteractiveState(stores, multiTrack.defaultState);
      simulation.restart(false);
    } else {
      simulation.restart(false);
    }
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
