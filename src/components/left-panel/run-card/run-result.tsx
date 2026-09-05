import { clsx } from "clsx";
import { observer } from "mobx-react";
import React, { useLayoutEffect, useRef, useState } from "react";

import { useStores } from "../../../stores-context";
import { IRunState } from "../../../types/interactive-state";
import { categoryLabel } from "../../../utils/hurricane-categories";
import { intensitySeries, landfallSummary, peakCategory } from "../../../utils/run-outcomes";
import { CategorySparkline } from "./category-sparkline";
import { RunThumbnail } from "./run-thumbnail";

import CategoryOverTimeIcon from "../../../assets/left-panel/category-over-time.svg";
import LandfallIcon from "../../../assets/left-panel/landfall.svg";
import PeakCategoryIcon from "../../../assets/left-panel/peak-category.svg";

import categoryCss from "../../hurricane-category.scss";
import cardCss from "./run-card.scss";
import css from "./run-result.scss";

// Fallback sparkline width (px) used until its slot is measured on the first layout pass.
const fallbackSparklineWidth = 83;

interface IRunResultProps {
  run: IRunState;
}

export const RunResult = observer(function RunResult({ run }: IRunResultProps) {
  const { runs } = useStores();
  const { maxDuration } = runs;
  const result = runs.getSimulationResult(run);
  const peak = peakCategory(result);
  const landfalls = landfallSummary(result);
  const series = intensitySeries(result);
  const duration = result?.time ?? 0;

  // Measure the sparkline's slot (the flex space after the icon) so the longest-lived run's trace
  // fills it, with shorter runs scaled proportionally.
  const slotRef = useRef<HTMLSpanElement>(null);
  const [slotWidth, setSlotWidth] = useState(0);
  useLayoutEffect(() => {
    const slot = slotRef.current;
    if (!slot || typeof ResizeObserver === "undefined") return;
    const measure = () => setSlotWidth(slot.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(slot);
    return () => observer.disconnect();
  }, []);

  const maxSparklineWidth = slotWidth > 0 ? slotWidth : fallbackSparklineWidth;
  const sparklineWidth = maxDuration && maxDuration > 0
    ? (duration / maxDuration) * maxSparklineWidth
    : maxSparklineWidth;

  const dash = <span className={css.dash}>—</span>;
  const peakFillClass = peak !== null ? categoryCss["category" + peak] : css.fillWhite;
  const rowClasses = clsx(cardCss.categoryRow, css.categoryRow);

  return (
    <>
      <RunThumbnail result={result} run={run} />
      <div className={clsx(cardCss.summaryColumn, css.runResult)}>
        <div className={rowClasses} data-test="result-peak-category">
          <PeakCategoryIcon aria-hidden={true} className={clsx(cardCss.icon, peakFillClass)} />
          {peak !== null ? <span>{categoryLabel(peak)}</span> : dash}
        </div>
        <div className={rowClasses} data-test="result-landfalls">
          <LandfallIcon aria-hidden={true} className={cardCss.icon} />
          {landfalls ? <span>{landfalls.count === 0 ? "None" : `${landfalls.count}×`}</span> : dash}
        </div>
        <div className={clsx(rowClasses, css.sparklineRow)} data-test="result-category-over-time">
          <CategoryOverTimeIcon aria-hidden={true} className={clsx(cardCss.icon, css.fillWhite)} />
          <span ref={slotRef} className={css.sparklineSlot}>
            {series.length > 0 ? <CategorySparkline series={series} widthPx={sparklineWidth} /> : dash}
          </span>
        </div>
      </div>
    </>
  );
});
