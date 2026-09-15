import { clsx } from "clsx";
import { observer } from "mobx-react";
import React, { useCallback, useLayoutEffect, useRef, useState } from "react";

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

  const handleDragStart = useDraggable({ elementRef: compareRunsTableRef, onMove: ui.setCompareTablePosition });

  // Keeps the table between the top and bottom bars and within the bounds of the view.
  const keepInside = useCallback(() => {
    const table = compareRunsTableRef.current;
    const currentPosition = ui.compareTablePosition;
    if (!currentPosition || !table) return;

    const clamped = clampToParent(currentPosition, table);
    if (clamped.left !== currentPosition.left || clamped.top !== currentPosition.top) {
      ui.setCompareTablePosition(clamped);
    }
  }, [ui]);

  // Keeps the selected column indicator the correct size.
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

  const fixTable = useCallback(() => {
    keepInside();
    measureSelectedColumn();
  }, [keepInside, measureSelectedColumn]);

  // Keeps the table properly positioned and looking good when the window or its size change.
  useLayoutEffect(() => {
    const table = compareRunsTableRef.current;
    if (!table) return;

    fixTable();
    window.addEventListener("resize", fixTable);
    const resizeObserver = new ResizeObserver(fixTable);
    resizeObserver.observe(table);

    return () => {
      window.removeEventListener("resize", fixTable);
      resizeObserver.disconnect();
    };
  }, [fixTable, ui]);

  const handleToggle = () => {
    const next = !expanded;
    ui.setCompareTableExpanded(next);
    log("CompareTableToggled", { expanded: next });
  };

  const handleSelect = (run: IRunState) => selectRun(stores, run, "table");

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
        aria-label={`Run ${letter}${status ? `, ${status}` : ""}`}
        className={clsx(css.runHeader, columnClasses(run))}
        data-run-id={run.id}
        data-test="compare-run-header"
        onMouseEnter={() => setHoveredRunId(run.id)}
        onMouseLeave={() => setHoveredRunId(null)}
      >
        <button
          aria-pressed={runs.isSelected(run.id)}
          className={css.runHeaderButton}
          onClick={() => handleSelect(run)}
          type="button"
        >
          <span className={css.runHeaderContent}>
            <span className={css.runLetter}>{letter}</span>
            {status && <span className={css.runStatus}>{status}</span>}
          </span>
        </button>
      </th>
    );
  };

  const renderSectionHeaderRow = (label: string) => (
    <tr className={css.groupRow}>
      <th scope="row" className={clsx(css.groupLabel, css.rowHeader)}>{label}</th>
      {runs.runs.map(run => (
        <td key={run.id} className={clsx(css.groupCell, columnClasses(run))} onClick={() => handleSelect(run)} />
      ))}
    </tr>
  );

  const renderRow = (row: IRunSummaryRow, section: Section) => {
    const { key, label, Icon, Value } = row;
    return (
      <tr key={key} className={css.dataRow}>
        <th scope="row" className={clsx(css.rowLabel, css.rowHeader)}>
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
