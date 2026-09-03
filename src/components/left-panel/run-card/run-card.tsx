import { clsx } from "clsx";
import { observer } from "mobx-react";
import React from "react";

import { log } from "../../../log";
import { IRunState } from "../../../types/interactive-state";
import { useStores } from "../../../stores-context";
import { RunResult } from "./run-result";
import { IRunSetup, RunSetupSummary } from "./run-setup-summary";
import { RunThumbnail } from "./run-thumbnail";

import DeleteIcon from "../../../assets/left-panel/delete.svg";
import RestartIcon from "../../../assets/left-panel/restart.svg";

import css from "./run-card.scss";
import runsCss from "../runs-section.scss";

interface IRunCardProps {
  run: IRunState;
}

export const RunCard = observer(function RunCard({ run }: IRunCardProps) {
  const { runs, simulation, ui } = useStores();
  const selected = runs.isSelected(run.id);
  const complete = runs.isRunComplete(run);
  const letter = runs.runLetter(run);

  // The selected run's stored record can be stale — the live simulation is its source of truth.
  // TODO: `getSimulation` calls serializeSimulation on the active simulation on every tick. It would be more better to
  // directly use `simulation` when the run is selected, but that would require processing individual fields separately.
  const simulationState = runs.getSimulation(run);
  const { season, startLocation, hurricane, temperatureAnomalies } = simulationState;
  // A legacy run has no separate setup; its pressureSystems are the setup.
  const pressureSystems = simulationState.pressureSystemsSetup ?? simulationState.pressureSystems;
  const setup: IRunSetup = {
    season, startLocation, startingCategory: hurricane.startingCategory, pressureSystems, temperatureAnomalies
  };

  // A completed run's outcome for the result column; null until the run completes.
  const resultSim = !complete ? null : simulationState;

  const handleSelect = () => {
    if (selected) return;
    if (simulation.inProgress && !ui.isReadOnly) simulation.restart();
    runs.selectRun(run.id);
    ui.setNorthAtlanticView();
    log("RunSelected", { runId: run.id, via: "panel" });
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleSelect();
    }
  };

  const handleReset = (event: React.MouseEvent) => {
    event.stopPropagation();
    log("SimulationEnded", { reason: "RunReset", outcome: simulation.getOutcomeData() });
    runs.resetSelectedRun();
    ui.setNorthAtlanticView();
    log("RunReset", { runId: run.id });
  };

  const handleDelete = (event: React.MouseEvent) => {
    event.stopPropagation();
    runs.deleteRun(run.id);
    ui.setNorthAtlanticView();
    log("RunDeleted", { runId: run.id });
  };

  const statusMessage = complete ? ""
    : selected && simulation.simulationRunning ? "Running..."
    : selected && simulation.simulationStarted ? "Paused"
    : "Not run yet - editable";
  const labelStatusMessage = statusMessage ? `, ${statusMessage}` : "";

  return (
    <div className={css.runCardContainer}>
      <div
        className={clsx(css.runCard, { [css.selected]: selected, [css.incomplete]: !complete })}
        data-test="run-card"
        role="button"
        tabIndex={0}
        aria-label={`Run ${letter}${labelStatusMessage}`}
        aria-pressed={selected}
        onClick={handleSelect}
        onKeyDown={handleKeyDown}
      >
        <div className={css.runCardHeader}>
          <div className={css.runLabel} data-test="run-label">{letter}</div>
          <div
            aria-label="Run status"
            className={clsx(css.runStatus, runsCss.runsMessage)}
            data-test="run-status"
          >
            {statusMessage}
          </div>
        </div>
        <div className={css.runCardBody}>
          <div className={css.cardColumn}>
            <div className={css.cardColumnHeading}>Setup</div>
            <RunSetupSummary setup={setup} />
          </div>
          <div className={css.cardColumn}>
            <div className={css.cardColumnHeading}>Result</div>
            <RunThumbnail sim={resultSim} />
            <RunResult sim={resultSim} runId={run.id} maxDuration={runs.maxDuration} />
          </div>
        </div>
      </div>
      {selected &&
        <div className={css.runButtons}>
          <button
            type="button"
            aria-label="Reset run"
            data-test="reset-run-button"
            disabled={!complete || simulation.simulationRunning || ui.isReadOnly}
            onClick={handleReset}
          >
            <RestartIcon aria-hidden={true} />
          </button>
          <button
            type="button"
            aria-label="Delete run"
            data-test="delete-run-button"
            disabled={simulation.simulationRunning || ui.isReadOnly}
            onClick={handleDelete}
          >
            <DeleteIcon aria-hidden={true} />
          </button>
        </div>
      }
    </div>
  );
});
