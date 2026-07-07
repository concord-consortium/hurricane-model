import { LatLngExpression } from "leaflet";
import {
  AppMode, ICoordinates, IVector, ITrackPoint, ILandfall, IPrecipitationPoint, Season, StartLocation, NamedRegion
} from "../types";
import { PressureSystemType } from "../models/pressure-system";
import { MapTilesName } from "../map-layer-tiles";
import { Overlay, ZoomedInViewProps } from "../models/ui";

/**
 * Serialized state for a pressure system.
 */
export interface IPressureSystemState {
  type: PressureSystemType;
  center: ICoordinates;
  strength: number;
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
 * Serialized simulation state.
 */
export interface ISimulationState {
  // Core settings
  season: Season;
  startLocation: StartLocation;
  pressureSystems: IPressureSystemState[];

  // Simulation progress
  simulationStarted: boolean;
  simulationFinished: boolean;
  time: number;

  // Hurricane state (for mid-simulation restore)
  hurricane: IHurricaneState;

  // Track data
  hurricaneTrack: ITrackPoint[];
  landfalls: ILandfall[];
  strengthChangePositions: number[];
  precipitationPoints: IPrecipitationPoint[];

  // Internal simulation state for seamless resume
  numberOfStepsOverSea?: number;
  numberOfStepsOverLand?: number;
  consumedExtendedLandfallAreas?: string[];

  // Per-region SST anomalies in °C.
  temperatureAnomalies?: Partial<Record<NamedRegion, number>>;
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
 * Complete interactive state saved to LARA.
 * This represents student work that can be saved and restored.
 */
export interface IHurricaneInteractiveState {
  version: 1;
  mode?: AppMode;
  simulation: ISimulationState;
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
