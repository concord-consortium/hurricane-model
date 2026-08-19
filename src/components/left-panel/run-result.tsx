import { clsx } from "clsx";
import React, { useLayoutEffect, useRef, useState } from "react";

import { ISimulationState } from "../../types/interactive-state";
import { durationSteps, intensitySeries, landfallSummary, peakCategory } from "../../utils/run-outcomes";
import { CategorySparkline } from "./category-sparkline";
import { categoryChip } from "./run-summary";

import PeakCategoryIcon from "../../assets/left-panel/peak-category.svg";
import LandfallIcon from "../../assets/left-panel/landfall.svg";
import CategoryOverTimeIcon from "../../assets/left-panel/category-over-time.svg";

import categoryCss from "../hurricane-category.scss";
import css from "./run-result.scss";

// Fallback max sparkline width (px) used until the slot is measured on the first layout pass.
const LIFE_W_FALLBACK = 83;
// Gap kept between the widest trace and the slot's right edge. The slot's right edge is already the
// result column's edge, which sits 10px inside the card's visual edge (the card's 10px right padding),
// so 0 here yields the intended ~10px from the card edge.
const SPARK_RIGHT_GAP = 0;

// The three result read-outs under a run card's thumbnail — peak category, landfalls, and the
// category-over-time sparkline. Mirrors the Compare table's Result rows. `sim` is a completed run's
// captured state; before a run it's null and every value reads "—". `maxDuration` is the longest run's
// lifetime across the pack, used to scale this sparkline's width so the cards read relative to one
// another (a longer-lived storm gets a wider trace); when omitted the sparkline uses full width.
export function RunResult({ sim, uid, maxDuration }:
  { sim: ISimulationState | null; uid: string; maxDuration?: number }) {
  const peak = sim ? categoryChip(peakCategory(sim)) : null;
  const landfall = sim ? landfallSummary(sim) : null;
  const series = sim ? intensitySeries(sim) : [];
  const duration = sim ? durationSteps(sim) : 0;

  // Measure the sparkline's slot (the flex space after the icon) so the longest-lived run's trace fills
  // it to SPARK_RIGHT_GAP from the result column's right edge, with shorter runs scaled proportionally.
  const slotRef = useRef<HTMLSpanElement>(null);
  const [slotW, setSlotW] = useState(0);
  useLayoutEffect(() => {
    const el = slotRef.current;
    if (!el) return;
    const measure = () => setSlotW(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const maxSparkW = Math.max(0, (slotW > 0 ? slotW : LIFE_W_FALLBACK) - SPARK_RIGHT_GAP);
  const sparkWidth = maxDuration && maxDuration > 0 ? (duration / maxDuration) * maxSparkW : maxSparkW;
  const dash = <span className={css.dash}>—</span>;
  // Peak Category's two-tone icon: white before a run (outline only); after, the peak category's
  // color (same palette the app colors the hurricane with). Category Over Time stays white always.
  const peakFillClass = peak ? categoryCss["category" + peak.index] : css.fillWhite;

  return (
    <div className={css.runResult}>
      <div className={css.row}>
        <PeakCategoryIcon className={clsx(css.icon, peakFillClass)} />
        {peak ? <span>{peak.label}</span> : dash}
      </div>
      <div className={css.row}>
        <LandfallIcon className={css.icon} />
        {landfall ? <span>{landfall.count === 0 ? "None" : `${landfall.count}×`}</span> : dash}
      </div>
      <div className={clsx(css.row, css.sparkRow)}>
        <CategoryOverTimeIcon className={clsx(css.icon, css.fillWhite)} />
        <span ref={slotRef} className={css.sparkSlot}>
          {series.length > 0 ? <CategorySparkline series={series} uid={uid} widthPx={sparkWidth} /> : dash}
        </span>
      </div>
    </div>
  );
}
