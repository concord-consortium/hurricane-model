import { runInAction, toJS } from "mobx";
import config from "../config";
import { appModes } from "../types";
import { IHurricaneInteractiveState, IHurricaneInteractiveStateV1 } from "../types/interactive-state";
import { serializeSimulation } from "./simulation-serialization";
import { IStores } from "./stores";

const CURRENT_VERSION = 2;

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
    const legacy = migrateLegacyState(rawState);
    return legacy ? migrateV1ToV2(legacy) : null;
  }

  const version = rawState.version;

  // Already current version
  if (version === CURRENT_VERSION) {
    return state as IHurricaneInteractiveState;
  }

  if (version === 1) {
    return migrateV1ToV2(state as IHurricaneInteractiveStateV1);
  }

  // Unknown version - return null to use defaults
  // eslint-disable-next-line no-console
  console.warn(`Unknown interactive state version: ${version}. Using defaults.`);
  return null;
}

/**
 * Attempts to migrate state saved before versioning was added.
 * Returns null if the state structure is unrecognizable.
 */
function migrateLegacyState(rawState: Record<string, unknown>): IHurricaneInteractiveStateV1 | null {
  // Check for recognizable structure
  if (!rawState.simulation && !rawState.ui) {
    return null;
  }

  // Add version field and return
  return {
    version: 1,
    simulation: rawState.simulation as IHurricaneInteractiveStateV1["simulation"],
    ui: rawState.ui as IHurricaneInteractiveStateV1["ui"]
  };
}

function migrateV1ToV2(state: IHurricaneInteractiveStateV1): IHurricaneInteractiveState {
  return {
    version: 2,
    mode: state.mode,
    runs: [{ id: "run-1", simulation: state.simulation }],
    selectedRunId: "run-1",
    ui: state.ui
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

  const { ui } = stores;
  const { ui: uiState } = state;

  if (state.mode != null && appModes.includes(state.mode)) config.mode = state.mode;

  if (state.runs?.length) {
    stores.runs.setRuns(state.runs, state.selectedRunId);
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
  const { runs, simulation, ui } = stores;
  const liveSimulation = serializeSimulation(simulation);

  return {
    version: 2,
    mode: config.mode,
    runs: runs.runs.map(run => ({
      id: run.id,
      // The selected run's record can be stale; the live simulation is its source of truth.
      simulation: runs.isSelected(run.id) ? liveSimulation : toJS(run.simulation)
    })),
    selectedRunId: runs.selectedRunId,
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
