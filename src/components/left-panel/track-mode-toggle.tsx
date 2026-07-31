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
    // Stash the live Multi-track setup (the in-progress editable card / selected run) so it's
    // restored intact when we come back — the two modes keep independent state.
    multiTrack.setMultiWorkingState(getInteractiveState(stores));
    multiTrack.setEnabled(false);
    multiTrack.autoCaptureSuppressed = true;
    if (multiTrack.singleRun) {
      // Restore the Single-Track run (locked) so the same run is shown again.
      setInteractiveState(stores, multiTrack.singleRun);
    } else if (multiTrack.defaultState) {
      // No single run: restore the pristine default so Multi-track edits (Category, season, SST, …)
      // don't carry over. simulation.reset() alone leaves hurricane.startingCategory untouched.
      setInteractiveState(stores, multiTrack.defaultState);
      simulation.restart(false);
    } else {
      simulation.reset();
    }
    multiTrack.autoCaptureSuppressed = false;
    multiTrack.setSingleTrackEditing(false);
  };

  const selectMulti = () => {
    if (multiTrack.enabled) return;
    // Keep the current completed single run (if any) so it's restored when returning to Single.
    if (simulation.simulationFinished && simulation.hurricaneTrack.length > 0) {
      multiTrack.setSingleRun(getInteractiveState(stores));
    }
    multiTrack.autoCaptureSuppressed = true;
    if (multiTrack.multiWorkingState) {
      // Restore the Multi-track work exactly as it was left (in-progress card / selected run) — do
      // NOT reset to default, or the user's Multi-track setup would be lost on every mode switch.
      setInteractiveState(stores, multiTrack.multiWorkingState);
    } else if (multiTrack.defaultState) {
      // First time entering Multi-track: start from the pristine default so nothing leaks in from
      // Single-track, then create the initial editable Run 1 below.
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
