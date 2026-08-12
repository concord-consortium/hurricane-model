import { clsx } from "clsx";
import { observer } from "mobx-react";
import React, { useEffect, useRef } from "react";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";

import { freezeEditableCard, setInteractiveState } from "../../models/interactive-state";
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
  const { multiTrack, simulation } = stores;

  // When the selection changes (e.g. clicking a track on the map, or a card partly hidden behind the
  // bottom bar), bring the selected card fully into view. We scroll the list directly rather than use
  // scrollIntoView({block:"nearest"}): the app can overflow the viewport, so scrollIntoView nudges the
  // page instead of the list and leaves the card tucked under the bar. The list's scroll-padding-bottom
  // (= bar height) defines the clearance the card must keep from the bar-covered lower edge.
  const selectedCardRef = useRef<HTMLLIElement | null>(null);
  useEffect(() => {
    const card = selectedCardRef.current;
    if (!stores.ui.leftPanelOpen || !card) return;
    const list = card.parentElement; // the .runList scroll container
    if (!list) return;
    const style = getComputedStyle(list);
    // Below the safe line: clear the bottom bar (scroll-padding-bottom) plus 5px of breathing room.
    const bottomClearance = (parseFloat(style.scrollPaddingBottom) || 0) + 5;
    // Above the top: land the card at the FIRST card's resting spot (the list's scrollable padding-top),
    // not flush against the container edge.
    const topGap = parseFloat(style.paddingTop) || 0;
    const listRect = list.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    if (cardRect.bottom > listRect.bottom - bottomClearance) {
      // Card runs below the safe line (into/behind the bar): scroll up so its bottom clears the bar + 5px.
      list.scrollTop += cardRect.bottom - (listRect.bottom - bottomClearance);
    } else if (cardRect.top < listRect.top) {
      // Card is offscreen above the container: scroll down so it lands at the first card's default spot.
      list.scrollTop -= (listRect.top + topGap) - cardRect.top;
    }
  }, [multiTrack.selectedRunId, stores.ui.leftPanelOpen]);

  // Live snapshot of the current setup, used to summarize the editable (not-yet-run) card.
  const liveSetup: IRunSetupSim = {
    season: simulation.season,
    // Storm location is a pre-run setting: track the storm's live position while it's being placed
    // (so the card updates as you drag), but freeze at the start location once the run starts —
    // hurricane.center then moves with the storm and must not drag the card's location along.
    startLocation: simulation.simulationStarted ? simulation.startLocation : simulation.hurricane.center,
    hurricane: { startingCategory: simulation.hurricane.startingCategory },
    pressureSystems: simulation.pressureSystems.map(ps => ps.serialize()),
    temperatureAnomalies: Object.fromEntries(namedRegions.map(r => [r, simulation.temperatureAnomalyAt(r)]))
  };

  // Selecting a run restores its setup (pressure systems move, panel reflects it) and lights its
  // track; the loaded track is cleared from the sim (the map layer draws it) and the storm resets.
  const handleSelect = (run: IRunSlot) => {
    if (run.id === multiTrack.selectedRunId) return;
    freezeEditableCard(stores); // keep the editable card's own values if we're leaving it
    multiTrack.selectRun(run.id);
    // Load the completed run's captured state, or restore the editable card's own draft.
    const restore = run.state ?? multiTrack.editableDraft;
    if (restore) {
      multiTrack.autoCaptureSuppressed = true;
      setInteractiveState(stores, restore);
      simulation.restart(false);
      multiTrack.autoCaptureSuppressed = false;
    }
  };

  // Edit a completed run: load its setup, unlock it for changes, and select it. Changing settings
  // and pressing Start re-runs it, updating the card.
  const handleEdit = (run: IRunSlot) => {
    if (!run.state) return;
    freezeEditableCard(stores); // keep the editable card's own values if we're leaving it to edit this one
    multiTrack.autoCaptureSuppressed = true;
    setInteractiveState(stores, run.state);
    simulation.restart(false);
    multiTrack.autoCaptureSuppressed = false;
    multiTrack.editRun(run.id);
  };

  // "Duplicate Last Run": add a card pre-loaded with the most recent completed run's settings.
  const handleDuplicateRun = () => {
    if (!multiTrack.canAddRun) return;
    const last = multiTrack.runs.filter(r => r.state).slice(-1)[0];
    multiTrack.autoCaptureSuppressed = true;
    multiTrack.addRun();
    if (last?.state) setInteractiveState(stores, last.state);
    simulation.restart(false);
    multiTrack.autoCaptureSuppressed = false;
  };

  // "New Run": add a card reset to the default setup.
  const handleNewRun = () => {
    if (!multiTrack.canAddRun) return;
    multiTrack.autoCaptureSuppressed = true;
    multiTrack.addRun();
    if (multiTrack.defaultState) setInteractiveState(stores, multiTrack.defaultState);
    simulation.restart(false);
    multiTrack.autoCaptureSuppressed = false;
  };

  // Delete a run. If it was the last one in the pack, reset the setup to default so the empty pack —
  // and the Compare "Run A" column that stays in its place — start fresh.
  const handleDelete = (id: string) => {
    multiTrack.deleteRun(id);
    if (multiTrack.runs.length === 0) {
      multiTrack.autoCaptureSuppressed = true;
      if (multiTrack.defaultState) setInteractiveState(stores, multiTrack.defaultState);
      simulation.restart(false);
      multiTrack.autoCaptureSuppressed = false;
    }
  };

  return (
    <div className={css.savedTracks} data-test="saved-tracks-section">
      <ul className={css.runList}>
        {multiTrack.runs.map((run, i) => {
          const selected = run.id === multiTrack.selectedRunId;
          const editable = run.state === null;
          const editing = multiTrack.editingRunId === run.id;
          // This card's run is in progress (Start clicked, not yet finished/captured).
          const running = selected && simulation.simulationStarted && !simulation.simulationFinished;
          // The card being actively set up (edited, or the selected editable card) shows the LIVE sim
          // so edits appear immediately; the editable card shows its frozen draft while you're away;
          // a completed card shows its captured state.
          const active = editing || (editable && selected);
          const sim = active
            ? liveSetup
            : editable ? (multiTrack.editableDraft?.simulation ?? liveSetup) : run.state!.simulation;
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
                {editable && <div className={css.editableLabel}>{running ? "Running…" : "Not run yet — editable"}</div>}
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
                      <span className={css.editingTag}>{running ? "Running…" : "Editing…"}</span>
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
                  onClick={e => { e.stopPropagation(); handleDelete(run.id); }}
                >
                  <DeleteIcon fontSize="small" />
                </button>
              </div>
            </li>
          );
        })}

        <li>
          {multiTrack.isFull ? (
            <div className={clsx(css.newRunCard, css.disabled)}>
              <span className={css.newRunNote}>Pack full — delete a run to add another</span>
            </div>
          ) : multiTrack.hasEditableCard ? (
            <div className={clsx(css.newRunCard, css.disabled)}>
              <span className={css.newRunNote}>Run the current card to add another</span>
            </div>
          ) : multiTrack.runs.some(r => r.state) ? (
            <div className={css.newRunPair}>
              <button
                type="button"
                className={css.newRunCard}
                data-test="duplicate-run-card"
                onClick={handleDuplicateRun}
              >
                <span className={css.newRunPlus} aria-hidden="true">+</span>
                <span className={css.newRunLabel}>Duplicate Last Run</span>
              </button>
              <button
                type="button"
                className={css.newRunCard}
                data-test="new-run-card"
                onClick={handleNewRun}
              >
                <span className={css.newRunPlus} aria-hidden="true">+</span>
                <span className={css.newRunLabel}>New Run</span>
              </button>
            </div>
          ) : (
            // No completed run to duplicate yet — just a single full-width New Run.
            <button
              type="button"
              className={css.newRunCard}
              data-test="new-run-card"
              onClick={handleNewRun}
            >
              <span className={css.newRunPlus} aria-hidden="true">+</span>
              <span className={css.newRunLabel}>New Run</span>
            </button>
          )}
        </li>
      </ul>
    </div>
  );
});
