# Run Card SETUP/RESULT Columns — Design

Flesh out the run cards (branch `hurr-45-run-cards`) with SETUP and RESULT columns, filling in
SETUP only. Reference: Storm Explorer prototype (PR #151, branch
`storm-explorer-multirun-prototype`) and the mockup screenshot. Run letters and RESULT content are
out of scope for now.

## Approach

Port the prototype's `RunSummary` readout logic (compass direction for moved pressure systems, mb
labels, anomaly readouts), adapted to this codebase, rather than rebuilding it or deriving rows
from the setup-section components.

## Data source

- The selected run's stored record can be stale (`runs.ts` snapshots only on switch-away), so the
  card builds its setup readout from the live `SimulationModel` when the run is selected, and from
  `run.simulation` otherwise.
- Pressure system info comes from **setup** (`simulation.pressureSystemsSetup` live /
  `run.simulation.pressureSystemsSetup` stored), not the run-mutated `pressureSystems` — unlike
  the prototype, which read the running systems.

## New utilities

- `src/utils/pressure.ts` — ported from the prototype: `strengthToMb`,
  `pressureDeltas` (moved detection + 16-point compass direction via the existing
  `geolocation-utils` dep), `pressureReport`. The `minStrength` / `maxStrength` / `mbLabelRange`
  constants move here; `pressure-system-icon.tsx` imports them from here so map labels and cards
  share one source of truth.
- `formatLatLng` added to `src/utils/lat-long.ts` — "10.50°N, 20.00°W" style.
- `shortLabel` added to `temperatureAnomalyRegions` in `src/utils/regions.ts`
  ("C. Atlantic", "C. Africa"; Gulf/Caribbean unchanged).

## New component

`RunSetupSummary` (`src/components/left-panel/run-setup-summary.tsx` + `.scss`): SETUP heading plus
five icon rows in setup-section order (matching `left-panel.tsx`):

1. **Location** — `formatLatLng` of `resolveStartLocation(startLocation)`.
2. **Category** — "TS" / "Cat N", hurricane icon tinted via `hurricane-category.scss`.
3. **Season** — `seasonLabels`.
4. **SST anomalies** — "Baseline" when all zero; otherwise one line per nonzero region:
   `<shortLabel> ±N °C`, warm red / cool blue.
5. **Pressure systems** — one line per system: colored `H1:`/`L1:` label, then
   "Default" or "Moved <compass>", then the mb value (always shown).

Icons reuse the existing `src/assets/left-panel/*.svg`.

## Card layout

`RunCard` body becomes two columns: SETUP (the summary) and RESULT (heading only, empty body —
content comes later). Header, status message, and reset/delete buttons stay as they are.

## Testing

- Unit tests for `pressure.ts`: mb mapping, moved/default detection, label fallback (bare H/L when a system has no label).
- `run-card.test.tsx`: setup rows render, selected card reads live sim (stale-record case),
  RESULT heading present.
