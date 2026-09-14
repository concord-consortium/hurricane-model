import { clsx } from "clsx";
import { observer } from "mobx-react";
import React from "react";

import { log } from "../../../log";
import { IRunState } from "../../../types/interactive-state";
import { useStores } from "../../../stores-context";
import { selectRun } from "../../../utils/multitrack";
import { resultRows, setupRows } from "../../run-summary/run-summary-rows";
import { RunThumbnail } from "./run-thumbnail";
import { SummaryRows } from "./summary-rows";

import DeleteIcon from "../../../assets/left-panel/delete.svg";
import RestartIcon from "../../../assets/left-panel/restart.svg";

import css from "./run-card.scss";
import runsCss from "../runs-section.scss";

interface IRunCardProps {
  run: IRunState;
}

export const RunCard = observer(function RunCard({ run }: IRunCardProps) {
  const stores = useStores();
  const { runs, simulation, ui } = stores;
  const selected = runs.isSelected(run.id);
  const complete = runs.isRunComplete(run);
  const letter = runs.runLetter(run);

  const handleSelect = () => selectRun(stores, run, "panel");

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

  const status = runs.runStatus(run);
  const statusMessage = status === "Not run yet" ? `${status} - editable` : status;
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
            <div className={css.summaryColumn}>
              <SummaryRows rows={setupRows} run={run} section="setup" />
            </div>
          </div>
          <div className={css.cardColumn}>
            <div className={css.cardColumnHeading}>Result</div>
            <RunThumbnail result={runs.getSimulationResult(run)} run={run} />
            <div className={clsx(css.summaryColumn, css.resultSummary)}>
              <SummaryRows rows={resultRows} run={run} section="result" />
            </div>
          </div>
        </div>
      </div>
      {selected &&
        <div className={css.runButtons}>
          <button
            type="button"
            aria-label="Reset run"
            data-test="reset-run-button"
            disabled={!simulation.simulationStarted || ui.isReadOnly}
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
