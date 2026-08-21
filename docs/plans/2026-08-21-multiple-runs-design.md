# Multiple Simulation Runs — Design

## Overview

Storm Explorer gains support for up to six simulation runs. A run is a setup (everything
configurable via the storm setup panel) plus, once the simulation has finished, an outcome
(track, strength changes, landfalls, precipitation). The user always interacts with exactly
one selected run and can switch between runs. Runs persist via interactive state and all
finished runs display on the map simultaneously.

An unselected run is always either "setup only" or "complete". Only the selected run can be
mid-simulation; switching away from a started-but-unfinished run resets it to setup only.

## Approach

A new `RunsModel` store holds up to six run records, where each record is a serialized
simulation state (the same `ISimulationState` shape used by interactive state today). The
existing live `SimulationModel` singleton always represents the *selected* run. Switching
runs = snapshot the live sim into its record (stripping the outcome if started but
unfinished), then hydrate the live sim from the target record. Unselected finished tracks
render from plain stored data.

All existing components keep reading `stores.simulation` unchanged. Serialization/hydration
logic already exists in `src/models/interactive-state.ts` and gets extracted into reusable
helpers shared by state restore and run switching.

Alternatives rejected:
- Six live `SimulationModel` instances: each carries an SST-fetching autorun and kd-tree
  caches; components hold the instance through the Provider, so swapping requires
  indirection everywhere; the serialized form is still needed for interactive state anyway.
- Refactoring `SimulationModel` into separate Setup/Outcome/Engine objects: cleanest
  long-term shape, but a large risky refactor across nearly every component with no
  user-visible gain. The design can evolve that way later.

## Data model

```ts
interface IRunState {
  id: string;               // "run-1", "run-2", ... (counter, unique within state)
  simulation: ISimulationState;
}
```

A run is complete when `simulation.simulationFinished` is true — read from the live sim for
the selected run, from the record otherwise. There are no separate setup/outcome types;
setup and outcome are views of the one serialized state.

## RunsModel (`src/models/runs.ts`, `stores.runs`)

Constructed with the `SimulationModel` reference. Max runs is a constant (6).

- `runs` (observable array), `selectedRunId`.
- Computeds: `selectedRun`, `isComplete(run)`, `allComplete`, `atMaxRuns`.
- `selectRun(id)`: no-op if already selected; snapshot live sim into the current record
  (calling `simulation.restart()` first if started but unfinished, so only setup survives);
  hydrate the live sim from the target record; reset the map view.
- `addRun()`: new run with the default setup (derived from `config`, same as a fresh
  `SimulationModel`), auto-selected.
- `duplicateLastRun()`: new run copying the newest run's setup, auto-selected.
- `resetRun(id)`: delegates to `simulation.restart()` (only reachable for the selected run).
- `deleteRun(id)`: remove the run. If it was the only run, replace it with a fresh default
  run. If the selected run was deleted, select the previous (next-oldest) run; if the first
  run was deleted, select the newest remaining. Hydrate the live sim accordingly.

Hydration/serialization use helpers extracted from `setInteractiveState` /
`getInteractiveState` so restore and run switching share one code path.

## Interactive state v2

```ts
{
  version: 2,
  mode?: AppMode,
  runs: IRunState[],
  selectedRunId: string,
  ui: IUIState
}
```

The top-level `simulation` field is replaced by the runs array. The selected run's entry
carries its full live state, so mid-run reload/resume keeps working exactly as today.
`getInteractiveState` serializes the live sim into the selected run's slot and passes the
other records through. Migration chain: legacy → v1 (existing) → v2 (wrap `simulation` as
the sole run).

## Hurricane mode

Same pattern, one run, always selected. The setup panel is already hidden in hurricane mode,
so the run-management UI never renders, and there are never unselected finished runs to draw
on the map. No further special-casing.

## Map display

Unselected *finished* runs each render as a single gray polyline (plus border) from their
stored track, in a dedicated lower map pane, chronological order (oldest bottom, newest
top). Hover darkens the whole track (mouseover/out tracked per run id). Click selects the
run — ignored while the simulation is running. The selected run keeps today's live,
per-category-colored rendering on top.

## Storm setup panel

New runs section at the bottom of the left panel, below the existing dropdown sections:

- One panel per run, oldest first. Minimal content for now: the styled frame (selected fill,
  hover state per mockups); clicking a panel selects that run.
- The selected panel shows two top-right buttons:
  - Reset (`src/assets/restart.svg`): restarts the run (keeps setup, deletes outcome).
    Disabled until the run is complete.
  - Delete (`src/assets/left-panel/delete.svg`): removes the run (single-run case resets to
    the default setup instead — there is never zero runs).
- Below the panels:
  - Any run incomplete → "Complete run(s) above to add another run".
  - Six complete runs → "Limit reached - delete a run to add another".
  - All complete, fewer than six → "Duplicate Last Run" and "New Run" buttons.

The bottom-bar Restart button already acts on the live sim, which is always the selected
run; no change needed.

## Logging

New events: `RunAdded`, `RunSelected`, `RunReset`, `RunDeleted`, `RunDuplicated`,
documented in LOGGED-EVENTS.md. Existing simulation events continue to describe the live
(selected) run.

## Testing

- `RunsModel` unit tests: add/select/duplicate/delete/reset, max-runs gating, single-run
  delete resets to default, switch-away-mid-run strips outcome, delete-selection rules.
- Migration tests: v1 → v2 and legacy → v2.
- Save/restore round trip with multiple runs.
- Component tests for the run panels: selection, button enablement, footer message/button
  states.

## Assumptions

- UI state (base map, overlay, thermometer, zoom) stays global, not per-run.
- New/duplicated runs are auto-selected.
- No confirmation dialogs on reset/delete for now.
- Max runs is a constant (6), not yet configurable.
