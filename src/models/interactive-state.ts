import { runInAction, toJS } from "mobx";
import { namedRegions } from "../types";
import { IHurricaneInteractiveState } from "../types/interactive-state";
import { safeStartLocation } from "../utils/interactive-state";
import { PressureSystem } from "./pressure-system";
import { extendedLandfallBounds } from "./simulation";
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
  state: IHurricaneInteractiveState | null
): void {
  if (!state) {
    return;
  }

  const { simulation, ui } = stores;
  const { simulation: simState, ui: uiState } = state;
  const { hurricane: hurState, startLocation } = simState;

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
            simulation.temperatureAnomalies.set(key, value);
          }
        }
      }
    });
  }

  // Restore UI state
  if (uiState) {
    runInAction(() => {
      if (uiState.baseMap) {
        ui.baseMap = uiState.baseMap;
      }
      if (uiState.overlay !== undefined) {
        ui.overlay = uiState.overlay;
      }
      if (uiState.windArrows !== undefined) {
        ui.windArrows = uiState.windArrows;
      }
      if (uiState.hurricaneImage !== undefined) {
        ui.hurricaneImage = uiState.hurricaneImage;
      }
      if (uiState.accessibleSSTScale !== undefined) {
        ui.sstOverlay.accessibleSSTScale = uiState.accessibleSSTScale;
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
