import { clsx } from "clsx";
import { observer } from "mobx-react";
import React, { useLayoutEffect, useRef, useState } from "react";

import { resolveStartLocation } from "../../models/simulation";
import { useStores } from "../../stores-context";
import { namedRegions, seasonLabels } from "../../types";
import { IRunState } from "../../types/interactive-state";
import { categoryLabel } from "../../utils/hurricane-categories";
import { formatLatLng } from "../../utils/lat-long";
import { pressureSystemReport } from "../../utils/pressure-systems";
import { anomalyText, temperatureAnomalyRegions } from "../../utils/regions";
import { intensitySeries, landfallSummary, peakCategory } from "../../utils/run-outcomes";
import { CategorySparkline } from "./category-sparkline";

import HurricaneIcon from "../../assets/left-panel/hurricane.svg";

import categoryCss from "../hurricane-category.scss";
import css from "./run-summary.scss";

// Used until the sparkline's slot has been measured on the first layout pass.
const fallbackSparklineWidth = 83;

export type SvgIcon = React.ComponentType<React.SVGProps<SVGSVGElement>>;

export interface IRunSummaryValueProps {
  run: IRunState;
  // Width the longest-lived run's sparkline fills; shorter runs scale down proportionally.
  // When omitted the value measures its own slot.
  maxSparklineWidth?: number;
  hideIcon?: boolean;
}

export function Dash() {
  return <span className={css.dash}>—</span>;
}

export function categoryIconClass(category: number | null): string {
  return category !== null ? categoryCss["category" + category] : css.fillWhite;
}

interface ICategoryValueProps {
  category: number | null;
  hideIcon?: boolean;
}

function CategoryValue({ category, hideIcon }: ICategoryValueProps) {
  return (
    <span className={css.categoryValue}>
      {!hideIcon && <HurricaneIcon aria-hidden={true} className={clsx(css.icon, categoryIconClass(category))} />}
      {category !== null ? <span>{categoryLabel(category)}</span> : <Dash />}
    </span>
  );
}

export const StartLocationValue = observer(function StartLocationValue({ run }: IRunSummaryValueProps) {
  const { runs } = useStores();
  const start = resolveStartLocation(runs.getSimulationSetup(run).startLocation);
  return <span className={css.singleLine}>{formatLatLng(start.lat, start.lng)}</span>;
});

export const StartingCategoryValue = observer(function StartingCategoryValue(
  { run, hideIcon }: IRunSummaryValueProps
) {
  const { runs } = useStores();
  return <CategoryValue category={runs.getStartingCategory(run)} hideIcon={hideIcon} />;
});

export const SeasonValue = observer(function SeasonValue({ run }: IRunSummaryValueProps) {
  const { runs } = useStores();
  const { season } = runs.getSimulationSetup(run);
  return <span>{seasonLabels[season] ?? season}</span>;
});

export const SeaSurfaceTempValue = observer(function SeaSurfaceTempValue({ run }: IRunSummaryValueProps) {
  const { runs } = useStores();
  const { temperatureAnomalies } = runs.getSimulationSetup(run);
  const anomalies = namedRegions
    .map(region => ({
      label: temperatureAnomalyRegions[region].shortLabel,
      value: temperatureAnomalies?.[region] ?? 0
    }))
    .filter(a => a.value !== 0);

  return (
    <span className={css.stackedLines}>
      {anomalies.length === 0 && <span>Baseline</span>}
      {anomalies.map(a => (
        <span key={a.label} className={a.value > 0 ? css.warm : css.cool}>
          {a.label} {anomalyText(a.value)}
        </span>
      ))}
    </span>
  );
});

export const PressureSystemsValue = observer(function PressureSystemsValue({ run }: IRunSummaryValueProps) {
  const { runs } = useStores();
  const report = pressureSystemReport(runs.getSimulationSetup(run).pressureSystemsSetup);
  return (
    <span className={css.stackedLines}>
      {report.map((r, i) => (
        <span key={i} className={css.pressureSystem}>
          <span className={r.type === "high" ? css.high : css.low}>{r.label}:</span>
          {" "}
          <span className={css.pressureDetail}>
            <span>{r.position},</span>
            {" "}
            <span>{r.mb}</span>
          </span>
        </span>
      ))}
    </span>
  );
});

export const PeakCategoryValue = observer(function PeakCategoryValue(
  { run, hideIcon }: IRunSummaryValueProps
) {
  const { runs } = useStores();
  return <CategoryValue category={peakCategory(runs.getSimulationResult(run))} hideIcon={hideIcon} />;
});

export const LandfallValue = observer(function LandfallValue({ run }: IRunSummaryValueProps) {
  const { runs } = useStores();
  const landfalls = landfallSummary(runs.getSimulationResult(run));
  if (!landfalls) return <Dash />;
  return <span>{landfalls.count === 0 ? "None" : `${landfalls.count}×`}</span>;
});

function useMeasuredWidth(ref: React.RefObject<HTMLElement | null>, enabled: boolean) {
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!enabled || !element) return;
    const measure = () => setWidth(element.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, enabled]);
  return width;
}

export const CategoryOverTimeValue = observer(function CategoryOverTimeValue(
  { run, maxSparklineWidth }: IRunSummaryValueProps
) {
  const { runs } = useStores();
  const result = runs.getSimulationResult(run);
  const series = intensitySeries(result);
  const slotRef = useRef<HTMLSpanElement>(null);
  const measuredWidth = useMeasuredWidth(slotRef, maxSparklineWidth === undefined);

  const maxWidth = maxSparklineWidth ?? (measuredWidth > 0 ? measuredWidth : fallbackSparklineWidth);
  const duration = result?.time ?? 0;
  const { maxDuration } = runs;
  const width = maxDuration > 0 ? (duration / maxDuration) * maxWidth : maxWidth;

  return (
    <span ref={slotRef} className={css.sparklineSlot}>
      {series.length > 0 ? <CategorySparkline series={series} widthPx={width} /> : <Dash />}
    </span>
  );
});
