# Logged Events Reference

All events are logged via `@concord-consortium/lara-interactive-api` `log()` function.
Events are only sent when the simulation is embedded in LARA/Activity Player.

All lat/lng values are in decimal degrees, strength in m/s, temperature in °C, categories as integers 0-5 (Saffir-Simpson scale).

## Simulation Lifecycle

| Event | Parameters | When |
|-------|-----------|------|
| `SimulationStarted` | `{ startLocation, season, windArrows, hurricaneImage, baseMap, overlay, accessibleSSTScale, thermometerActive, pressureSystems: [{ type, center: { lat, lng }, strength }], hurricane: { strength, center: { lat, lng } }, deterministic, timestep, pressureSystemsLocked, lockSimulationWhileRunning, seaSurfaceTempOpacity, markLandfalls }` | User clicks Start — logged before `start()` to capture pre-simulation state |
| `SimulationStopped` | `{ outcome: { initialPosition, finalPosition, strengthChanges, landfalls, trackPointCount } }` | User clicks Stop/Pause |
| `SimulationEnded` | `{ reason: "ByItself" \| "SimulationRestarted" \| "SimulationReloaded" \| "TopBarReloadButtonClicked" \| "RunReset", outcome: { initialPosition, finalPosition, strengthChanges, landfalls, trackPointCount } }` | Simulation ends naturally (hurricane dissipates) or user triggers restart/reload |
| `SimulationRestarted` | — | User clicks Restart (bottom bar) |
| `SimulationReloaded` | — | User clicks Reload (bottom bar) |
| `TopBarReloadButtonClicked` | — | User clicks Reload (top bar) |

## Run Management

| Event | Parameters | When |
|-------|-----------|------|
| `RunSelected` | `{ runId, via: "panel" \| "map" }` | User selects a different run by clicking its setup panel or its track on the map |
| `RunAdded` | `{ runId }` | User clicks New Run |
| `RunDuplicated` | `{ runId, duplicatedRunId }` | User clicks Copy Selected Run (`runId` is the new run, `duplicatedRunId` the run whose setup was copied) |
| `RunReset` | `{ runId }` | User clicks the reset button on the selected run's panel |
| `RunDeleted` | `{ runId }` | User clicks the delete button on the selected run's panel |

## Mouse Interaction

| Event | Parameters | When |
|-------|-----------|------|
| `SimulationMouseEnter` | `{ clientX, clientY, percentX, percentY }` | Mouse enters the simulation container |
| `SimulationMouseLeave` | `{ clientX, clientY, percentX, percentY }` | Mouse leaves the simulation container |
| `MapClicked` | `{ position: { lat, lng } }` | User clicks on the map surface |

## Temperature Tool

| Event | Parameters | When |
|-------|-----------|------|
| `ThermometerEnabled` | — | User activates the temperature tool |
| `ThermometerDisabled` | — | User deactivates the temperature tool |
| `ThermometerPinned` | `{ position: { lat, lng }, temperature }` | User clicks to pin a temperature reading while thermometer is active |
| `ThermometerHover` | `{ position: { lat, lng }, temperature }` | Mouse stops moving for 1 second while thermometer is active (debounced) |

## Map Controls

| Event | Parameters | When |
|-------|-----------|------|
| `BaseMapSet` | `{ type }` | User selects a base map (satellite, relief, street, population) |
| `MapOverlaySet` | `{ type }` | User enables a map overlay (sst, precipitation, stormSurge) |
| `MapOverlayDisabled` | — | User disables the active map overlay |
| `MapTabOpened` | `{ type }` | User opens a map tab in the right panel |
| `MapTabClosed` | `{ type }` | User closes a map tab in the right panel |
| `ViewportUpdated` | `{ zoom, east, west, north, south }` | User pans or zooms the map (not programmatic) |
| `ResetMapViewClicked` | — | User clicks the reset view button |
| `FullscreenEnabled` | — | User enters fullscreen mode |
| `FullscreenDisabled` | — | User exits fullscreen mode |

## Settings

| Event | Parameters | When |
|-------|-----------|------|
| `SeasonChanged` | `{ season }` | User changes the season |
| `StartLocationChanged` | `{ startLocation }` | User changes the start location (`startLocation` is a preset name like `"atlantic"` when picked from the dropdown, or `{ lat, lng }` when the marker is dragged in setup mode) |
| `WindArrowsShown` | — | User enables wind arrows |
| `WindArrowsHidden` | — | User disables wind arrows |
| `HurricaneImageShown` | — | User shows hurricane satellite image |
| `HurricaneImageHidden` | — | User hides hurricane satellite image |
| `AccessibleSSTScaleEnabled` | — | User enables accessible SST color scale |
| `AccessibleSSTScaleDisabled` | — | User disables accessible SST color scale |

## Pressure Systems

| Event | Parameters | When |
|-------|-----------|------|
| `PressureSystemMoved` | `{ type, lat, lng }` | User drags a pressure system to a new position |
| `PressureSystemStrengthUpdated` | `{ type, lat, lng, value }` | User adjusts pressure system strength via slider |

## Dialogs

| Event | Parameters | When |
|-------|-----------|------|
| `ShareDialogOpened` | — | User opens the Share dialog |
| `AboutDialogOpened` | — | User opens the About dialog |
| `ModelShared` | `{ modelId }` | The Share dialog is opened and the simulation state is successfully saved to the cloud (`modelId` is the shareable id) |
| `DisclaimerDismissed` | `{ source }` | User dismisses the load-time disclaimer modal (`source` is `"gotIt"` for the Got it button, or `"close"` for the close button or escape key) |
