import { clsx } from "clsx";
import { observer } from "mobx-react";
import React from "react";

import { log } from "../../log";
import { IRunState } from "../../types/interactive-state";
import { useStores } from "../../stores-context";

import DeleteIcon from "../../assets/left-panel/delete.svg";
import RestartIcon from "../../assets/left-panel/restart.svg";

import css from "./run-card.scss";
import runsCss from "./runs-section.scss";

interface IRunCardProps {
  run: IRunState;
}

export const RunCard = observer(function RunCard({ run }: IRunCardProps) {
  const { runs, simulation, ui } = useStores();
  const selected = run.id === runs.selectedRunId;
  const complete = runs.isRunComplete(run);
  const runNumber = runs.runs.indexOf(run) + 1;

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

  return (
    <div className={css.runCardContainer}>
      <div
        className={clsx(css.runCard, { [css.selected]: selected, [css.incomplete]: !complete })}
        data-test="run-card"
        role="button"
        tabIndex={0}
        aria-label={`Run ${runNumber}`}
        aria-pressed={selected}
        onClick={handleSelect}
        onKeyDown={handleKeyDown}
      >
        <div className={css.runCardHeader}>
          <div className={css.runLabel} />
          <div
            aria-label="Run status"
            className={clsx(css.runStatus, runsCss.runsMessage)}
            data-test="run-status"
          >
            {statusMessage}
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
