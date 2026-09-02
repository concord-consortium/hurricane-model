import { clsx } from "clsx";
import React, { useLayoutEffect, useRef, useState } from "react";

import { ISimulationState } from "../../../types/interactive-state";
import { categoryLabel } from "../../../utils/hurricane-categories";
import { intensitySeries, landfallSummary, peakCategory } from "../../../utils/run-outcomes";
import { CategorySparkline } from "./category-sparkline";

import CategoryOverTimeIcon from "../../../assets/left-panel/category-over-time.svg";
import LandfallIcon from "../../../assets/left-panel/landfall.svg";
import PeakCategoryIcon from "../../../assets/left-panel/peak-category.svg";

import categoryCss from "../../hurricane-category.scss";
import cardCss from "./run-card.scss";
import css from "./run-result.scss";

// Fallback sparkline width (px) used until its slot is measured on the first layout pass.
const fallbackSparklineWidth = 83;

interface IRunResultProps {
  // A completed run's captured state; null before the run completes (every value reads "—").
  sim: ISimulationState | null;
  uid: string;
  // The longest run's duration across all runs, used to scale this sparkline's width so the cards
  // read relative to one another. When omitted the sparkline uses the full slot width.
  maxDuration?: number;
}

export function RunResult({ sim, uid, maxDuration }: IRunResultProps) {
  const peak = sim ? peakCategory(sim) : null;
  const landfalls = sim ? landfallSummary(sim) : null;
  const series = sim ? intensitySeries(sim) : [];
  const duration = sim?.hurricaneTrack.length ?? 0;

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
          {series.length > 0 ? <CategorySparkline series={series} uid={uid} widthPx={sparklineWidth} /> : dash}
        </span>
      </div>
    </div>
  );
}
