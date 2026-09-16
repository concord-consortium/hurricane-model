import { clsx } from "clsx";
import { observer } from "mobx-react";
import React from "react";

import { useStores } from "../../../stores-context";
import { IRunState } from "../../../types/interactive-state";
import { IRunSummaryRow, resolveIconClassName } from "../../run-summary/run-summary-rows";

import cardCss from "./run-card.scss";

interface IProps {
  rows: IRunSummaryRow[];
  run: IRunState;
  section: "setup" | "result";
}

export const CardSummaryRows = observer(function CardSummaryRows({ rows, run, section }: IProps) {
  const { runs } = useStores();
  return (
    <>
      {rows.map(row => {
        const { key, Icon, Value } = row;
        return (
          <div key={key} className={cardCss.categoryRow} data-test={`${section}-${key}`}>
            <Icon aria-hidden={true} className={clsx(cardCss.icon, resolveIconClassName(row, runs, run))} />
            <Value run={run} hideIcon />
          </div>
        );
      })}
    </>
  );
});
