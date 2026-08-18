import { runInAction, toJS } from "mobx";
import config from "../config";
import { appModes, namedRegions } from "../types";
import { IHurricaneInteractiveState } from "../types/interactive-state";
import { safeStartLocation } from "../utils/interactive-state";
import { PressureSystem } from "./pressure-system";
import { extendedLandfallBounds, resolveStartLocation } from "./simulation";
import { IStores } from "./stores";

const CURRENT_VERSION = 1;

/**
 * Migrates any saved state to the current version format.
 * Handles: missing version field, legacy formats, and future version upgrades.
 */
export function migrateState(state: unknown): IHurricaneInteractiveState | null {
  if (!state || typeof state !== "object") {
    return null;
  }

  const rawState = state as Record<string, unknown>;

  // Handle missing version field (legacy state from before versioning)
  if (!("version" in rawState)) {
    // Attempt to migrate legacy state
    return migrateLegacyState(rawState);
  }

  const version = rawState.version;

  // Already current version
  if (version === CURRENT_VERSION) {
    return state as IHurricaneInteractiveState;
  }

  // Future version migrations would go here:
  // if (version === 1) {
  //   return migrateV1ToV2(state as IHurricaneInteractiveStateV1);
  // }

  // Unknown version - return null to use defaults
  // eslint-disable-next-line no-console
  console.warn(`Unknown interactive state version: ${version}. Using defaults.`);
  return null;
}

/**
 * Attempts to migrate state saved before versioning was added.
 * Returns null if the state structure is unrecognizable.
 */
function migrateLegacyState(rawState: Record<string, unknown>): IHurricaneInteractiveState | null {
  // Check for recognizable structure
  if (!rawState.simulation && !rawState.ui) {
    return null;
  }

  // Add version field and return
  return {
    version: 1,
    simulation: rawState.simulation as IHurricaneInteractiveState["simulation"],
    ui: rawState.ui as IHurricaneInteractiveState["ui"]
  };
}

/**
 * Restores interactive state to the stores.
 */
