import { runInAction } from "mobx";
import config from "../config";
import {
  serializeSimulation, applySimulationState, defaultSimulationState, extractSetupState
} from "./simulation-serialization";
import { createStores } from "./stores";
import { PressureSystem } from "./pressure-system";

describe("simulation-serialization", () => {
  describe("serializeSimulation", () => {
    it("serializes all simulation properties", () => {
      const { simulation } = createStores();
      const state = serializeSimulation(simulation);

      expect(state.season).toBe(simulation.season);
      expect(state.startLocation).toBe(simulation.startLocation);
      expect(state.pressureSystemsSetup).toEqual(simulation.pressureSystemsSetup.map(ps => ps.serialize()));
      // The run hasn't started, so it has no pressure systems of its own yet.
      expect(state.pressureSystems).toEqual([]);
      expect(state.simulationStarted).toBe(false);
      expect(state.simulationFinished).toBe(false);
      expect(state.time).toBe(0);
      expect(state.hurricane.center).toEqual(simulation.hurricane.center);
      expect(state.hurricaneTrack).toEqual([]);
      expect(state.landfalls).toEqual([]);
      expect(state.consumedExtendedLandfallAreas).toEqual([]);
      expect(state.temperatureAnomalies).toBeDefined();
    });
  });

  describe("applySimulationState", () => {
    it("round-trips simulation state between two store instances", () => {
      const source = createStores().simulation;
      source.season = "winter";
      source.simulationStarted = true;
      source.simulationFinished = true;
      source.time = 42;
      source.hurricaneTrack.push({ position: { lat: 20, lng: -40 }, category: 2 });
      source.landfalls.push({ position: { lat: 25, lng: -80 }, category: 1 });
      source.strengthChangePositions.push(0);
      source.hurricane.center = { lat: 21, lng: -41 };
      source.hurricane.strength = 55;
      source.setTemperatureAnomaly("gulf", 2);

      const target = createStores().simulation;
      applySimulationState(target, serializeSimulation(source));

      expect(target.season).toBe("winter");
      expect(target.simulationStarted).toBe(true);
      expect(target.simulationFinished).toBe(true);
      expect(target.time).toBe(42);
      expect(target.hurricaneTrack).toEqual([{ position: { lat: 20, lng: -40 }, category: 2 }]);
      expect(target.landfalls).toEqual([{ position: { lat: 25, lng: -80 }, category: 1 }]);
      expect(target.hurricane.center).toEqual({ lat: 21, lng: -41 });
      expect(target.hurricane.strength).toBe(55);
      expect(target.temperatureAnomalyAt("gulf")).toBe(2);
    });

    it("clears stale per-run caches", () => {
      const { simulation } = createStores();
      simulation.windKdTreeCache = {};
      simulation.simulationRunning = true;

      applySimulationState(simulation, serializeSimulation(simulation));

      expect(simulation.windKdTreeCache).toBeNull();
      expect(simulation.simulationRunning).toBe(false);
    });

    it("round-trips the setup and the run's own pressure systems separately", () => {
      const source = createStores().simulation;
      source.pressureSystemsSetup = [
        new PressureSystem({ type: "low", center: { lat: 30, lng: -40 }, strength: 10 }),
        new PressureSystem({ type: "high", center: { lat: 20, lng: -60 }, strength: 8 })
      ];
      source.start();
      source.stop();
      // The run merged the low into the hurricane.
      source.removePressureSystem(source.activePressureSystems[0]);

      const target = createStores().simulation;
      applySimulationState(target, serializeSimulation(source));

      expect(target.pressureSystemsSetup.map(ps => ps.serialize())).toEqual([
        { type: "low", center: { lat: 30, lng: -40 }, strength: 10 },
        { type: "high", center: { lat: 20, lng: -60 }, strength: 8 }
      ]);
      expect(target.pressureSystems.map(ps => ps.serialize())).toEqual([
        { type: "high", center: { lat: 20, lng: -60 }, strength: 8 }
      ]);
      // A restored started run displays what the run did, not the setup.
      expect(target.activePressureSystems).toBe(target.pressureSystems);
    });

    it("seeds the setup from pressureSystems for runs saved before the split", () => {
      const { simulation } = createStores();
      const legacy = serializeSimulation(simulation);
      delete legacy.pressureSystemsSetup;
      legacy.pressureSystems = [{ type: "high", center: { lat: 30, lng: -80 }, strength: 10 }];

      applySimulationState(simulation, legacy);

      expect(simulation.pressureSystemsSetup.map(ps => ps.serialize())).toEqual(legacy.pressureSystems);
    });
  });

  describe("defaultSimulationState", () => {
    it("matches a freshly constructed simulation", () => {
      const { simulation } = createStores();
      expect(defaultSimulationState()).toEqual(serializeSimulation(simulation));
    });

    it("matches a fresh simulation in storm mode with an out-of-range starting category", () => {
      const { mode, startingCategory } = config;
      try {
        config.mode = "storm";
        config.startingCategory = 7.5;
        const { simulation } = createStores();
        expect(defaultSimulationState()).toEqual(serializeSimulation(simulation));
      } finally {
        config.mode = mode;
        config.startingCategory = startingCategory;
      }
    });
  });

  describe("extractSetupState", () => {
    it("keeps setup and clears the outcome of a finished run", () => {
      const { simulation } = createStores();
      runInAction(() => {
        simulation.season = "winter";
      });
      simulation.setTemperatureAnomaly("gulf", 1.5);
      const finished = serializeSimulation(simulation);
      finished.simulationStarted = true;
      finished.simulationFinished = true;
      finished.time = 100;
      finished.hurricaneTrack = [{ position: { lat: 20, lng: -40 }, category: 2 }];
      finished.landfalls = [{ position: { lat: 25, lng: -80 }, category: 1 }];
      finished.strengthChangePositions = [0];
      finished.precipitationPoints = [[20, -40, 0.5, 900000]];
      finished.numberOfStepsOverSea = 5;
      finished.consumedExtendedLandfallAreas = ["PuertoRico"];
      finished.hurricane.center = { lat: 40, lng: -70 };
      finished.hurricane.strength = 2;
      finished.hurricane.cat3SSTThresholdReached = true;

      const setup = extractSetupState(finished);

      expect(setup.season).toBe("winter");
      expect(setup.startLocation).toBe(finished.startLocation);
      expect(setup.pressureSystemsSetup).toEqual(finished.pressureSystemsSetup);
      expect(setup.pressureSystems).toEqual([]);
      expect(setup.temperatureAnomalies).toEqual(finished.temperatureAnomalies);
      expect(setup.simulationStarted).toBe(false);
      expect(setup.simulationFinished).toBe(false);
      expect(setup.time).toBe(0);
      expect(setup.hurricaneTrack).toEqual([]);
      expect(setup.landfalls).toEqual([]);
      expect(setup.strengthChangePositions).toEqual([]);
      expect(setup.precipitationPoints).toEqual([]);
      expect(setup.numberOfStepsOverSea).toBe(0);
      expect(setup.consumedExtendedLandfallAreas).toEqual([]);
      // Hurricane returns to its starting position and strength.
      expect(setup.hurricane.center).toEqual(defaultSimulationState().hurricane.center);
      expect(setup.hurricane.strength).toBe(defaultSimulationState().hurricane.strength);
      expect(setup.hurricane.cat3SSTThresholdReached).toBe(false);
    });

    it("keeps the setup of a legacy run that stored it in pressureSystems", () => {
      const { simulation } = createStores();
      const legacy = serializeSimulation(simulation);
      delete legacy.pressureSystemsSetup;
      legacy.pressureSystems = [{ type: "high", center: { lat: 30, lng: -80 }, strength: 10 }];
      legacy.simulationStarted = true;
      legacy.simulationFinished = true;

      const setup = extractSetupState(legacy);

      expect(setup.pressureSystemsSetup).toEqual([{ type: "high", center: { lat: 30, lng: -80 }, strength: 10 }]);
      expect(setup.pressureSystems).toEqual([]);
    });
  });
});
