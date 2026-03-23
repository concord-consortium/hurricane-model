# Add Log Events for Simulation Lifecycle, Interactions, and Hurricane Track Data

**Jira**: https://concord-consortium.atlassian.net/browse/HURR-24

**Status**: **Closed**

## Overview

Add and enhance log events to improve observability of simulation lifecycle, student interactions, and hurricane-specific data. This includes a new `SimulationEnded` event with hurricane outcome data, enhanced `SimulationStarted` parameters, mouse enter/leave/click events, temperature tool logging, a `LogMonitor` developer sidebar for real-time event inspection, and a `LOGGED-EVENTS.md` reference document.

## Requirements

- **REQ-1: New "SimulationEnded" event** — Fire a `SimulationEnded` event when the simulation ends naturally or when the user triggers a restart or reload. Pausing does NOT trigger `SimulationEnded`. Includes `reason` field (`"ByItself"`, `"SimulationRestarted"`, `"SimulationReloaded"`, `"TopBarReloadButtonClicked"`) and `outcome` field with hurricane track data. The existing `SimulationStopped` event includes outcome data for pause-time snapshots.

- **REQ-2: Enhanced "SimulationStarted" parameters** — Include all essential simulation parameters: student-configurable settings (`startLocation`, `season`, `windArrows`, `hurricaneImage`, `baseMap`, `overlay`, `accessibleSSTScale`, `thermometerActive`), pressure systems array, hurricane initial state, and authored config (`deterministic`, `timestep`, `pressureSystemsLocked`, `lockSimulationWhileRunning`, `seaSurfaceTempOpacity`, `markLandfalls`).

- **REQ-3: Mouse enter/leave and click events** — Log `SimulationMouseEnter`/`SimulationMouseLeave` with `{ clientX, clientY, percentX, percentY }` (rounded integer percentages of container dimensions). Log `MapClicked` with lat/lng for map surface clicks. Non-map UI clicks are not separately logged (individual button events already cover those).

- **REQ-4: LogMonitor sidebar** — `?logMonitor=true` URL parameter activates a developer sidebar with real-time event display, text filter, expandable payloads, CSV/JSON export, and light/dark themes. Provided by `@concord-consortium/log-monitor` npm package. Zero overhead when disabled.

- **REQ-5: `LOGGED-EVENTS.md` reference document** — Complete table of all ~35 logged events with parameters and trigger conditions, linked from `README.md`.

- **REQ-6: Update `@concord-consortium/lara-interactive-api`** — From `^1.12.0` to `^1.13.0`.

- **REQ-7: Hurricane "SimulationEnded" outcome data** — Outcome includes initial/final coordinates, strength change positions, landfall points, and storm category at each location. All lat/lng rounded to 4 decimal places.

- **REQ-8: Temperature tool logging** — `ThermometerPinned` on click-to-pin (position + temperature). `ThermometerHover` debounced at 1 second (fires when mouse stops moving), with `thermometerActive` re-check to guard against logging after tool deactivation.

## Technical Notes

- **Units**: All lat/lng in decimal degrees (rounded to 4 decimal places), strength in m/s, temperature in °C, categories as integers 0-5 (Saffir-Simpson scale).
- All logging uses `log()` via `src/log.ts` wrapper module, which conditionally wraps the LARA API `log` function with LogMonitor event emission.
- `SimulationStarted` logs before `start()` and `SimulationEnded` logs before `restart()`/`reset()` to capture pre-change state.
- `SimulationEnded` in `tick()` logs after the final strength change position is recorded.
- The `@concord-consortium/log-monitor` package is a separate repo designed for reuse across hurricane-model, wildfire-model, flooding-model, activity-player, CLUE, CODAP, and question-interactives.

## Out of Scope

- Changes to the LARA Interactive API library itself
- Scroll-in/scroll-out visibility events (handled in activity-player code)
- "Show All" button logging (applies to a different simulation, not hurricane)
- FireLineButtonClicked (wildfire-specific, not applicable)
- Logging of map pan/zoom interactions beyond the existing `ViewportUpdated` event
- Retroactive logging of historical simulation data
