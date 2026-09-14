import { clsx } from "clsx";
import { observer } from "mobx-react";
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { log } from "../../log";
import { useStores } from "../../stores-context";
import { IBox } from "../../types";
import { IRunState } from "../../types/interactive-state";
import { selectRun } from "../../utils/multitrack";
import { IRunSummaryRow, resolveIconClassName, resultRows, setupRows } from "../run-summary/run-summary-rows";
import { Dash } from "../run-summary/run-summary-values";
import { clampToParent, useDraggable } from "./use-draggable";

import DragIcon from "../../assets/drag.svg";
import DropdownArrowIcon from "../../assets/left-panel/dropdown-arrow.svg";

import commonCss from "../common.scss";
import css from "./compare-runs-table.scss";

const maxSparklineWidth =
  parseFloat(commonCss.compareRunColumnWidth) - 2 * parseFloat(commonCss.compareCellHorizontalPadding);

type Section = "setup" | "result";

export const CompareRunsTable = observer(function CompareRunsTable() {
  const stores = useStores();
  const { runs, ui } = stores;
  const { compareTableExpanded: expanded, compareTablePosition: position } = ui;
  const compareRunsTableRef = useRef<HTMLDivElement>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [hoveredRunId, setHoveredRunId] = useState<string | null>(null);
  const [selectedColumnBox, setSelectedColumnBox] = useState<IBox | null>(null);
  const runCount = runs.runs.length;

  const handleDragStart = useDraggable({ elementRef: compareRunsTableRef, onMove: ui.setCompareTablePosition });

  // A dragged table can end up outside the map when it grows or the window shrinks.
  useLayoutEffect(() => {
    const table = compareRunsTableRef.current;
    if (!table || !position) return;
    const keepInside = () => {
      const clamped = clampToParent(position, table);
      if (clamped.left !== position.left || clamped.top !== position.top) ui.setCompareTablePosition(clamped);
    };
    keepInside();
    window.addEventListener("resize", keepInside);
    return () => window.removeEventListener("resize", keepInside);
  }, [position, expanded, runCount, ui]);

  // One box outlines the whole selected column, including the group rows a per-cell border can't span.
  const measureSelectedColumn = useCallback(() => {
    const container = tableContainerRef.current;
    const header = container?.querySelector<HTMLElement>(`[data-run-id="${runs.selectedRunId}"]`);
    const table = container?.querySelector("table");
    if (!container || !header || !table) {
      setSelectedColumnBox(null);
      return;
    }
    const containerRect = container.getBoundingClientRect();
    const headerRect = header.getBoundingClientRect();
    const tableRect = table.getBoundingClientRect();
    setSelectedColumnBox({
      left: headerRect.left - containerRect.left,
      top: tableRect.top - containerRect.top,
      width: headerRect.width,
      height: tableRect.height
    });
  }, [runs.selectedRunId]);

  useLayoutEffect(measureSelectedColumn, [measureSelectedColumn, expanded, runCount]);

  useEffect(() => {
    window.addEventListener("resize", measureSelectedColumn);
    return () => window.removeEventListener("resize", measureSelectedColumn);
  }, [measureSelectedColumn]);

  const handleToggle = () => {
    const next = !expanded;
    ui.setCompareTableExpanded(next);
    log("CompareTableToggled", { expanded: next });
  };

  const handleSelect = (run: IRunState) => selectRun(stores, run, "table");

  const handleHeaderKeyDown = (event: React.KeyboardEvent, run: IRunState) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleSelect(run);
    }
  };

  const columnClasses = (run: IRunState) => ({
    [css.selected]: runs.isSelected(run.id),
    [css.hovered]: hoveredRunId === run.id
  });

  const renderHeader = (run: IRunState) => {
    const letter = runs.runLetter(run);
    const status = runs.runStatus(run);
    return (
      <th
        key={run.id}
        scope="col"
        role="button"
        tabIndex={0}
        aria-label={`Run ${letter}${status ? `, ${status}` : ""}`}
        aria-pressed={runs.isSelected(run.id)}
        className={clsx(css.runHeader, columnClasses(run))}
        data-run-id={run.id}
        data-test="compare-run-header"
        onClick={() => handleSelect(run)}
        onKeyDown={event => handleHeaderKeyDown(event, run)}
        onMouseEnter={() => setHoveredRunId(run.id)}
        onMouseLeave={() => setHoveredRunId(null)}
      >
        <span className={css.runHeaderContent}>
          <span className={css.runLetter}>{letter}</span>
          {status && <span className={css.runStatus}>{status}</span>}
        </span>
      </th>
    );
  };

  const renderSectionHeaderRow = (label: string) => (
    <tr className={css.groupRow}>
      <th scope="row" className={css.groupLabel}>{label}</th>
      {runs.runs.map(run => (
        <td key={run.id} className={clsx(css.groupCell, columnClasses(run))} onClick={() => handleSelect(run)} />
      ))}
    </tr>
  );

  const renderRow = (row: IRunSummaryRow, section: Section) => {
    const { key, label, Icon, Value } = row;
    return (
      <tr key={key} className={css.dataRow}>
        <th scope="row" className={css.rowLabel}>
          <span className={css.rowLabelContent}>
            <Icon aria-hidden={true} className={clsx(css.rowIcon, resolveIconClassName(row, runs))} />
            {label}
          </span>
        </th>
        {runs.runs.map(run => (
          <td
            key={run.id}
            className={clsx(css.runCell, columnClasses(run))}
            data-test={`compare-cell-${key}`}
            onClick={() => handleSelect(run)}
          >
            {section === "result" && !runs.isRunComplete(run)
              ? <Dash />
              : <Value run={run} maxSparklineWidth={maxSparklineWidth} />}
          </td>
        ))}
      </tr>
    );
  };

  return (
    <div
      ref={compareRunsTableRef}
      className={clsx(css.compareRunsTable, { [css.expanded]: expanded })}
      style={position ? { left: position.left, top: position.top, transform: "none" } : undefined}
      role="region"
      aria-label="Compare Runs"
      data-test="compare-runs-table"
    >
      <div className={css.header} onPointerDown={handleDragStart}>
        <span className={css.title}>Compare Runs</span>
        <DragIcon aria-hidden={true} className={css.dragHandle} />
        <button
          type="button"
          className={css.toggleButton}
          aria-expanded={expanded}
          aria-label={expanded ? "Collapse compare runs" : "Expand compare runs"}
          data-test="compare-toggle-button"
          onClick={handleToggle}
        >
          <DropdownArrowIcon aria-hidden={true} className={css.chevron} />
        </button>
      </div>
      {expanded &&
        <div ref={tableContainerRef} className={css.tableContainer}>
          {selectedColumnBox &&
            <div aria-hidden={true} className={css.selectedColumnOutline} style={selectedColumnBox} />}
          <table className={css.table}>
            <thead>
              <tr>
                <th className={css.corner} />
                {runs.runs.map(renderHeader)}
              </tr>
            </thead>
            <tbody>
              {renderSectionHeaderRow("Setup")}
              {setupRows.map(row => renderRow(row, "setup"))}
              {renderSectionHeaderRow("Result")}
              {resultRows.map(row => renderRow(row, "result"))}
            </tbody>
          </table>
        </div>}
    </div>
  );
});
