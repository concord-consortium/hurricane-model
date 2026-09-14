import React from "react";

import { IRunState } from "../../../types/interactive-state";
import { setupRows } from "../../run-summary/run-summary-rows";
import { SummaryRows } from "./summary-rows";

import cardCss from "./run-card.scss";

interface IProps {
  run: IRunState;
}

export function RunSetup({ run }: IProps) {
  return (
    <div className={cardCss.summaryColumn} data-test="run-setup">
      <SummaryRows rows={setupRows} run={run} section="setup" />
    </div>
  );
}
