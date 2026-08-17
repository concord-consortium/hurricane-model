import { clsx } from "clsx";
import { observer } from "mobx-react";
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { freezeEditableCard, liveSetupDiffersFromRun, setInteractiveState } from "../../models/interactive-state";
import { IRunSlot } from "../../models/multi-track";
import { namedRegions, seasonLabels } from "../../types";
import { IHurricaneInteractiveState } from "../../types/interactive-state";
import { useStores } from "../../stores-context";
import { temperatureAnomalyRegions } from "../../utils/regions";
import {
  durationSteps, intensitySeries, landfallSummary, peakCategory
} from "../../utils/run-outcomes";
import { resolveStartLocation } from "../../models/simulation";
import { formatLatLng } from "../../utils/lat-long";
import { pressureReport } from "../../utils/pressure";
import { anomalyText, categoryChip, runLetter } from "../left-panel/run-summary";
import { CategorySparkline } from "../left-panel/category-sparkline";

import StormLocationIcon from "../../assets/left-panel/storm-location.svg";
import HurricaneIcon from "../../assets/left-panel/hurricane.svg";
import SeasonIcon from "../../assets/left-panel/season.svg";
import ThermometerIcon from "../../assets/left-panel/thermometer.svg";
import PressureSystemIcon from "../../assets/left-panel/pressure-system.svg";
import PeakCategoryIcon from "../../assets/left-panel/peak-category.svg";
import LandfallIcon from "../../assets/left-panel/landfall.svg";
import CategoryOverTimeIcon from "../../assets/left-panel/category-over-time.svg";
import DropdownArrow from "../../assets/left-panel/dropdown-arrow.svg";
import DragIcon from "../../assets/drag.svg";

import categoryCss from "../hurricane-category.scss";
import css from "./compare-overlay.scss";

