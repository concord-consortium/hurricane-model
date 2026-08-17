import { clsx } from "clsx";
import { observer } from "mobx-react";
import React, { useEffect, useRef } from "react";

import { freezeEditableCard, liveSetupDiffersFromRun, setInteractiveState } from "../../models/interactive-state";
import { IRunSlot } from "../../models/multi-track";
import { namedRegions } from "../../types";
import { durationSteps } from "../../utils/run-outcomes";
import { useStores } from "../../stores-context";
import { IRunSetupSim, RunSummary, runLetter } from "./run-summary";
import { RunResult } from "./run-result";
import { RunThumbnail } from "./run-thumbnail";

import RestartIcon from "../../assets/restart.svg";
import DeleteIcon from "../../assets/left-panel/delete.svg";

import css from "./saved-tracks-section.scss";

// Scroll a container by `delta` px, smoothly (unless the learner prefers reduced motion). No-op at 0.
function scrollListBy(list: HTMLElement, delta: number) {
  if (!delta) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  list.scrollTo({ top: list.scrollTop + delta, behavior: reduce ? "auto" : "smooth" });
}

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
  const addRowRef = useRef<HTMLLIElement | null>(null);
  useEffect(() => {
    if (!stores.ui.leftPanelOpen) return;
    // When the bottom-most run is selected, scroll the add-a-run row (the prompt/buttons just below it)
    // into view instead of only the card — so the run AND the prompt beneath it both clear the bar.
    const runs = multiTrack.runs;
    const lastSelected = runs.length > 0 && runs[runs.length - 1].id === multiTrack.selectedRunId;
    const target = (lastSelected ? addRowRef.current : null) ?? selectedCardRef.current;
    if (!target) return;
    const list = target.parentElement; // the .runList scroll container
    if (!list) return;
    const style = getComputedStyle(list);
    // Below the safe line: clear the bottom bar (scroll-padding-bottom) plus 5px of breathing room.
    const bottomClearance = (parseFloat(style.scrollPaddingBottom) || 0) + 5;
    // Above the top: land the target at the FIRST card's resting spot (the list's scrollable padding-top),
    // not flush against the container edge.
    const topGap = parseFloat(style.paddingTop) || 0;
    const listRect = list.getBoundingClientRect();
    const rect = target.getBoundingClientRect();
    if (rect.bottom > listRect.bottom - bottomClearance) {
      // Target runs below the safe line (into/behind the bar): scroll up so its bottom clears the bar + 5px.
      scrollListBy(list, rect.bottom - (listRect.bottom - bottomClearance));
    } else if (rect.top < listRect.top) {
      // Target is offscreen above the container: scroll down so it lands at the first card's default spot.
      scrollListBy(list, -((listRect.top + topGap) - rect.top));
    }
  }, [multiTrack.selectedRunId, stores.ui.leftPanelOpen]);

  // When the add-a-run row changes what it shows — the Duplicate/New buttons after a run is captured,
  // or a prompt ("Complete the run(s)…" / "Pack full…") — bring that row into view so the learner sees
  // the next action without scrolling the list themselves. (It's always the last item, so we only need
  // the scroll-up case: pull it above the bottom bar's clearance.)
  const addRowMode = multiTrack.isFull
    ? "full"
    : multiTrack.hasEditableCard
      ? "editable"
      : multiTrack.runs.some(r => r.state) ? "addPair" : "addSingle";
  useEffect(() => {
    const row = addRowRef.current;
    if (!stores.ui.leftPanelOpen || !row) return;
    const list = row.parentElement; // the .runList scroll container
    if (!list) return;
    const style = getComputedStyle(list);
    const bottomClearance = (parseFloat(style.scrollPaddingBottom) || 0) + 5;
    const listRect = list.getBoundingClientRect();
    const rowRect = row.getBoundingClientRect();
    if (rowRect.bottom > listRect.bottom - bottomClearance) {
      scrollListBy(list, rowRect.bottom - (listRect.bottom - bottomClearance));
    }
  }, [addRowMode, stores.ui.leftPanelOpen]);

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

  // The card's Reset mirrors the bottom-bar Restart/Edit. For the currently loaded (selected) run it
  // restarts the live sim exactly like that button — including a run that was started then Stopped,
  // which has no captured state yet (so we restart the sim rather than reload old state). For any other
  // completed run it loads that run's setup and drops into edit mode.
  const handleCardRestart = (run: IRunSlot) => {
    if (run.id === multiTrack.selectedRunId) {
      simulation.restart();
      stores.ui.setNorthAtlanticView();
      if (run.state) multiTrack.editRun(run.id);
    } else {
      handleEdit(run);
    }
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

  // Delete a run. Deleting the *only* card doesn't empty the pack — the card stays and is reset to a
  // fresh editable default (so the pack, and the Compare "Run A" column that holds its place, never go
  // empty). Otherwise the run is removed normally.
  const handleDelete = (id: string) => {
    if (multiTrack.runs.length === 1) {
      multiTrack.resetRun(id); // keep the card, clear it back to "Not run yet" and select it
      multiTrack.autoCaptureSuppressed = true;
      if (multiTrack.defaultState) setInteractiveState(stores, multiTrack.defaultState);
      simulation.restart(false);
      multiTrack.autoCaptureSuppressed = false;
    } else {
      multiTrack.deleteRun(id);
    }
  };

  // Longest run lifetime in the pack, so each card's Category-over-time sparkline scales its width by
  // its own duration relative to this (a longer-lived storm reads as a wider trace) — mirrors the
  // Compare table so the cards' sparklines are comparable to one another.
  const maxRunDuration = Math.max(1, ...multiTrack.runs
    .filter(r => r.state)
    .map(r => durationSteps(r.state!.simulation)));

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
          // While editing a completed run, once any setup value changes its stored result (thumbnail +
          // peak/landfall/sparkline) no longer matches the setup — gray it out until it's re-run.
          const resultStale = editing && !!run.state && liveSetupDiffersFromRun(stores, run.state.simulation);
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
                    <div className={clsx({ [css.staleResult]: resultStale })}>
                      {run.state
                        ? <RunThumbnail sim={run.state.simulation} />
                        : <div className={css.resultPlaceholder}>Run to see result</div>}
                      <RunResult sim={run.state?.simulation ?? null} uid={run.id} maxDuration={maxRunDuration} />
                    </div>
                  </div>
                </div>
                {run.state && multiTrack.editingRunId === run.id && (
                  <span className={css.editingTag}>{running ? "Running…" : "Editing…"}</span>
                )}
                <button
                  type="button"
                  className={css.restartBtn}
                  disabled={simulation.simulationRunning ||
                    (selected
                      ? (!simulation.simulationStarted && !multiTrack.setupLocked)
                      : !run.state)}
                  aria-label={`Restart Run ${runLetter(i)} (edit setup)`}
                  title="Restart (edit setup)"
                  data-test="edit-run-button"
                  onClick={e => { e.stopPropagation(); handleCardRestart(run); }}
                >
                  <RestartIcon />
                </button>
                <button
                  type="button"
                  className={css.trash}
                  disabled={simulation.simulationRunning}
                  aria-label={`Delete Run ${runLetter(i)}`}
                  data-test="delete-run-button"
                  onClick={e => { e.stopPropagation(); handleDelete(run.id); }}
                >
                  <DeleteIcon />
                </button>
              </div>
            </li>
          );
        })}

        <li ref={addRowRef}>
          {multiTrack.isFull ? (
            <div className={css.addRunNote}>Pack full — delete a run to add another</div>
          ) : multiTrack.hasEditableCard ? (
            <div className={css.addRunNote}>Complete run(s) above to add another run</div>
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
