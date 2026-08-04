import { clsx } from "clsx";
import { observer } from "mobx-react";
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { setInteractiveState } from "../../models/interactive-state";
import { namedRegions, seasonLabels } from "../../types";
import { IHurricaneInteractiveState } from "../../types/interactive-state";
import { useStores } from "../../stores-context";
import { temperatureAnomalyRegions } from "../../utils/regions";
import { durationSteps, intensitySeries, landfallSummary, peakCategory, pressureSignature } from "../../utils/run-outcomes";
import { resolveStartLocation } from "../../models/simulation";
import { CATEGORY_COLORS, categoryChip, runLetter } from "../left-panel/run-summary";

import css from "./compare-overlay.scss";

// Darker, legible-on-white strokes for the intensity sparkline, indexed by category (the Saffir–
// Simpson fills are too pale to read as a thin line for TS/Cat 1).
const SPARK_STROKE = ["#9a9a9a", "#c9a400", "#e0a020", "#d97a1e", "#c85a10", "#e03b3b"];

// A category sparkline for one run: the storm's category (0..5) at each track point. The line and
// the fill beneath it are colored by category over time (a gradient with a stop per point), so the
// color shifts as the storm strengthens/weakens. Width matches the run's Lifetime bar (widthPx).
function Sparkline({ series, uid, widthPx }: { series: number[]; uid: string; widthPx: number }) {
  const w = Math.max(8, widthPx), h = 22, pad = 2;
  if (series.length === 0) return <span className={css.noData}>—</span>;
  const n = series.length;
  const x = (i: number) => n <= 1 ? w / 2 : pad + (i / (n - 1)) * (w - 2 * pad);
  const y = (c: number) => h - pad - (c / 5) * (h - 2 * pad);
  const ci = (c: number) => Math.max(0, Math.min(5, Math.round(c)));
  const pts = series.map((c, i) => `${x(i).toFixed(1)},${y(c).toFixed(1)}`).join(" ");
  const area = `${pad},${h - pad} ${pts} ${(w - pad)},${h - pad}`;
  const strokeId = `spk-s-${uid}`, fillId = `spk-f-${uid}`;
  // userSpaceOnUse so the stroke and fill gradients share the same x-mapping (offset i/(n-1) == x(i)).
  const grad = (id: string, palette: string[]) => (
    <linearGradient id={id} gradientUnits="userSpaceOnUse" x1={pad} y1="0" x2={w - pad} y2="0">
      {series.map((c, i) => (
        <stop key={i} offset={n <= 1 ? 0 : i / (n - 1)} stopColor={palette[ci(c)]} />
      ))}
    </linearGradient>
  );
  return (
    <svg className={css.spark} width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <defs>
        {grad(strokeId, SPARK_STROKE)}
        {grad(fillId, CATEGORY_COLORS)}
      </defs>
      <polygon points={area} fill={`url(#${fillId})`} opacity={0.5} />
      <polyline points={pts} fill="none" stroke={`url(#${strokeId})`} strokeWidth={1.75}
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

  // Hooks must run before any early return.
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [colBox, setColBox] = useState<{ left: number; width: number } | null>(null);
  const completedCount = multiTrack.runs.filter(r => r.state).length;

  // Outline the whole selected column with one positioned box (rather than tinting every cell, which
  // reads as disconnected — and a per-cell border would break at the full-width group rows).
  const measureCol = useCallback(() => {
    const wrap = wrapRef.current;
    const sel = wrap?.querySelector<HTMLElement>("[data-selhead='1']");
    if (!wrap || !sel) { setColBox(null); return; }
    const wr = wrap.getBoundingClientRect();
    const sr = sel.getBoundingClientRect();
    setColBox({ left: sr.left - wr.left, width: sr.width });
  }, []);
  useLayoutEffect(measureCol, [measureCol, multiTrack.selectedRunId, completedCount, collapsed, ui.compareOpen]);
  useEffect(() => {
    window.addEventListener("resize", measureCol);
    return () => window.removeEventListener("resize", measureCol);
  }, [measureCol]);

  // Drag the card by its header. Position is kept relative to the map wrapper (the offsetParent)
  // and clamped so it can't be dragged off the map. offsetWidth is read live so the clamp respects
  // the card's current (auto-expanded) width.
  const onHeaderPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return; // let header buttons work
    const el = overlayRef.current;
    const parent = el?.offsetParent as HTMLElement | null;
    if (!el || !parent) return;
    const prect = parent.getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    const offX = e.clientX - rect.left;
    const offY = e.clientY - rect.top;
    const move = (ev: PointerEvent) => {
      const left = Math.max(0, Math.min(prect.width - el.offsetWidth, ev.clientX - prect.left - offX));
      const top = Math.max(0, Math.min(prect.height - el.offsetHeight, ev.clientY - prect.top - offY));
      setPos({ left, top });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    e.preventDefault();
  };

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
      duration: durationSteps(sim),
      series: intensitySeries(sim)
    };
  });

  const maxDuration = Math.max(1, ...data.map(d => d.duration));
  const LIFE_W = 84; // full Lifetime bar width (matches .bar in the scss); sparklines share this scale
  const lifeWidth = (d: { duration: number }) => (d.duration / maxDuration) * LIFE_W;
  const differs = (vals: string[]) => new Set(vals).size > 1;

  const selectRun = (id: string, state: IHurricaneInteractiveState) => {
    multiTrack.selectRun(id);
    multiTrack.autoCaptureSuppressed = true;
    setInteractiveState(stores, state);
    simulation.restart(false);
    multiTrack.autoCaptureSuppressed = false;
  };

  // Clicking any cell in a column selects that run (not just the header).
  const selectColumn = (id: string) => {
    const state = multiTrack.runs.find(r => r.id === id)?.state;
    if (state) selectRun(id, state);
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
          <td key={d.id} className={css.runCell} onClick={() => selectColumn(d.id)}>
            {render(i)}
          </td>
        ))}
      </tr>
    );
  };

  return (
    <div
      ref={overlayRef}
      className={clsx(css.overlay, { [css.collapsed]: collapsed })}
      style={pos ? { left: pos.left, top: pos.top, right: "auto" } : undefined}
      data-test="compare-overlay"
      role="region"
      aria-label="Compare Runs"
    >
      <header className={css.header} onPointerDown={onHeaderPointerDown}>
        <span className={css.title}>Compare Runs</span>
        {collapsed
          ? <span className={css.legend}>{data.length} run{data.length === 1 ? "" : "s"}</span>
          : <span className={css.legend}><span className={css.diffDot} /> differs · <span className={css.sameWord}>same</span> unchanged</span>}
        <button type="button" className={css.iconBtn} data-test="compare-collapse"
          aria-label={collapsed ? "Expand compare" : "Collapse compare"} aria-expanded={!collapsed}
          onClick={() => setCollapsed(c => !c)}>
          <span className={clsx(css.chevron, { [css.chevronUp]: !collapsed })}>⌃</span>
        </button>
        <button type="button" className={css.iconBtn} data-test="compare-close"
          aria-label="Close compare" onClick={() => ui.setCompareOpen(false)}>
          ×
        </button>
      </header>

      {!collapsed && <div className={css.scroll}>
        <div className={css.tableWrap} ref={wrapRef}>
        {colBox && <div className={css.colOutline} style={{ left: colBox.left, width: colBox.width }} aria-hidden="true" />}
        <table className={css.table}>
          <thead>
            <tr>
              <th className={css.corner} />
              {data.map(d => (
                <th key={d.id}
                  className={clsx(css.runHead, { [css.selHead]: d.id === multiTrack.selectedRunId })}
                  data-selhead={d.id === multiTrack.selectedRunId ? "1" : undefined}
                  onClick={() => selectColumn(d.id)}
                  title="Select this run on the map">
                  <span className={css.runBadge}>{d.letter}</span>
                  <span className={css.runHeadName}>Run {d.letter}</span>
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
                : <span className={css.chipsCol}>{data[i].anomalies.map(a => (
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
            {Row("Lifetime", data.map(d => String(d.duration)), i => (
              <span className={css.bar}><span className={css.barFill}
                style={{ width: `${Math.round((data[i].duration / maxDuration) * 100)}%` }} /></span>
            ))}
            {Row("Intensity over time", data.map(d => JSON.stringify(d.series)), i => (
              <Sparkline series={data[i].series} uid={data[i].id} widthPx={lifeWidth(data[i])} />
            ))}
          </tbody>
        </table>
        </div>
      </div>}
    </div>
  );
});
