import { clsx } from "clsx";
import { observer } from "mobx-react";
import React, { useEffect, useRef } from "react";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";

import { setInteractiveState } from "../../models/interactive-state";
import { IRunSlot } from "../../models/multi-track";
import { namedRegions } from "../../types";
import { useStores } from "../../stores-context";
import { IRunSetupSim, RunSummary, runLetter } from "./run-summary";
import { RunThumbnail } from "./run-thumbnail";

import css from "./saved-tracks-section.scss";

/**
 * The Multi-track run pack. Each run is a card: an editable slot ("Not run yet") that auto-fills
 * when run, or a completed run (with a Reset to make it editable again). A "New Run" card adds the
 * next slot. Selecting a card lights up its track and restores its setup. No Save button — running
 * a card saves it automatically (see the auto-capture reaction in stores.ts).
 */
export const SavedTracksSection = observer(function SavedTracksSection() {
  const stores = useStores();
  const { multiTrack, simulation, ui } = stores;
  const completedCount = multiTrack.runs.filter(r => r.state).length;

  // When the selection changes (e.g. from clicking a track on the map), scroll the selected run's
  // card into view. block: "nearest" is a no-op when it's already visible.
  const selectedCardRef = useRef<HTMLLIElement | null>(null);
  useEffect(() => {
    if (multiTrack.enabled && stores.ui.leftPanelOpen && selectedCardRef.current) {
      // "auto" (instant), not "smooth": when selection comes from the compare table, the card's
      // .selected applies immediately, but a smooth scroll to an off-screen card made it *look* like
      // selection lagged (~300ms of animation). Snapping it into view keeps both directions instant.
      selectedCardRef.current.scrollIntoView({ block: "nearest", behavior: "auto" });
    }
  }, [multiTrack.enabled, multiTrack.selectedRunId, stores.ui.leftPanelOpen]);

  if (!multiTrack.enabled) return null;

  // Live snapshot of the current setup, used to summarize the editable (not-yet-run) card.
  const liveSetup: IRunSetupSim = {
    season: simulation.season,
    startLocation: simulation.startLocation,
    hurricane: { startingCategory: simulation.hurricane.startingCategory },
    pressureSystems: simulation.pressureSystems.map(ps => ps.serialize()),
    temperatureAnomalies: Object.fromEntries(namedRegions.map(r => [r, simulation.temperatureAnomalyAt(r)]))
  };

  // Selecting a run restores its setup (pressure systems move, panel reflects it) and lights its
  // track; the loaded track is cleared from the sim (the map layer draws it) and the storm resets.
  const handleSelect = (run: IRunSlot) => {
    multiTrack.selectRun(run.id);
    if (run.state) {
      multiTrack.autoCaptureSuppressed = true;
      setInteractiveState(stores, run.state);
      simulation.restart(false);
      multiTrack.autoCaptureSuppressed = false;
    }
  };

  // Edit a completed run: load its setup, unlock it for changes, and select it. Changing settings
  // and pressing Start re-runs it, updating the card.
  const handleEdit = (run: IRunSlot) => {
    if (!run.state) return;
    multiTrack.autoCaptureSuppressed = true;
    setInteractiveState(stores, run.state);
    simulation.restart(false);
    multiTrack.autoCaptureSuppressed = false;
    multiTrack.editRun(run.id);
  };

  // Add the next empty card and reset the storm to its start for a fresh configuration.
  const handleNewRun = () => {
    if (!multiTrack.canAddRun) return;
    multiTrack.addRun();
    simulation.restart(false);
  };

  return (
    <div className={css.savedTracks} data-test="saved-tracks-section">
      <div className={css.heading}>
        <span>Runs</span>
        <button
          type="button"
          className={clsx(css.compareBtn, { [css.compareOn]: ui.compareOpen })}
          data-test="compare-button"
          aria-pressed={ui.compareOpen}
          disabled={completedCount < 2}
          title={completedCount < 2 ? "Run at least 2 tracks to compare" : undefined}
          onClick={() => ui.setCompareOpen(!ui.compareOpen)}
        >
          {ui.compareOpen ? "Hide Compare Runs" : "Show Compare Runs"}
        </button>
      </div>

      <ul className={css.runList}>
        {multiTrack.runs.map((run, i) => {
          const selected = run.id === multiTrack.selectedRunId;
          const editable = run.state === null;
          const sim = run.state ? run.state.simulation : liveSetup;
          return (
            <li key={run.id} ref={selected ? selectedCardRef : null}>
              <div
                className={clsx(css.runCard, { [css.selected]: selected, [css.editable]: editable })}
                role="button"
                tabIndex={0}
                aria-pressed={selected}
                data-test="saved-run"
                onClick={() => handleSelect(run)}
                onKeyDown={e => {
                  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleSelect(run); }
                }}
              >
                {editable && <div className={css.editableLabel}>Not run yet — editable</div>}
                <div className={css.runCardHeader}>
                  <span className={css.badge}>{runLetter(i)}</span>
                </div>
                <div className={css.splitBody}>
                  <div className={css.setupCol}>
                    <RunSummary sim={sim} />
                  </div>
                  <div className={css.resultCol}>
                    <div className={css.resultHeading}>Result</div>
                    {run.state
                      ? <RunThumbnail sim={run.state.simulation} />
                      : <div className={css.resultPlaceholder}>Run to see result</div>}
                  </div>
                </div>
                {run.state && (
                  <div className={css.cardActions}>
                    {multiTrack.editingRunId === run.id ? (
                      <span className={css.editingTag}>Editing…</span>
                    ) : (
                      <button
                        type="button"
                        className={css.editBtn}
                        data-test="edit-run-button"
                        onClick={e => { e.stopPropagation(); handleEdit(run); }}
                      >
                        Restart (edit setup)
                      </button>
                    )}
                  </div>
                )}
                <button
                  type="button"
                  className={css.trash}
                  aria-label={`Delete Run ${runLetter(i)}`}
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
            className={clsx(css.newRunCard, { [css.disabled]: !multiTrack.canAddRun })}
            disabled={!multiTrack.canAddRun}
            data-test="new-run-card"
            onClick={handleNewRun}
          >
            {multiTrack.isFull ? (
              <span className={css.newRunNote}>Pack full — delete a run to add another</span>
            ) : multiTrack.hasEditableCard ? (
              <span className={css.newRunNote}>Run the current card to add another</span>
            ) : (
              <>
                <span className={css.newRunPlus} aria-hidden="true">+</span>
                <span className={css.newRunLabel}>New Run</span>
              </>
            )}
          </button>
        </li>
      </ul>
    </div>
  );
});
