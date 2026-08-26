import { runInAction, toJS } from "mobx";
import config, { getStartingCategory, startStrengths } from "../config";
import { hurricaneCategoryInfo } from "../constants";
import { NamedRegion, isStartLocationName, namedRegions } from "../types";
import { ISimulationState } from "../types/interactive-state";
import { safeStartLocation } from "../utils/interactive-state";
import { clampAnomaly } from "../utils/regions";
import { IPressureSystemOptions, PressureSystem } from "./pressure-system";
import { SimulationModel, extendedLandfallBounds, resolveStartLocation } from "./simulation";

/**
 * Serializes the live simulation into the shape stored per run and in interactive state.
 *
 * IMPORTANT: Do not add conditional access to observables in this function.
 * MobX reactions rely on unconditional reads to track dependencies correctly.
 * If you wrap observable access in conditionals (if statements), the reaction
 * won't re-run when those observables change, breaking auto-save.
 */
export function serializeSimulation(simulation: SimulationModel): ISimulationState {
  const { hurricane, pressureSystems, pressureSystemSettings, startLocation } = simulation;
    // Use pressureSystemSettings when present over pressureSystems to serialize the start state over the end state
  const systems = pressureSystemSettings.length > 0 ? pressureSystemSettings : pressureSystems;
  return {
    season: simulation.season,
    startLocation: safeStartLocation(startLocation),
    pressureSystems: systems.map(system => system.serialize()),
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
  };
}

export function applySimulationState(simulation: SimulationModel, simState: ISimulationState): void {
  const { hurricane: hurState, startLocation } = simState;
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
      simulation.hurricane.cat3SSTThresholdReached = hurState.cat3SSTThresholdReached ?? false;
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

    // Run switching swaps the whole simulation, so per-run caches must not leak across runs.
    simulation.pressureSystemSettings = [];
    simulation.windKdTreeCache = null;
    simulation.simulationRunning = false;
  });
}

export const cloneSimulationState = (state: ISimulationState): ISimulationState =>
  JSON.parse(JSON.stringify(state));

// Mirrors the defaults SimulationModel and Hurricane read from config at construction time.
// Reads config at call time so authored-state mutations are picked up.
export function defaultSimulationState(): ISimulationState {
  const startLocation = config.initialHurricanePosition;
  const startingCategory = getStartingCategory(config);
  const strength = startingCategory !== undefined
    ? hurricaneCategoryInfo[startingCategory].startingWindSpeed
    : config.hurricaneStrength;
  const temperatureAnomalies: Partial<Record<NamedRegion, number>> = {};
  const configAnomalies: Record<string, number> = config.temperatureAnomalies ?? {};
  for (const key of namedRegions) {
    const raw = Number(configAnomalies[key]);
    temperatureAnomalies[key] = isFinite(raw) ? clampAnomaly(raw) : 0;
  }
  return {
    season: config.season,
    startLocation: safeStartLocation(startLocation),
    pressureSystems: config.pressureSystems.map((ps: IPressureSystemOptions) => ({
      type: ps.type || "low",
      center: { ...ps.center },
      strength: ps.strength ?? config.pressureSystemStrength
    })),
    simulationStarted: false,
    simulationFinished: false,
    time: 0,
    hurricane: {
      center: { ...resolveStartLocation(startLocation) },
      strength,
      speed: { ...config.initialHurricaneSpeed },
      startingCategory,
      cat3SSTThresholdReached: false
    },
    hurricaneTrack: [],
    landfalls: [],
    strengthChangePositions: [],
    precipitationPoints: [],
    numberOfStepsOverSea: 0,
    numberOfStepsOverLand: 0,
    consumedExtendedLandfallAreas: [],
    temperatureAnomalies
  };
}

export function extractSetupState(state: ISimulationState): ISimulationState {
  const setup = cloneSimulationState(state);
  setup.simulationStarted = false;
  setup.simulationFinished = false;
  setup.time = 0;
  setup.hurricaneTrack = [];
  setup.landfalls = [];
  setup.strengthChangePositions = [];
  setup.precipitationPoints = [];
  setup.numberOfStepsOverSea = 0;
  setup.numberOfStepsOverLand = 0;
  setup.consumedExtendedLandfallAreas = [];
  const { startingCategory } = state.hurricane;
  // Mirrors SimulationModel.restart(): starting strength comes from the category when set,
  // falling back to the named-location default.
  let strength = state.hurricane.strength;
  if (startingCategory !== undefined && hurricaneCategoryInfo[startingCategory]?.startingWindSpeed != null) {
    strength = hurricaneCategoryInfo[startingCategory].startingWindSpeed;
  } else if (isStartLocationName(state.startLocation)) {
    strength = startStrengths[state.startLocation];
  }
  setup.hurricane = {
    center: { ...resolveStartLocation(state.startLocation) },
    strength,
    speed: { ...config.initialHurricaneSpeed },
    startingCategory,
    cat3SSTThresholdReached: false
  };
  return setup;
}
