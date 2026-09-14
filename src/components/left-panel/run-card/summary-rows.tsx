import { clsx } from "clsx";
import React from "react";

import { IRunState } from "../../../types/interactive-state";
import { IRunSummaryRow } from "../../run-summary/run-summary-rows";

import cardCss from "./run-card.scss";

interface IProps {
  rows: IRunSummaryRow[];
  run: IRunState;
  section: "setup" | "result";
}

export function SummaryRows({ rows, run, section }: IProps) {
  return (
    <>
      {rows.map(({ key, Icon, iconClassName, Value, valueHasIcon }) => (
        <div key={key} className={cardCss.categoryRow} data-test={`${section}-${key}`}>
          {!valueHasIcon && <Icon aria-hidden={true} className={clsx(cardCss.icon, iconClassName)} />}
          <Value run={run} />
        </div>
      ))}
    </>
  );
}
