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
    // Keep the current completed single run (if any) so it's restored on return, then clear the sim
    // so Multi-track starts fresh with an empty, editable Run 1.
    if (simulation.simulationFinished && simulation.hurricaneTrack.length > 0) {
      multiTrack.setSingleRun(getInteractiveState(stores));
    }
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
