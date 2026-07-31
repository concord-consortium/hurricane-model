import { clsx } from "clsx";
import { observer } from "mobx-react";
import React from "react";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";

import { getInteractiveState, setInteractiveState } from "../../models/interactive-state";
import { ISavedRun, MAX_SAVED_TRACKS } from "../../models/multi-track";
import { useStores } from "../../stores-context";

import css from "./saved-tracks-section.scss";

/**
 * "Saved Tracks" section shown beneath the setup options when Multi-track mode is active.
 * Lets the user save the just-completed run into their pack (up to MAX_SAVED_TRACKS) and
 * delete runs. The map display of / selection between saved tracks comes in a later phase.
 */
export const SavedTracksSection = observer(function SavedTracksSection() {
  const stores = useStores();
  const { multiTrack, simulation } = stores;

  if (!multiTrack.enabled) return null;

  // A run can only be saved once it has actually run and finished.
  const runComplete =
    simulation.simulationStarted && !simulation.simulationRunning && simulation.simulationFinished;
  const alreadySaved = runComplete && multiTrack.currentRunSaved;
  const saveDisabled = !multiTrack.canSave(runComplete);

  const handleSave = () => {
    if (saveDisabled) return;
    multiTrack.saveRun(getInteractiveState(stores));
  };

  // Selecting a run restores its full setup and makes it the active (colored) track.
  const handleSelect = (run: ISavedRun) => {
    multiTrack.restoreRun(run.id);
    setInteractiveState(stores, run.state);
  };

  const saveLabel = multiTrack.isFull
    ? `Max ${MAX_SAVED_TRACKS} tracks saved`
    : alreadySaved
      ? "Saved ✓"
      : "Save this run";

  // After saving, guide the user to the next run (there's no separate "new run" button — you just
  // adjust the setup and press Start, and the saved run greys out on the map).
  const showNextRunHint = alreadySaved && !multiTrack.isFull;

  return (
    <div className={css.savedTracks} data-test="saved-tracks-section">
      <div className={css.heading}>Saved Tracks</div>

      {multiTrack.savedRuns.length === 0 && (
        <div className={css.empty}>No saved tracks yet. Run a storm, then save it.</div>
      )}

      {multiTrack.savedRuns.length > 0 && (
        <ul className={css.runList}>
          {multiTrack.savedRuns.map((run, i) => (
            <li
              key={run.id}
              className={clsx(css.runItem, { [css.selected]: run.id === multiTrack.selectedRunId })}
              data-test="saved-run"
            >
              <button
                type="button"
                className={css.runSelect}
                data-test="select-run-button"
                onClick={() => handleSelect(run)}
              >
                Run {i + 1}
              </button>
              <button
                type="button"
                className={css.deleteButton}
                aria-label={`Delete Run ${i + 1}`}
                data-test="delete-run-button"
                onClick={() => multiTrack.deleteRun(run.id)}
              >
                <DeleteIcon fontSize="small" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {showNextRunHint && (
        <div className={css.nextRunHint} data-test="next-run-hint">
          Adjust the setup and press Start to run another track.
        </div>
      )}

      <button
        type="button"
        className={clsx(css.saveButton, { [css.disabled]: saveDisabled })}
        disabled={saveDisabled}
        data-test="save-run-button"
        onClick={handleSave}
      >
        {saveLabel}
      </button>
    </div>
  );
});
