import { clsx } from "clsx";
import { observer } from "mobx-react";
import React from "react";

import { log } from "../../log";
import { IRunState } from "../../types/interactive-state";
import { useStores } from "../../stores-context";

import DeleteIcon from "../../assets/left-panel/delete.svg";
import RestartIcon from "../../assets/restart.svg";

import css from "./run-panel.scss";

interface IRunPanelProps {
  run: IRunState;
}

export const RunPanel = observer(function RunPanel({ run }: IRunPanelProps) {
  const { runs, simulation, ui } = useStores();
  const selected = run.id === runs.selectedRunId;
  const complete = runs.isRunComplete(run);

  const handleSelect = () => {
    if (selected) return;
    runs.selectRun(run.id);
    ui.setNorthAtlanticView();
    log("RunSelected", { runId: run.id, via: "panel" });
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
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

  return (
    <div
      className={clsx(css.runPanel, { [css.selected]: selected })}
      data-test="run-panel"
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={handleSelect}
      onKeyDown={handleKeyDown}
    >
      {selected &&
        <div className={css.runButtons}>
          <button
            type="button"
            aria-label="Reset run"
            data-test="reset-run-button"
            disabled={!complete}
            onClick={handleReset}
          >
            <RestartIcon />
          </button>
          <button
            type="button"
            aria-label="Delete run"
            data-test="delete-run-button"
            onClick={handleDelete}
          >
            <DeleteIcon />
          </button>
        </div>}
    </div>
  );
});
