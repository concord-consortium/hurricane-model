import { serializeSimulation, applySimulationState } from "./simulation-serialization";
import { createStores } from "./stores";
import { PressureSystem } from "./pressure-system";

describe("simulation-serialization", () => {
  describe("serializeSimulation", () => {
    it("serializes all simulation properties", () => {
      const { simulation } = createStores();
      const state = serializeSimulation(simulation);

      expect(state.season).toBe(simulation.season);
      expect(state.startLocation).toBe(simulation.startLocation);
      expect(state.pressureSystems).toEqual(simulation.pressureSystems.map(ps => ps.serialize()));
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
      simulation.pressureSystemSettings = [new PressureSystem({ center: { lat: 30, lng: -40 } })];
      simulation.simulationRunning = true;

      applySimulationState(simulation, serializeSimulation(simulation));

      expect(simulation.windKdTreeCache).toBeNull();
      expect(simulation.pressureSystemSettings).toEqual([]);
      expect(simulation.simulationRunning).toBe(false);
    });
  });
});
