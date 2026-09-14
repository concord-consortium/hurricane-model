# Compare Runs Table — Design

A floating, draggable card over the map that lays every run out side by side so students can compare
setups and results. Reference prototype: PR #151 (`storm-explorer-multirun-prototype`), used as a spec
only — its code is not reused.

## Behavior

- Starts collapsed: a header reading "Compare Runs" with drag dots and a chevron. Clicking the chevron
  expands the table below the header; clicking again collapses it.
- Expanded: one column per run (letter badge + status text in the header), a "Setup" group row, the
  five setup rows (Storm Location, Storm Category, Season, Sea Surface Temp, Pressure Systems), a
  "Result" group row, and the three result rows (Peak Category, Landfall, Category Over Time). Result
  cells show a dash for incomplete runs.
- Pressure Systems shows the *setup* systems (`getSimulationSetup`), not the final systems, matching
  the run cards.
- Clicking anywhere in a run's column (header, group-row cell, or data cell) selects that run, using
  the same flow as clicking a run card or a track on the map. Clicking the already-selected column
  does nothing.
- Hover: a data cell highlights alone; hovering a row label highlights the whole row; hovering a
  column header highlights the whole column.
- The selected column is outlined in orange with a tinted background and an orange letter badge.
- The card can be dragged by its header anywhere inside the map area (below the top bar, above the
  bottom bar, within the left/right edges). It defaults to top-center and is clamped back inside the
  map if it grows or the window shrinks.
- Only rendered in `config.mode === "storm"` (same rule as the left panel). Selection works in
  read-only report mode exactly as it does for run cards.
- Expanded state and position are session-only (not saved to interactive state); `ui.reset()` clears
  them.

## Architecture

### Shared run summary (used by run cards and the table)

New folder `src/components/run-summary/`:

- `run-summary-values.tsx` — eight observer value components, each taking `{ run: IRunState }` and
  reading `runs.getSimulationSetup(run)` / `runs.getSimulationResult(run)` from `useStores()`:
  `StartLocationValue`, `StartingCategoryValue`, `SeasonValue`, `SeaSurfaceTempValue`,
  `PressureSystemsValue`, `PeakCategoryValue`, `LandfallValue`, `CategoryOverTimeValue`.
  Category-colored icons (storm category, peak category) render inside the value. Result values render
  the shared dash when the run has no result. `CategoryOverTimeValue` additionally takes
  `maxSparklineWidth` and scales the sparkline by `duration / runs.maxDuration` (moved out of
  `RunResult`).
- `run-summary-rows.tsx` — descriptor arrays:
  ```ts
  interface IRunSummaryRow {
    key: string;                 // drives data-test: `setup-${key}` / `result-${key}`
    label: string;               // "Storm Location", …
    Icon: SvgComponent;          // neutral row icon
    Value: React.ComponentType<{ run: IRunState; maxSparklineWidth?: number }>;
  }
  export const setupRows: IRunSummaryRow[];
  export const resultRows: IRunSummaryRow[];
  ```
- `run-summary.scss` — `stackedLines`, `warm`/`cool`, `high`/`low`, `pressureSystem`,
  `pressureDetail`, `dash`, `fillWhite` (moved from `run-setup.scss` / `run-result.scss`).

`RunSetup` becomes a loop over `setupRows` rendering `<Icon/><Value run={run}/>` per row.
`RunResult` keeps `RunThumbnail` and its `ResizeObserver` slot measurement, loops over `resultRows`,
and passes the measured slot width as `maxSparklineWidth`. Existing `data-test` attributes are kept
so the current card tests remain valid.

### Shared select flow

`src/utils/multitrack.ts`:
```ts
export function selectRun(stores: IStores, run: IRunState, via: "panel" | "map" | "table"): void
```
Restarts an in-progress simulation (unless read-only), calls `runs.selectRun`,
`ui.setNorthAtlanticView`, and logs `RunSelected`. `run-card.tsx` and `run-tracks.tsx` switch to it.

### Stores

- `UIModel`: `@observable compareTableExpanded = false`,
  `@observable compareTablePosition: { left: number; top: number } | null = null` (`null` = default
  dock), `setCompareTableExpanded`, `setCompareTablePosition`; `reset()` clears both.
- `RunsModel`: `runStatus(run): "" | "Not run yet" | "Running..." | "Paused"` (logic moved from
  `run-card.tsx`; the card appends " - editable" to "Not run yet").

