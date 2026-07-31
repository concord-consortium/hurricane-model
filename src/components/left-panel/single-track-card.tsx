import { clsx } from "clsx";
import { observer } from "mobx-react";
import React, { useState } from "react";

import { getInteractiveState } from "../../models/interactive-state";
import { namedRegions } from "../../types";
import { useStores } from "../../stores-context";
import { IRunSetupSim, RunSummary, runCategory } from "./run-summary";

import css from "./single-track-card.scss";

/**
 * In single-run mode, once a run has completed, this card appears below the setup sections. It looks
 * like a Multi-track run card but is always editable (it mirrors the current run), and adds a
 * "Save to Multi-track" button that copies the run into the first empty Multi-track slot.
 */
export const SingleTrackCard = observer(function SingleTrackCard() {
  const stores = useStores();
  const { multiTrack, simulation } = stores;
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  const runComplete =
    simulation.simulationStarted && !simulation.simulationRunning && simulation.simulationFinished;
  if (multiTrack.enabled || !runComplete) return null;

  const sim: IRunSetupSim = {
    season: simulation.season,
    startLocation: simulation.startLocation,
    hurricane: { startingCategory: simulation.hurricane.startingCategory },
    pressureSystems: simulation.pressureSystems.map(ps => ps.serialize()),
    temperatureAnomalies: Object.fromEntries(namedRegions.map(r => [r, simulation.temperatureAnomalyAt(r)]))
  };
  const cat = runCategory(sim);

  const handleSave = () => {
    const runNumber = multiTrack.saveExternalRun(getInteractiveState(stores));
    if (runNumber == null) {
      setMessage({ text: "All Multi-track runs are taken — delete one to save.", error: true });
    } else {
      setMessage({ text: `Saved to Multi-track as Run ${runNumber}.`, error: false });
    }
  };

  return (
    <div className={css.singleTrackCard} data-test="single-track-card">
      <div className={css.card}>
        <div className={css.cardHeader}>
          <span className={css.label}>Current Run</span>
        </div>
        <div className={css.catRow}>
          <span className={css.catDot} style={{ backgroundColor: cat.color }} />
          <span>{cat.label}</span>
        </div>
        <RunSummary sim={sim} />
        <button
          type="button"
          className={css.saveBtn}
          data-test="save-to-multitrack-button"
          onClick={handleSave}
        >
          Save to Multi-track
        </button>
        {message && (
          <div className={clsx(css.message, { [css.error]: message.error })} data-test="save-message">
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
});
