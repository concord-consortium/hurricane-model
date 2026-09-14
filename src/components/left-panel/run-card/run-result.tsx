import { clsx } from "clsx";
import { observer } from "mobx-react";
import React from "react";

import { useStores } from "../../../stores-context";
import { IRunState } from "../../../types/interactive-state";
import { resultRows } from "../../run-summary/run-summary-rows";
import { RunThumbnail } from "./run-thumbnail";
import { CardSummaryRows } from "./card-summary-rows";

import cardCss from "./run-card.scss";
import css from "./run-result.scss";

interface IRunResultProps {
  run: IRunState;
}

export const RunResult = observer(function RunResult({ run }: IRunResultProps) {
  const { runs } = useStores();
  const result = runs.getSimulationResult(run);

  return (
    <>
      <RunThumbnail result={result} run={run} />
      <div className={clsx(cardCss.summaryColumn, css.runResult)}>
        <CardSummaryRows rows={resultRows} run={run} section="result" />
      </div>
    </>
  );
});