### Table component

`src/components/compare-runs-table/`:

- `compare-runs-table.tsx` — the card. One `<table>`: `<thead>` with a corner cell and a `<th>` per
  run; `<tbody>` with group rows and the descriptor rows. Every cell in a run's column calls
  `selectRun(stores, run, "table")`. Column-header hover is tracked in local state (`hoveredRunId`) and
  applied as a class to that column's cells; cell and row hover are pure CSS. The selected-column
  outline is one absolutely positioned box whose `left`/`width` are measured from the selected `<th>`
  (re-measured on selection change, run count change, expand/collapse, and resize).
- `use-draggable.ts` — `useDraggable(ref, { onMove })` returns an `onPointerDown` handler for the
  drag handle. Uses pointer capture, records the grab offset, clamps `left/top` to the `offsetParent`,
  and ignores pointer-downs that originate on a `<button>`.
- `compare-runs-table.scss`.

Mounted inside `MapView`'s root `.mapView` div (given `position: relative`) after `MapContainer`, so
the drag bounds are the map area. `z-index: 1100` — above the left panel, the right-panel tabs (both
1000), and Leaflet's controls, so the table is never hidden behind them. `.mapView` gets
`position: relative` without a `z-index` so it doesn't form its own stacking context.

### Logging

- `RunSelected.via` gains `"table"`.
- New `CompareTableToggled { expanded: boolean }`, fired by the chevron button.
- Both documented in `LOGGED-EVENTS.md`.

## Layout and styling

All values come from `common.scss` (`$charcoal`, `$charcoalMedium`, `$secondaryColor*`, `$hoverColor`,
`$mainFont`, `$scaleFont`, `runLetterBadge` mixin). New in `common.scss`: `$secondaryColorDark`
(`#a35a12`) for the "Not run yet" text.

- Card: white, `1px solid $charcoalMedium`, 8px radius, drop shadow, `overflow: hidden`.
- Default position: `top: 10px; left: 50%; transform: translateX(-50%)`. After a drag: inline
  `left`/`top`, `transform: none`.
- Header: 40px, `cursor: grab`, `touch-action: none`, `user-select: none`. Title bold left,
  `drag.svg` dots centered (gray), chevron button pinned right (`dropdown-arrow.svg`, rotated 180° when
  expanded; hover/active colors match the left-panel close button).
- Collapsed: header only. Header `min-width` = label column width + one run column width, so the
  card doesn't change width when expanded with a single run.
- Label column fixed width, `$mainFont`, nowrap. Run columns fixed `$runColumnWidth: 128px`,
  `$scaleFont`; long values wrap vertically. `maxSparklineWidth` in the table = run column width minus
  horizontal cell padding.
- Group rows: light gray background, uppercase, letter-spacing (same treatment as
  `cardColumnHeading`).
- Selected column cells: `$secondaryColorLight` background; badge `$secondaryColor`; outline box
  `2px solid $secondaryColor`, 6px radius.
- Hover tints: `$secondaryColorLight` on white cells; a slightly darker tint on gray group-row cells.
- `cursor: pointer` on selectable cells; `default` in the selected column.

## Accessibility

- Card: `role="region"`, `aria-label="Compare Runs"`.
- Chevron: `aria-expanded`, `aria-label` "Expand compare runs" / "Collapse compare runs".
- Column headers: `<th scope="col" role="button" tabIndex={0} aria-pressed={selected}>`; Enter/Space
  selects (same pattern as `RunCard`). Row labels: `<th scope="row">`. Icons `aria-hidden`.

## Testing

- `run-summary-values.test.tsx`: port assertions from `run-setup.test.tsx` and `run-result.test.tsx`;
  keep the existing card tests as regression.
- `use-draggable.test.ts`: pointer down/move/up updates position; clamps to parent; ignores
  pointer-downs on buttons.
- `compare-runs-table.test.tsx`: starts collapsed; toggle expands and logs `CompareTableToggled`; one
  column per run with letters; status text for incomplete and running runs; clicking a cell selects
  the run and logs `RunSelected` with `via: "table"`; clicking the selected column is a no-op;
  Pressure Systems reflects setup systems, not final systems; keyboard selection; not rendered outside
  storm mode.
- `multitrack.test.ts`: restarts an in-progress simulation; skips the restart in read-only mode; logs
  the `via` it was given.
- `ui.test.ts`, `runs.test.ts`: new observables/actions and `runStatus`.
