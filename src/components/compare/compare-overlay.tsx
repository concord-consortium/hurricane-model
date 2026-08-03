import { clsx } from "clsx";
import { observer } from "mobx-react";
import React from "react";

import { setInteractiveState } from "../../models/interactive-state";
import { namedRegions, seasonLabels } from "../../types";
import { IHurricaneInteractiveState } from "../../types/interactive-state";
import { useStores } from "../../stores-context";
import { temperatureAnomalyRegions } from "../../utils/regions";
import { durationSteps, intensitySeries, landfallSummary, peakCategory, pressureSignature } from "../../utils/run-outcomes";
import { resolveStartLocation } from "../../models/simulation";
import { categoryChip, runLetter } from "../left-panel/run-summary";

import css from "./compare-overlay.scss";

// Darker, legible-on-white strokes for the intensity sparkline, indexed by category (the Saffir–
// Simpson fills are too pale to read as a thin line for TS/Cat 1).
const SPARK_STROKE = ["#9a9a9a", "#c9a400", "#e0a020", "#d97a1e", "#c85a10", "#e03b3b"];

// A category sparkline for one run: the storm's category (0..5) at each track point.
function Sparkline({ series, color }: { series: number[]; color: string }) {
  const w = 76, h = 22, pad = 2;
  if (series.length === 0) return <span className={css.noData}>—</span>;
  const n = series.length;
  const x = (i: number) => n <= 1 ? w / 2 : pad + (i / (n - 1)) * (w - 2 * pad);
  const y = (c: number) => h - pad - (c / 5) * (h - 2 * pad);
  const pts = series.map((c, i) => `${x(i).toFixed(1)},${y(c).toFixed(1)}`).join(" ");
  const area = `${pad},${h - pad} ${pts} ${(w - pad)},${h - pad}`;
  return (
    <svg className={css.spark} width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <polygon points={area} fill={color} opacity={0.18} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.75}
        strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function CatChip({ category }: { category: number | undefined }) {
  const c = categoryChip(category);
  return <span className={css.catChip} style={{ backgroundColor: c.color }}>{c.label}</span>;
}

/**
 * Floating overlay on the map that compares every saved Multi-track run side by side. Setup rows
 * (what the learner changed) and result rows (what the storm did) are laid out as a table with a
 * column per run; rows whose values are identical across all runs are dimmed and tagged "same" so
 * the rows that actually differ stand out. Clicking a column header selects that run (lighting its
 * track on the map).
 */
export const CompareOverlay = observer(function CompareOverlay() {
  const stores = useStores();
  const { multiTrack, simulation, ui } = stores;

  if (!multiTrack.enabled || !ui.compareOpen) return null;

  const completed = multiTrack.runs
    .map((slot, index) => ({ slot, index }))
    .filter(r => r.slot.state);

  const data = completed.map(({ slot, index }) => {
    const sim = slot.state!.simulation;
    const start = resolveStartLocation(sim.startLocation);
    const landfall = landfallSummary(sim);
    return {
      id: slot.id,
      letter: runLetter(index),
      startCat: sim.hurricane.startingCategory,
      location: `${start.lat.toFixed(1)}°, ${start.lng.toFixed(1)}°`,
      season: seasonLabels[sim.season] ?? sim.season,
      anomalies: namedRegions
        .map(rg => ({ label: temperatureAnomalyRegions[rg].label, v: sim.temperatureAnomalies?.[rg] ?? 0 }))
        .filter(a => a.v !== 0),
      pressureSig: pressureSignature(sim),
      pressures: (sim.pressureSystems || []).map(ps => (ps.type === "high" ? "H" : "L")),
      peak: peakCategory(sim),
      landfall,
      landfallText: landfall.count === 0 ? "None" : `${landfall.count}×, ${categoryChip(landfall.peakCategory).label}`,
      duration: durationSteps(sim)
    };
  });

  const maxDuration = Math.max(1, ...data.map(d => d.duration));
  const differs = (vals: string[]) => new Set(vals).size > 1;

  const selectRun = (id: string, state: IHurricaneInteractiveState) => {
    multiTrack.selectRun(id);
    multiTrack.autoCaptureSuppressed = true;
    setInteractiveState(stores, state);
    simulation.restart(false);
    multiTrack.autoCaptureSuppressed = false;
  };

  // A diff-aware data row: `cmp` drives same/diff detection, `render` draws each run's cell.
  const Row = (label: string, cmp: string[], render: (i: number) => React.ReactNode) => {
    const diff = differs(cmp);
    return (
      <tr className={clsx(css.dataRow, diff ? css.diff : css.same)}>
        <th scope="row" className={css.rowLabel}>
          <span>{label}</span>
          {!diff && <span className={css.sameTag}>same</span>}
        </th>
        {data.map((d, i) => (
          <td key={d.id} className={clsx({ [css.selCell]: d.id === multiTrack.selectedRunId })}>
            {render(i)}
          </td>
        ))}
      </tr>
    );
  };

  return (
    <div className={css.overlay} data-test="compare-overlay" role="region" aria-label="Compare runs">
      <header className={css.header}>
        <span className={css.title}>Compare runs</span>
        <span className={css.legend}><span className={css.diffDot} /> differs · <span className={css.sameWord}>same</span> unchanged</span>
        <button type="button" className={css.close} data-test="compare-close"
          aria-label="Close compare" onClick={() => ui.setCompareOpen(false)}>
          ×
        </button>
      </header>

      <div className={css.scroll}>
        <table className={css.table}>
          <thead>
            <tr>
              <th className={css.corner} />
              {data.map(d => (
                <th key={d.id}
                  className={clsx(css.runHead, { [css.selHead]: d.id === multiTrack.selectedRunId })}
                  onClick={() => selectRun(d.id, multiTrack.runs.find(r => r.id === d.id)!.state!)}
                  title="Select this run on the map">
                  <span className={css.runBadge}>{d.letter}</span>
                  <CatChip category={d.startCat} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className={css.groupRow}><th colSpan={data.length + 1}>Setup — what you changed</th></tr>
            {Row("Storm Location", data.map(d => d.location), i => <span className={css.mono}>{data[i].location}</span>)}
            {Row("Storm Category", data.map(d => String(d.startCat ?? 0)), i => <CatChip category={data[i].startCat} />)}
            {Row("Season", data.map(d => d.season), i => data[i].season)}
            {Row("Sea Surface Temp", data.map(d => JSON.stringify(d.anomalies)), i => (
              data[i].anomalies.length === 0
                ? <span className={css.muted}>Baseline</span>
                : <span className={css.chips}>{data[i].anomalies.map(a => (
                    <span key={a.label} className={clsx(css.chip, a.v > 0 ? css.warm : css.cool)}>
                      {a.label} {a.v > 0 ? "+" : "−"}{Math.abs(a.v)}°
                    </span>))}</span>
            ))}
            {Row("Pressure Systems", data.map(d => d.pressureSig), i => (
              <span className={css.chips}>{data[i].pressures.map((p, k) => (
                <span key={k} className={clsx(css.chip, p === "H" ? css.high : css.low)}>{p}</span>))}</span>
            ))}

            <tr className={css.groupRow}><th colSpan={data.length + 1}>Result — what happened</th></tr>
            {Row("Peak Category", data.map(d => String(d.peak)), i => <CatChip category={data[i].peak} />)}
            {Row("Landfall", data.map(d => d.landfallText), i => (
              data[i].landfall.count === 0
                ? <span className={css.muted}>None</span>
                : <span>{data[i].landfall.count}× · <CatChip category={data[i].landfall.peakCategory} /></span>
            ))}
            <tr className={clsx(css.dataRow, css.plain)}>
              <th scope="row" className={css.rowLabel}><span>Lifetime</span></th>
              {data.map(d => (
                <td key={d.id} className={clsx({ [css.selCell]: d.id === multiTrack.selectedRunId })}>
                  <span className={css.bar}><span className={css.barFill}
                    style={{ width: `${Math.round((d.duration / maxDuration) * 100)}%` }} /></span>
                </td>
              ))}
            </tr>
            <tr className={clsx(css.dataRow, css.plain)}>
              <th scope="row" className={css.rowLabel}><span>Intensity over time</span></th>
              {data.map(d => (
                <td key={d.id} className={clsx({ [css.selCell]: d.id === multiTrack.selectedRunId })}>
                  <Sparkline series={intensitySeries(multiTrack.runs.find(r => r.id === d.id)!.state!.simulation)}
                    color={SPARK_STROKE[categoryChip(d.peak).index]} />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
});
