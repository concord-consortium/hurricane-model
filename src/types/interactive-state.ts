import { LatLngExpression } from "leaflet";
import {
  AppMode, ICoordinates, IVector, ITrackPoint, ILandfall, IPrecipitationPoint, Season, StartLocation, NamedRegion
} from "../types";
import { IPressureSystemInitialState, PressureSystemType } from "../models/pressure-system";
import { MapTilesName } from "../map-layer-tiles";
import { Overlay, ZoomedInViewProps } from "../models/ui";

/**
 * Serialized state for a pressure system.
 */
export interface IPressureSystemState {
  type: PressureSystemType;
  center: ICoordinates;
  strength: number;
  label?: string;
  initialState?: IPressureSystemInitialState;
}

/**
 * Serialized state for the hurricane.
 */
export interface IHurricaneState {
  center: ICoordinates;
  strength: number;
  speed: IVector;
  startingCategory?: number;
  cat3SSTThresholdReached?: boolean;
}

/**
 * The subset of a run's state that a card summarizes as setup.
 */
export interface IRunSetup {
  season: Season;
  startLocation: StartLocation;
  startingCategory?: number;
  // What the student arranged before pressing start. The source of truth for the run's setup.
  pressureSystemsSetup: IPressureSystemState[];
  temperatureAnomalies?: Partial<Record<NamedRegion, number>>;
}

/**
 * The subset of a run's state that a card summarizes as results.
 */
export interface IRunResult {
  hurricane: IHurricaneState;
  hurricaneTrack: ITrackPoint[];
  landfalls: ILandfall[];
  // The running simulation's own systems, which the run can mutate.
  pressureSystems: IPressureSystemState[];
  time: number;
}

/**
 * Serialized simulation state.
 * In ISimulationState, the startingCategory is under hurricane instead of a top level field.
 */
export interface ISimulationState extends Omit<IRunSetup, "startingCategory">, IRunResult {
  // Simulation progress
  simulationStarted: boolean;
  simulationFinished: boolean;

  // Track data
  strengthChangePositions: number[];
  precipitationPoints: IPrecipitationPoint[];

  // Internal simulation state for seamless resume
  numberOfStepsOverSea?: number;
  numberOfStepsOverLand?: number;
  consumedExtendedLandfallAreas?: string[];
}

/**
 * A simulation state with every top-level optional field filled in.
 * Required<> is shallow, so hurricane's own optional fields are unaffected.
 */
export type INormalizedSimulationState = Required<ISimulationState>;

/**
 * A single simulation run: its setup and (when finished) its outcome, as one serialized state.
 */
export interface IRunState {
  id: string;
  simulation: ISimulationState;
}

/**
 * Serialized UI state.
 */
export interface IUIState {
  baseMap: MapTilesName;
  overlay: Overlay | null;
  windArrows: boolean;
  hurricaneImage: boolean;
  accessibleSSTScale: boolean;
  categoryChangeMarkers: boolean;
  thermometerActive: boolean;
  thermometerPositionSaved: LatLngExpression | null;
  zoomedInView: ZoomedInViewProps;
}

/**
 * Version 1 interactive state (single run). Kept for migration.
 */
export interface IHurricaneInteractiveStateV1 {
  version: 1;
  mode?: AppMode;
  simulation: ISimulationState;
  ui: IUIState;
}

/**
 * Complete interactive state saved to LARA.
 * This represents student work that can be saved and restored.
 */
export interface IHurricaneInteractiveState {
  version: 2;
  mode?: AppMode;
  runs: IRunState[];
  selectedRunId: string;
  ui: IUIState;
}

/**
 * Authored state configured by curriculum authors.
 * Uses URL parameters format for configuration.
 */
export interface IHurricaneAuthoredState {
  version: 1;
  urlParams?: string;
}
