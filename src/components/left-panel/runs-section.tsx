import { observer } from "mobx-react";
import React from "react";

import { log } from "../../log";
import { useStores } from "../../stores-context";
import { RunPanel } from "./run-panel";

import css from "./runs-section.scss";

export const RunsSection = observer(function RunsSection() {
  const { runs, ui } = useStores();

  const handleNewRun = () => {
    if (!runs.canAddRun) return;
    runs.addRun();
    ui.setNorthAtlanticView();
    log("RunAdded", { runId: runs.selectedRunId });
  };

  const handleCopySelectedRun = () => {
    if (!runs.canAddRun) return;
    const duplicatedRunId = runs.selectedRunId;
    runs.duplicateSelectedRun();
    ui.setNorthAtlanticView();
    log("RunDuplicated", { runId: runs.selectedRunId, duplicatedRunId });
  };

  return (
    <div className={css.runsSection} data-test="runs-section">
      {runs.runs.map(run => <RunPanel key={run.id} run={run} />)}
      {!runs.allComplete &&
        <div className={css.runsMessage} data-test="runs-message">
          Complete run(s) above to add another run
        </div>}
      {runs.allComplete && runs.atMaxRuns &&
        <div className={css.runsMessage} data-test="runs-message">
          Limit reached - delete a run to add another
        </div>}
      {runs.canAddRun &&
        <div className={css.addRunButtons}>
          <button
            type="button"
            className={css.addRunButton}
            data-test="duplicate-run-button"
            disabled={ui.isReadOnly}
            onClick={handleCopySelectedRun}
          >
            <span className={css.plusIcon} aria-hidden="true" />
            Copy Selected Run
          </button>
          <button
            type="button"
            className={css.addRunButton}
            data-test="new-run-button"
            disabled={ui.isReadOnly}
            onClick={handleNewRun}
          >
            <span className={css.plusIcon} aria-hidden="true" />
            New Run
          </button>
        </div>}
    </div>
  );
});