// Category cell (Storm Category / Peak Category): the hurricane icon recolored to the run's category
// + the label (TS, Cat 1…), no pill. Mirrors the icon on the row label, but colored per run.
function CatCell({ category }: { category: number | undefined }) {
  const c = categoryChip(category);
  return (
    <span className={css.catCell}>
      <HurricaneIcon className={clsx(css.catCellIcon, categoryCss["category" + c.index])} />
      <span className={css.catCellLabel}>{c.label}</span>
    </span>
  );
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
  const { multiTrack, simulation } = stores;

  // Hooks must run before any early return.
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const [collapsed, setCollapsed] = useState(true); // always on the map; starts collapsed
  // Cross-highlight: hovering a column header lights the whole column (row highlight is pure CSS).
  const [hoverCol, setHoverCol] = useState<string | null>(null);
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
  useLayoutEffect(measureCol, [measureCol, multiTrack.selectedRunId, completedCount, collapsed]);

  useEffect(() => {
    window.addEventListener("resize", measureCol);
    return () => window.removeEventListener("resize", measureCol);
  }, [measureCol]);

  // Keep the overlay on-screen as it grows: adding runs widens it, so if its right edge would pass the
  // map's right edge, shift it left to sit 10px inside. Re-checks when runs are added/removed, on
  // expand/collapse, and on resize. Once shifted it holds an explicit position (like a drag).
  useLayoutEffect(() => {
    const el = overlayRef.current;
    const parent = el?.offsetParent as HTMLElement | null;
    if (!el || !parent) return;
    const clampToViewport = () => {
      const prect = parent.getBoundingClientRect();
      const rect = el.getBoundingClientRect();
      const curLeft = rect.left - prect.left;
      const maxLeft = prect.width - el.offsetWidth - 10; // 10px gap from the map's right edge
      if (curLeft > maxLeft) setPos({ left: Math.max(0, maxLeft), top: rect.top - prect.top });
    };
    clampToViewport();
    window.addEventListener("resize", clampToViewport);
    return () => window.removeEventListener("resize", clampToViewport);
  }, [multiTrack.runs.length, collapsed]);

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

  // Compare Runs is on the map from the start (collapsed by default). Keep a Run A column even after
  // the last run is deleted — the column stays, its info reset to the current (default) setup.
  const runsForCompare: IRunSlot[] = multiTrack.runs.length
    ? multiTrack.runs
    : [{ id: "run-a-empty", state: null }];

  // A column per run. Completed runs use their captured state; the editable (not-yet-run) card uses
  // the LIVE simulation, so its Setup appears immediately when the card is created and updates as the
  // learner edits (drag storm, change season, move pressure systems…). Result cells stay empty until run.
  const data = runsForCompare.map((slot, index) => {
    const done = !!slot.state;
    const editing = multiTrack.editingRunId === slot.id;
    const isSelected = slot.id === multiTrack.selectedRunId;
    // Setup source: the card being actively set up (edited, or the selected editable card) reads the
    // LIVE sim so edits show; the editable card reads its frozen draft while you're away; else its
    // captured state. `setupSim === null` means "read the live simulation".
    const live = editing || (!done && (isSelected || !multiTrack.editableDraft));
    const setupSim = live ? null : (done ? slot.state!.simulation : multiTrack.editableDraft!.simulation);
    const resultSim = slot.state?.simulation; // Result cells always use the captured run (frozen)
    // Location: from the setup source; for the live storm, track it while placing (pre-run), then
    // freeze at the start location once the run starts (hurricane.center moves with the storm).
    const locCoords = setupSim
      ? resolveStartLocation(setupSim.startLocation)
      : (simulation.simulationStarted ? resolveStartLocation(simulation.startLocation) : simulation.hurricane.center);
    const startLoc = setupSim ? setupSim.startLocation : simulation.startLocation;
    const pressureSystems = setupSim
      ? (setupSim.pressureSystems || [])
      : simulation.pressureSystems.map(ps => ps.serialize());
    const seasonKey = setupSim ? setupSim.season : simulation.season;
    return {
      id: slot.id,
      letter: runLetter(index),
      editable: !done,
      editing,
      running: isSelected && simulation.simulationStarted && !simulation.simulationFinished,
      // Editing this run with a changed setup → its captured Result values are stale (grayed out).
      resultStale: editing && !!slot.state && liveSetupDiffersFromRun(stores, slot.state.simulation),
      startCat: setupSim ? setupSim.hurricane.startingCategory : simulation.hurricane.startingCategory,
      location: formatLatLng(locCoords.lat, locCoords.lng),
      season: seasonLabels[seasonKey] ?? seasonKey,
      anomalies: namedRegions
        .map(rg => ({
          label: temperatureAnomalyRegions[rg].shortLabel,
          v: setupSim ? (setupSim.temperatureAnomalies?.[rg] ?? 0) : simulation.temperatureAnomalyAt(rg)
        }))
        .filter(a => a.v !== 0),
      report: pressureReport(startLoc, pressureSystems),
      peak: done ? peakCategory(resultSim!) : undefined,
      landfall: done ? landfallSummary(resultSim!) : null,
      duration: done ? durationSteps(resultSim!) : 0,
      series: done ? intensitySeries(resultSim!) : []
    };
  });

  const maxDuration = Math.max(1, ...data.map(d => d.duration));
  // Longest-lived run's sparkline width fills the fixed run-column content (128px column − 20px cell
  // padding = 108px), reaching ~10px from the cell's right edge. Shorter runs scale proportionally.
  const LIFE_W = 108;
  const lifeWidth = (d: { duration: number }) => (d.duration / maxDuration) * LIFE_W;

  const selectRun = (id: string, state: IHurricaneInteractiveState) => {
    multiTrack.selectRun(id);
    multiTrack.autoCaptureSuppressed = true;
    setInteractiveState(stores, state);
    simulation.restart(false);
    multiTrack.autoCaptureSuppressed = false;
  };

  // Clicking any cell in a column selects that run (not just the header).
  const selectColumn = (id: string) => {
    const run = multiTrack.runs.find(r => r.id === id);
    if (!run || id === multiTrack.selectedRunId) return;
    freezeEditableCard(stores); // keep the editable card's own values if we're leaving it
    if (run.state) {
      selectRun(id, run.state);
    } else {
      // Editable column: make it current, restoring its own draft.
      multiTrack.selectRun(id);
      if (multiTrack.editableDraft) {
        multiTrack.autoCaptureSuppressed = true;
        setInteractiveState(stores, multiTrack.editableDraft);
        simulation.restart(false);
        multiTrack.autoCaptureSuppressed = false;
      }
    }
  };

  // A data row. `icon` (Setup rows only) is drawn beside the label, matching the run-card summary
  // icons; `render` draws each run's cell. Differences are not indicated (no color, no tag).
  // `isResult` marks the Result-section rows: their cells gray out for a run being edited with a
  // changed setup (its captured values no longer match the setup), mirroring the run cards.
  const Row = (label: string, render: (i: number) => React.ReactNode, icon?: React.ReactNode,
    isResult = false) => {
    return (
      <tr className={css.dataRow}>
        <th scope="row" className={css.rowLabel}>
          <span className={css.rowLabelName}>{icon}{label}</span>
        </th>
        {data.map((d, i) => (
          <td key={d.id}
            className={clsx(css.runCell, {
              [css.colHover]: hoverCol === d.id,
              [css.staleCell]: isResult && d.resultStale
            })}
            onClick={() => selectColumn(d.id)}>
            {render(i)}
          </td>
        ))}
      </tr>
    );
  };

  // A section divider (Setup / Result). Its per-run cells are clickable — selecting the column — just
  // like the data-row cells; the label cell stays sticky like the row labels.
  const GroupRow = (label: string) => (
    <tr className={css.groupRow}>
      <th scope="row" className={css.groupLabel}>{label}</th>
      {data.map(d => (
        <td key={d.id}
          className={clsx(css.groupCell, { [css.colHover]: hoverCol === d.id })}
          onClick={() => selectColumn(d.id)}
          title="Select this run on the map" />
      ))}
    </tr>
  );

  return (
    <div
      ref={overlayRef}
      className={clsx(css.overlay, { [css.collapsed]: collapsed })}
      style={pos ? { left: pos.left, top: pos.top, right: "auto", transform: "none" } : undefined}
      data-test="compare-overlay"
      role="region"
      aria-label="Compare Runs"
    >
      <header className={css.header} onPointerDown={onHeaderPointerDown}>
        <span className={css.title}>Compare Runs</span>
        {/* Grab-dots drag affordance, centered in the header (same dots as the map markers). */}
        <DragIcon className={css.grabDots} aria-hidden="true" />
        {/* Actions stay pinned to the right of the header in every state (collapsed or not). */}
        <div className={css.headerActions}>
          <button type="button" className={css.iconBtn} data-test="compare-collapse"
            aria-label={collapsed ? "Expand compare" : "Collapse compare"} aria-expanded={!collapsed}
            onClick={() => setCollapsed(c => !c)}>
            <span className={clsx(css.chevron, { [css.chevronUp]: !collapsed })}><DropdownArrow /></span>
          </button>
        </div>
      </header>

      {/* The table is always rendered so the overlay's width is table-driven in BOTH states; when
          collapsed it's clipped to zero height (see .scroll in the SCSS), so closed === open width. */}
      <div className={css.scroll}>
        <div className={css.tableWrap} ref={wrapRef}>
        {colBox && (
          <div
            className={css.colOutline}
            style={{ left: colBox.left, width: colBox.width }}
            aria-hidden="true"
          />
        )}
        <table className={css.table}>
          <thead>
            <tr>
              <th className={css.corner} />
              {data.map(d => (
                <th key={d.id}
                  className={clsx(css.runHead, {
                    [css.selHead]: d.id === multiTrack.selectedRunId,
                    [css.colHover]: hoverCol === d.id
                  })}
                  data-selhead={d.id === multiTrack.selectedRunId ? "1" : undefined}
                  onClick={() => selectColumn(d.id)}
                  onMouseEnter={() => setHoverCol(d.id)}
                  onMouseLeave={() => setHoverCol(null)}
                  title="Select this run on the map">
                  <span className={css.headInner}>
                    <span className={css.runBadge}>{d.letter}</span>
                    {d.running
                      ? <span className={css.headState}>Running…</span>
                      : d.editing
                        ? <span className={css.headState}>Editing…</span>
                        : d.editable
                          ? <span className={css.headState}>Not run yet</span>
                          : null}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {GroupRow("Setup")}
            {Row("Storm Location",
              i => <span className={css.mono}>{data[i].location}</span>,
              <StormLocationIcon className={css.rowIcon} />)}
            {Row("Storm Category",
              i => <CatCell category={data[i].startCat} />,
              <HurricaneIcon className={clsx(css.rowIcon, css.rowIconHurricane)} />)}
            {Row("Season", i => data[i].season,
              <SeasonIcon className={css.rowIcon} />)}
            {Row("Sea Surface Temp", i => (
              data[i].anomalies.length === 0
                ? <span className={css.muted}>Baseline</span>
                : <span className={css.chipsCol}>{data[i].anomalies.map(a => (
                    <span key={a.label} className={clsx(css.anomVal, a.v > 0 ? css.warm : css.cool)}>
                      {a.label} {anomalyText(a.v)}
                    </span>))}</span>
            ), <ThermometerIcon className={css.rowIcon} />)}
            {Row("Pressure Systems", i => (
              data[i].report.length === 0
                ? <span className={css.muted}>Default</span>
                : <span className={css.pressureCol}>{data[i].report.map((r, k) => (
                    <span key={k}>
                      <span className={r.type === "high" ? css.psHigh : css.psLow}>{r.label}</span>: {r.detail}
                    </span>))}</span>
            ), <PressureSystemIcon className={css.rowIcon} />)}

            {GroupRow("Result")}
            {Row("Peak Category", i => (
              data[i].editable ? <span className={css.muted}>—</span> : <CatCell category={data[i].peak} />
            ), <PeakCategoryIcon className={clsx(css.rowIcon, css.rowIconWhiteFill)} />, true)}
            {Row("Landfall", i => (
              data[i].editable
                ? <span className={css.muted}>—</span>
                : <span>{data[i].landfall!.count === 0 ? "None" : `${data[i].landfall!.count}×`}</span>
            ), <LandfallIcon className={css.rowIcon} />, true)}
            {/* Lifetime row removed by content design, but the sparkline still scales its width to the
                run's lifetime (lifeWidth), so a longer-lived storm reads as a wider category trace. */}
            {Row("Category Over Time", i => (
              data[i].editable
                ? <span className={css.muted}>—</span>
                : <CategorySparkline series={data[i].series} uid={data[i].id} widthPx={lifeWidth(data[i])} />
            ), <CategoryOverTimeIcon className={clsx(css.rowIcon, css.rowIconWhiteFill)} />, true)}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
});
