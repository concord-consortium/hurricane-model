import { clsx } from "clsx";
import { observer } from "mobx-react";
import React from "react";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";

import { getInteractiveState } from "../../models/interactive-state";
import { MAX_SAVED_TRACKS } from "../../models/multi-track";
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
  const saveDisabled = !runComplete || multiTrack.isFull;

  const handleSave = () => {
    if (saveDisabled) return;
    multiTrack.saveRun(getInteractiveState(stores));
  };

  const saveLabel = multiTrack.isFull
    ? `Max ${MAX_SAVED_TRACKS} tracks saved`
    : "Save this run";

  return (
    <div className={css.savedTracks} data-test="saved-tracks-section">
      <div className={css.heading}>Saved Tracks</div>

      {multiTrack.savedRuns.length === 0 && (
        <div className={css.empty}>No saved tracks yet. Run a storm, then save it.</div>
      )}

      {multiTrack.savedRuns.length > 0 && (
        <ul className={css.runList}>
          {multiTrack.savedRuns.map((run, i) => (
            <li key={run.id} className={css.runItem} data-test="saved-run">
              <span className={css.runName}>Run {i + 1}</span>
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