export function setInteractiveState(
  stores: IStores,
  state: IHurricaneInteractiveState | null,
  // Base map and map overlay are persistent GLOBAL view preferences: they change only when the user
  // picks them, and are NOT reverted by selecting/restoring a run. They ARE restored when loading a
  // saved model/session (restoreViewPrefs=true) so the user's last choice survives a reload.
  restoreViewPrefs = false
): void {
  if (!state) {
    return;
  }

  const { simulation, ui } = stores;
  const { simulation: simState, ui: uiState } = state;
  const { hurricane: hurState, startLocation } = simState;

  if (state.mode != null && appModes.includes(state.mode)) config.mode = state.mode;

  // Restore simulation state
  if (simState) {
    // Use runInAction to batch all MobX updates
    runInAction(() => {
      // Basic properties
      if (simState.season) {
        simulation.season = simState.season;
      }
      if (startLocation) {
        simulation.startLocation = safeStartLocation(startLocation);
      }

      // Pressure systems - recreate from serialized state
      if (simState.pressureSystems) {
        simulation.pressureSystems = simState.pressureSystems.map(
          ps => new PressureSystem(ps)
        );
      }

      // Simulation progress state
      simulation.simulationStarted = simState.simulationStarted ?? false;
      simulation.simulationFinished = simState.simulationFinished ?? false;

      // Track data - these are plain objects, safe to assign directly
      if (simState.hurricaneTrack) {
        simulation.hurricaneTrack = simState.hurricaneTrack.slice();
      }
      if (simState.landfalls) {
        simulation.landfalls = simState.landfalls.slice();
      }

      // Restore hurricane state if simulation was in progress
      if (hurState) {
        simulation.hurricane.center = { ...hurState.center };
        simulation.hurricane.strength = hurState.strength;
        if (hurState.speed) {
          simulation.hurricane.speed = { ...hurState.speed };
        }
        simulation.hurricane.startingCategory = hurState.startingCategory;
        if (hurState.cat3SSTThresholdReached !== undefined) {
          simulation.hurricane.cat3SSTThresholdReached = hurState.cat3SSTThresholdReached;
        }
      }

      // Restore additional simulation state needed for resumption
      if (simState.time !== undefined) {
        simulation.time = simState.time;
      }
      if (simState.strengthChangePositions) {
        simulation.strengthChangePositions = simState.strengthChangePositions.slice();
      }
      if (simState.precipitationPoints) {
        simulation.precipitationPoints = simState.precipitationPoints.slice();
      }

      // Restore internal state for seamless resume
      if (simState.numberOfStepsOverSea !== undefined) {
        simulation.numberOfStepsOverSea = simState.numberOfStepsOverSea;
      }
      if (simState.numberOfStepsOverLand !== undefined) {
        simulation.numberOfStepsOverLand = simState.numberOfStepsOverLand;
      }
      if (simState.consumedExtendedLandfallAreas) {
        // Reconstruct available landfall areas by filtering out consumed ones.
        // We store consumed area keys (not the remaining areas) because:
        // 1. LatLngBounds objects don't serialize cleanly to JSON
        // 2. Storing keys is more compact and version-resilient if bounds change
        // 3. The full set of areas is defined in extendedLandfallBounds
        simulation.extendedLandfallAreas = Object.entries(extendedLandfallBounds)
          .filter(([key]) => !simState.consumedExtendedLandfallAreas!.includes(key))
          .map(([, bounds]) => bounds);
      }

      if (simState.temperatureAnomalies) {
        for (const key of namedRegions) {
          const value = simState.temperatureAnomalies[key];
          if (typeof value === "number") {
            simulation.setTemperatureAnomaly(key, value);
          }
        }
      }
    });
  }

  // Restore UI state
  if (uiState) {
    runInAction(() => {
      // Base map, map overlay, and the accessible SST scale are global view prefs — only apply them
      // on a full model/session load, never when restoring a run (which would revert the user's
      // current choice; these all drive the run thumbnails too, so they must stay put on run-select).
      if (restoreViewPrefs) {
        if (uiState.baseMap) {
          ui.baseMap = uiState.baseMap;
        }
        if (uiState.overlay !== undefined) {
          ui.overlay = uiState.overlay;
        }
        if (uiState.accessibleSSTScale !== undefined) {
          ui.sstOverlay.accessibleSSTScale = uiState.accessibleSSTScale;
        }
      }
      if (uiState.windArrows !== undefined) {
        ui.windArrows = uiState.windArrows;
      }
      if (uiState.hurricaneImage !== undefined) {
        ui.hurricaneImage = uiState.hurricaneImage;
      }
      if (uiState.categoryChangeMarkers !== undefined) {
        ui.categoryChangeMarkers = uiState.categoryChangeMarkers;
      }
      if (uiState.thermometerActive !== undefined) {
        ui.thermometerActive = uiState.thermometerActive;
      }
      if (uiState.thermometerPositionSaved !== undefined) {
        ui.thermometerPositionSaved = uiState.thermometerPositionSaved;
      }
      if (uiState.zoomedInView !== undefined) {
        ui.zoomedInView = uiState.zoomedInView;
      }
    });
  }
}

/**
 * Serializes current state from stores for saving to LARA.
 *
 * IMPORTANT: Do not add conditional access to observables in this function.
 * MobX reactions rely on unconditional reads to track dependencies correctly.
 * If you wrap observable access in conditionals (if statements), the reaction
 * won't re-run when those observables change, breaking auto-save.
 */
export function getInteractiveState(stores: IStores): IHurricaneInteractiveState {
  const { simulation, ui } = stores;
  const { hurricane, startLocation } = simulation;

  return {
    version: 1,
    mode: config.mode,
    simulation: {
      season: simulation.season,
      startLocation: safeStartLocation(startLocation),
      pressureSystems: simulation.pressureSystems.map(ps => ps.serialize()),
      simulationStarted: simulation.simulationStarted,
      simulationFinished: simulation.simulationFinished,
      time: simulation.time,
      hurricane: {
        center: { ...hurricane.center },
        strength: hurricane.strength,
        speed: { ...hurricane.speed },
        startingCategory: hurricane.startingCategory,
        cat3SSTThresholdReached: hurricane.cat3SSTThresholdReached
      },
      // Use toJS() for observable arrays to ensure clean serialization
      hurricaneTrack: toJS(simulation.hurricaneTrack),
      landfalls: toJS(simulation.landfalls),
      strengthChangePositions: toJS(simulation.strengthChangePositions),
      precipitationPoints: toJS(simulation.precipitationPoints),
      // Internal state for seamless resume
      numberOfStepsOverSea: simulation.numberOfStepsOverSea,
      numberOfStepsOverLand: simulation.numberOfStepsOverLand,
      consumedExtendedLandfallAreas: Object.keys(extendedLandfallBounds)
        .filter(key => !simulation.extendedLandfallAreas
          .some(area => area.equals(extendedLandfallBounds[key]))),
      temperatureAnomalies: Object.fromEntries(simulation.temperatureAnomalies)
    },
    ui: {
      baseMap: ui.baseMap,
      overlay: ui.overlay,
      windArrows: ui.windArrows,
      hurricaneImage: ui.hurricaneImage,
      accessibleSSTScale: ui.sstOverlay.accessibleSSTScale,
      categoryChangeMarkers: ui.categoryChangeMarkers,
      thermometerActive: ui.thermometerActive,
      thermometerPositionSaved: ui.thermometerPositionSaved,
      zoomedInView: ui.zoomedInView
    }
  };
}

