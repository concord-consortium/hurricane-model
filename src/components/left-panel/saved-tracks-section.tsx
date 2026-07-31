import { clsx } from "clsx";
import { observer } from "mobx-react";
import React from "react";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";

import { getInteractiveState, setInteractiveState } from "../../models/interactive-state";
import { ISavedRun, MAX_SAVED_TRACKS } from "../../models/multi-track";
import { useStores } from "../../stores-context";
import { RunSummary, runCategory } from "./run-summary";

import css from "./saved-tracks-section.scss";

/**
 * "Saved Tracks" shown beneath the setup options in multi-track mode. Each saved run is a
 * trial-style card (number badge, category color, compact option read-out) that can be selected
 * (lighting up its track and restoring its setup) or deleted. A "New Run" card at the bottom starts
 * configuring the next run; the Save button banks the current finished run.
 */
export const SavedTracksSection = observer(function SavedTracksSection() {
  const stores = useStores();
  const { multiTrack, simulation } = stores;

  if (!multiTrack.enabled) return null;

  const runComplete =
    simulation.simulationStarted && !simulation.simulationRunning && simulation.simulationFinished;
  const alreadySaved = runComplete && multiTrack.currentRunSaved;
  const saveDisabled = !multiTrack.canSave(runComplete);
  const newRunActive = multiTrack.selectedRunId === undefined;

  const handleSave = () => {
    if (saveDisabled) return;
    // Bank the finished run (it stays selected/lit) and reset the storm to its start for the next.
    multiTrack.saveRun(getInteractiveState(stores));
    simulation.restart(false);
  };

  // Selecting a run restores its setup (pressure systems move, panel reflects it) and lights up its
  // track; the loaded track is cleared from the sim (the map layer draws it) and the storm resets.
  const handleSelect = (run: ISavedRun) => {
    multiTrack.restoreRun(run.id);
    setInteractiveState(stores, run.state);
    simulation.restart(false);
  };

  // The "New Run" card: start configuring a fresh run — deselect any saved run (all go grey) and
  // reset the storm to its start position.
  const handleNewRun = () => {
    multiTrack.selectRun(undefined);
    simulation.restart(false);
  };

  const saveLabel = multiTrack.isFull
    ? `Max ${MAX_SAVED_TRACKS} tracks saved`
    : alreadySaved
      ? "Saved ✓"
      : "Save this run";

  return (
    <div className={css.savedTracks} data-test="saved-tracks-section">
      <div className={css.heading}>Saved Tracks</div>

      <ul className={css.runList}>
        {multiTrack.savedRuns.map((run, i) => {
          const selected = run.id === multiTrack.selectedRunId;
          const cat = runCategory(run.state);
          return (
            <li key={run.id}>
              <div
                className={clsx(css.runCard, { [css.selected]: selected })}
                role="button"
                tabIndex={0}
                aria-pressed={selected}
                data-test="saved-run"
                onClick={() => handleSelect(run)}
                onKeyDown={e => {
                  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleSelect(run); }
                }}
              >
                <div className={css.runCardHeader}>
                  <span className={css.badge}>{i + 1}</span>
                  <span className={css.runName}>Run {i + 1}</span>
                  <span className={css.catChip}>
                    <span className={css.catDot} style={{ backgroundColor: cat.color }} />
                    {cat.label}
                  </span>
                </div>
                <RunSummary state={run.state} />
                <button
                  type="button"
                  className={css.trash}
                  aria-label={`Delete Run ${i + 1}`}
                  data-test="delete-run-button"
                  onClick={e => { e.stopPropagation(); multiTrack.deleteRun(run.id); }}
                >
                  <DeleteIcon fontSize="small" />
                </button>
              </div>
            </li>
          );
        })}

        <li>
          <button
            type="button"
            className={clsx(css.newRunCard, {
              [css.active]: newRunActive && !multiTrack.isFull,
              [css.disabled]: multiTrack.isFull
            })}
            disabled={multiTrack.isFull}
            data-test="new-run-card"
            onClick={handleNewRun}
          >
            {multiTrack.isFull ? (
              <span className={css.newRunFull}>Pack full — delete a run to add another</span>
            ) : (
              <>
                <span className={css.newRunPlus} aria-hidden="true">+</span>
                <span className={css.newRunLabel}>New Run</span>
                <span className={css.newRunSub}>Set options &amp; press Start</span>
              </>
            )}
          </button>
        </li>
      </ul>

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
