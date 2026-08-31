import { runInAction, toJS } from "mobx";
import config, { getStartingCategory, startStrengths } from "../config";
import { hurricaneCategoryInfo } from "../constants";
import { isStartLocationName, namedRegions } from "../types";
import { INormalizedSimulationState, ISimulationState } from "../types/interactive-state";
import { safeStartLocation } from "../utils/interactive-state";
import { seedTemperatureAnomalies } from "../utils/regions";
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
  const { hurricane, pressureSystems, pressureSystemsSetup, startLocation } = simulation;
  return {
    season: simulation.season,
    startLocation: safeStartLocation(startLocation),
    // Setup and run state are stored separately: the setup is what restart and duplicate rewind to,
    // the run state is what a finished run displays alongside its track.
    pressureSystemsSetup: pressureSystemsSetup.map(system => system.serialize()),
    pressureSystems: pressureSystems.map(system => system.serialize()),
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
  const state = normalizeSimulationState(simState);
  const hurState = state.hurricane;
  // Use runInAction to batch all MobX updates
  runInAction(() => {
    // Basic properties
    simulation.season = state.season;
    simulation.startLocation = safeStartLocation(state.startLocation);

    // Pressure systems - recreate from serialized state
    simulation.pressureSystems = state.pressureSystems.map(ps => new PressureSystem(ps));
    simulation.pressureSystemsSetup = state.pressureSystemsSetup.map(ps => new PressureSystem(ps));

    // Simulation progress state
    simulation.simulationStarted = state.simulationStarted;
    simulation.simulationFinished = state.simulationFinished;

    // Track data - these are plain objects, safe to assign directly
    simulation.hurricaneTrack = state.hurricaneTrack.slice();
    simulation.landfalls = state.landfalls.slice();

    simulation.hurricane.center = { ...hurState.center };
    simulation.hurricane.strength = hurState.strength;
    simulation.hurricane.speed = { ...hurState.speed };
    simulation.hurricane.startingCategory = hurState.startingCategory;
    simulation.hurricane.cat3SSTThresholdReached = hurState.cat3SSTThresholdReached ?? false;

    // Restore additional simulation state needed for resumption
    simulation.time = state.time;
    simulation.strengthChangePositions = state.strengthChangePositions.slice();
    simulation.precipitationPoints = state.precipitationPoints.slice();

    // Restore internal state for seamless resume
    simulation.numberOfStepsOverSea = state.numberOfStepsOverSea;
    simulation.numberOfStepsOverLand = state.numberOfStepsOverLand;
    // Reconstruct available landfall areas by filtering out consumed ones.
    // We store consumed area keys (not the remaining areas) because:
    // 1. LatLngBounds objects don't serialize cleanly to JSON
    // 2. Storing keys is more compact and version-resilient if bounds change
    // 3. The full set of areas is defined in extendedLandfallBounds
    simulation.extendedLandfallAreas = Object.entries(extendedLandfallBounds)
      .filter(([key]) => !state.consumedExtendedLandfallAreas.includes(key))
      .map(([, bounds]) => bounds);

    for (const key of namedRegions) {
      simulation.setTemperatureAnomaly(key, state.temperatureAnomalies[key] ?? 0);
    }

    // Run switching swaps the whole simulation, so per-run caches must not leak across runs.
    simulation.windKdTreeCache = null;
    simulation.simulationRunning = false;
  });
}

export const cloneSimulationState = (state: ISimulationState): ISimulationState =>
  JSON.parse(JSON.stringify(state));

// Restored records can be absent, partial or truncated. Filling every field from the defaults here
// lets consumers read a run's simulation state without guarding field by field.
export function normalizeSimulationState(state?: Partial<ISimulationState>): INormalizedSimulationState {
  const defaults = defaultSimulationState();
  const clone = state ? cloneSimulationState(state as ISimulationState) : {};
  const present = Object.fromEntries(
    Object.entries(clone).filter(([, value]) => value != null)
  ) as Partial<ISimulationState>;
  return {
    ...present,
    season: present.season ?? defaults.season,
    startLocation: present.startLocation ?? defaults.startLocation,
    // A legacy run's setup lives in pressureSystems, so seed the setup from it when it's missing.
    pressureSystemsSetup: present.pressureSystemsSetup ?? present.pressureSystems ?? defaults.pressureSystemsSetup,
    pressureSystems: present.pressureSystems ?? defaults.pressureSystems,
    simulationStarted: present.simulationStarted ?? defaults.simulationStarted,
    simulationFinished: present.simulationFinished ?? defaults.simulationFinished,
    time: present.time ?? defaults.time,
    hurricane: { ...defaults.hurricane, ...present.hurricane },
    hurricaneTrack: present.hurricaneTrack ?? defaults.hurricaneTrack,
    landfalls: present.landfalls ?? defaults.landfalls,
    strengthChangePositions: present.strengthChangePositions ?? defaults.strengthChangePositions,
    precipitationPoints: present.precipitationPoints ?? defaults.precipitationPoints,
    numberOfStepsOverSea: present.numberOfStepsOverSea ?? defaults.numberOfStepsOverSea,
    numberOfStepsOverLand: present.numberOfStepsOverLand ?? defaults.numberOfStepsOverLand,
    consumedExtendedLandfallAreas:
      present.consumedExtendedLandfallAreas ?? defaults.consumedExtendedLandfallAreas,
    temperatureAnomalies: { ...defaults.temperatureAnomalies, ...present.temperatureAnomalies }
  };
}

// Mirrors the defaults SimulationModel and Hurricane read from config at construction time.
// Reads config at call time so authored-state mutations are picked up.
export function defaultSimulationState(): INormalizedSimulationState {
  const startLocation = config.initialHurricanePosition;
  const startingCategory = getStartingCategory(config);
  const strength = startingCategory !== undefined
    ? hurricaneCategoryInfo[startingCategory].startingWindSpeed
    : config.hurricaneStrength;
  return {
    season: config.season,
    startLocation: safeStartLocation(startLocation),
    pressureSystemsSetup: config.pressureSystems.map((ps: IPressureSystemOptions) => ({
      type: ps.type || "low",
      center: { ...ps.center },
      strength: ps.strength ?? config.pressureSystemStrength,
      label: ps.label ?? ""
    })),
    pressureSystems: [],
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
    temperatureAnomalies: seedTemperatureAnomalies()
  };
}

export function extractSetupState(state: ISimulationState): ISimulationState {
  const setup = cloneSimulationState(state);
  // A legacy run has no separate setup; its pressureSystems are the setup.
  setup.pressureSystemsSetup = setup.pressureSystemsSetup ?? setup.pressureSystems;
  setup.pressureSystems = [];
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
