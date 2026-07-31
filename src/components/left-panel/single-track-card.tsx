import { clsx } from "clsx";
import { observer } from "mobx-react";
import React, { useState } from "react";

import { getInteractiveState } from "../../models/interactive-state";
import { namedRegions } from "../../types";
import { useStores } from "../../stores-context";
import { IRunSetupSim, RunSummary, runCategory, runLetter } from "./run-summary";

import css from "./single-track-card.scss";

/**
 * In single-run mode, once a run has completed, this card appears below the setup sections. Like a
 * Multi-track run card, its setup is locked (view-only, storm hidden) until "Edit this track" is
 * pressed. "Save to Multi-track" copies it into the first empty Multi-track slot; "Delete" resets
 * everything to defaults.
 */
export const SingleTrackCard = observer(function SingleTrackCard() {
  const stores = useStores();
  const { multiTrack, simulation } = stores;
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  if (multiTrack.enabled || !multiTrack.singleRun) return null;

  const sim: IRunSetupSim = {
    season: simulation.season,
    startLocation: simulation.startLocation,
    hurricane: { startingCategory: simulation.hurricane.startingCategory },
    pressureSystems: simulation.pressureSystems.map(ps => ps.serialize()),
    temperatureAnomalies: Object.fromEntries(namedRegions.map(r => [r, simulation.temperatureAnomalyAt(r)]))
  };
  const cat = runCategory(sim);
  const editing = multiTrack.singleTrackEditing;

  const handleSaveToMulti = () => {
    const runNumber = multiTrack.saveExternalRun(getInteractiveState(stores));
    if (runNumber == null) {
      setMessage({ text: "All Multi-track runs are taken — delete one to save.", error: true });
    } else {
      setMessage({ text: `Saved to Multi-track as Run ${runLetter(runNumber - 1)}.`, error: false });
    }
  };

  const handleEdit = () => {
    // Unlock for editing: the storm returns to its start (draggable), the old track greys to a ghost.
    simulation.restart(false);
    multiTrack.setSingleTrackEditing(true);
    setMessage(null);
  };

  const handleDelete = () => {
    // Reset everything to defaults; the storm returns to its default place and the card goes away.
    multiTrack.autoCaptureSuppressed = true;
    simulation.reset();
    multiTrack.autoCaptureSuppressed = false;
    multiTrack.deleteSingleRun();
    setMessage(null);
  };

  return (
    <div className={css.singleTrackCard} data-test="single-track-card">
      <div className={css.card}>
        <div className={css.cardHeader}>
          <span className={css.label}>Current Run</span>
          {editing && <span className={css.editingTag}>Editing…</span>}
        </div>
        <div className={css.catRow}>
          <span className={css.catDot} style={{ backgroundColor: cat.color }} />
          <span>{cat.label}</span>
        </div>
        <RunSummary sim={sim} />
        <div className={css.actions}>
          {!editing && (
            <button
              type="button"
              className={css.saveBtn}
              data-test="save-to-multitrack-button"
              onClick={handleSaveToMulti}
            >
              Save to Multi-track
            </button>
          )}
          {!editing && (
            <button
              type="button"
              className={css.secondaryBtn}
              data-test="edit-single-button"
              onClick={handleEdit}
            >
              Edit this track
            </button>
          )}
          <button
            type="button"
            className={css.deleteBtn}
            data-test="delete-single-button"
            onClick={handleDelete}
          >
            Delete
          </button>
        </div>
        {message && (
          <div className={clsx(css.message, { [css.error]: message.error })} data-test="save-message">
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
});