// Fingerprint of the LIVE sim's learner-editable setup inputs (season, storm location, starting
// category, pressure systems, temperature anomalies). Reads ONLY the setup inputs (not run output like
// the track), so comparisons don't re-fire on every simulation tick.
function liveSetupFingerprint(simulation: IStores["simulation"]): string {
  const { hurricane } = simulation;
  // Location as resolved coordinates: before a run, use the storm's LIVE position so it changes
  // continuously *while dragging* (not just on drop); once started it's frozen at the start location
  // (hurricane.center then moves with the storm).
  const location = simulation.simulationStarted
    ? resolveStartLocation(simulation.startLocation)
    : { lat: hurricane.center.lat, lng: hurricane.center.lng };
  return JSON.stringify({
    season: simulation.season,
    location,
    startingCategory: hurricane.startingCategory,
    pressureSystems: simulation.pressureSystems.map(ps => ps.serialize()),
    temperatureAnomalies: Object.fromEntries(simulation.temperatureAnomalies)
  });
}

// Same fingerprint for a captured/serialized simulation state (the default, or a run's saved state).
// Location is resolved to coordinates so it compares against the live fingerprint's resolved center.
function stateSetupFingerprint(sim: IHurricaneInteractiveState["simulation"]): string {
  return JSON.stringify({
    season: sim.season,
    location: resolveStartLocation(sim.startLocation),
    startingCategory: sim.hurricane.startingCategory,
    pressureSystems: sim.pressureSystems,
    temperatureAnomalies: sim.temperatureAnomalies
  });
}

// True when the current setup differs from the pristine default in any learner-editable input. Used to
// gate Clear All so it's inert on an untouched first card and only lights up once the learner changes
// something.
export function setupChangedFromDefault(stores: IStores): boolean {
  const def = stores.multiTrack.defaultState?.simulation;
  if (!def) return false;
  return liveSetupFingerprint(stores.simulation) !== stateSetupFingerprint(def);
}

// True when the live setup no longer matches a given run's captured setup — i.e. the learner edited a
// value since loading it, so that run's stored result (thumbnail, peak/landfall/sparkline) is stale and
// should read grayed-out until it's re-run.
export function liveSetupDiffersFromRun(
  stores: IStores, runSim: IHurricaneInteractiveState["simulation"]
): boolean {
  return liveSetupFingerprint(stores.simulation) !== stateSetupFingerprint(runSim);
}

// Freeze the currently selected card's in-progress edits before navigating away, so they survive and
// are restored on return (they all share one live simulation):
//  - the editable ("Not run yet") card's setup -> editableDraft;
//  - a COMPLETED run unlocked for editing -> that run's editDraft, but only while its setup actually
//    differs from its captured result (cleared to null if it was edited back to the captured setup).
// No-op when the selected card is a locked completed run.
export function freezeCurrentCard(stores: IStores) {
  const { multiTrack } = stores;
  const cur = multiTrack.runs.find(r => r.id === multiTrack.selectedRunId);
  if (!cur) return;
  if (cur.state === null) {
    multiTrack.setEditableDraft(getInteractiveState(stores));
  } else if (multiTrack.editingRunId === cur.id) {
    multiTrack.setEditDraft(
      cur.id,
      liveSetupDiffersFromRun(stores, cur.state.simulation) ? getInteractiveState(stores) : null
    );
  }
}
