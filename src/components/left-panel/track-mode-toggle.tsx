import { clsx } from "clsx";
import { observer } from "mobx-react";
import React from "react";

import { getInteractiveState } from "../../models/interactive-state";
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
    multiTrack.setEnabled(false);
  };

  const selectMulti = () => {
    if (multiTrack.enabled) return;
    multiTrack.setEnabled(true);
    // Pre-seed: if the user already has a completed run they like, entering multi-track
    // saves it as Run 1 (per spec use case).
    const hasCompletedRun = simulation.simulationFinished && simulation.hurricaneTrack.length > 0;
    if (hasCompletedRun && multiTrack.savedRuns.length === 0) {
      multiTrack.saveRun(getInteractiveState(stores));
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
