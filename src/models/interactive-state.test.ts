import { migrateState, getInteractiveState, setInteractiveState } from "./interactive-state";
import { createStores } from "./stores";
import { IHurricaneInteractiveState } from "../types/interactive-state";

describe("interactive-state", () => {
  describe("migrateState", () => {
    it("returns null for null input", () => {
      expect(migrateState(null)).toBeNull();
    });

    it("returns null for undefined input", () => {
      expect(migrateState(undefined)).toBeNull();
    });

    it("returns null for non-object input", () => {
      expect(migrateState("string")).toBeNull();
      expect(migrateState(123)).toBeNull();
    });

    it("returns state unchanged if version is current (1)", () => {
      const state: IHurricaneInteractiveState = {
        version: 1,
        simulation: {
          season: "fall",
          startLocation: "atlantic",
          pressureSystems: [],
          simulationStarted: false,
          simulationFinished: false,
          time: 0,
          hurricane: { center: { lat: 20, lng: -40 }, strength: 30, speed: { u: 0, v: 0 } },
          hurricaneTrack: [],
          landfalls: [],
          strengthChangePositions: [],
          precipitationPoints: []
        },
        ui: {
          baseMap: "satellite",
          overlay: "sst",
          windArrows: true,
          hurricaneImage: false,
          accessibleSSTScale: false,
          categoryChangeMarkers: true,
          thermometerActive: false,
          thermometerPositionSaved: null,
          zoomedInView: false
        }
      };
      expect(migrateState(state)).toEqual(state);
    });

    it("migrates legacy state without version field", () => {
      const legacyState = {
        simulation: { season: "winter" },
        ui: { baseMap: "relief" }
      };
      const migrated = migrateState(legacyState);
      expect(migrated).not.toBeNull();
      expect(migrated?.version).toBe(1);
      expect(migrated?.simulation).toEqual({ season: "winter" });
    });

    it("returns null for unrecognized state structure", () => {
      const unknownState = { foo: "bar" };
      expect(migrateState(unknownState)).toBeNull();
    });

    it("logs warning and returns null for unknown version", () => {
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();
      const futureState = { version: 999, simulation: {}, ui: {} };
      expect(migrateState(futureState)).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Unknown interactive state version: 999")
      );
      consoleSpy.mockRestore();
    });
  });

  describe("getInteractiveState", () => {
    it("serializes current stores state", () => {
      const stores = createStores();
      const state = getInteractiveState(stores);

      expect(state.version).toBe(1);
      expect(state.simulation).toBeDefined();
      expect(state.simulation.season).toBe(stores.simulation.season);
      expect(state.simulation.hurricane.center).toEqual(stores.simulation.hurricane.center);
      expect(state.ui).toBeDefined();
      expect(state.ui.baseMap).toBe(stores.ui.baseMap);
    });

    it("includes all required simulation properties", () => {
      const stores = createStores();
      const state = getInteractiveState(stores);

      expect(state.simulation).toHaveProperty("season");
      expect(state.simulation).toHaveProperty("startLocation");
      expect(state.simulation).toHaveProperty("pressureSystems");
      expect(state.simulation).toHaveProperty("simulationStarted");
      expect(state.simulation).toHaveProperty("simulationFinished");
      expect(state.simulation).toHaveProperty("time");
      expect(state.simulation).toHaveProperty("hurricane");
      expect(state.simulation).toHaveProperty("hurricaneTrack");
      expect(state.simulation).toHaveProperty("landfalls");
      // Internal state for seamless resume
      expect(state.simulation).toHaveProperty("numberOfStepsOverSea");
      expect(state.simulation).toHaveProperty("numberOfStepsOverLand");
      expect(state.simulation).toHaveProperty("consumedExtendedLandfallAreas");
    });

    it("serializes cat3SSTThresholdReached in hurricane state", () => {
      const stores = createStores();
      stores.simulation.hurricane.cat3SSTThresholdReached = true;
      const state = getInteractiveState(stores);

      expect(state.simulation.hurricane.cat3SSTThresholdReached).toBe(true);
    });

    it("serializes numberOfStepsOverSea and numberOfStepsOverLand", () => {
      const stores = createStores();
      stores.simulation.numberOfStepsOverSea = 15;
      stores.simulation.numberOfStepsOverLand = 5;
      const state = getInteractiveState(stores);

      expect(state.simulation.numberOfStepsOverSea).toBe(15);
      expect(state.simulation.numberOfStepsOverLand).toBe(5);
    });

    it("serializes consumed extended landfall areas", () => {
      const stores = createStores();
      // Simulate consuming Puerto Rico area by removing it from the array
      stores.simulation.extendedLandfallAreas = stores.simulation.extendedLandfallAreas
        .filter((_, idx) => idx !== 0); // Remove first area (PuertoRico)
      const state = getInteractiveState(stores);

      expect(state.simulation.consumedExtendedLandfallAreas).toContain("PuertoRico");
    });

    it("includes all required UI properties", () => {
      const stores = createStores();
      const state = getInteractiveState(stores);

      expect(state.ui).toHaveProperty("baseMap");
      expect(state.ui).toHaveProperty("overlay");
      expect(state.ui).toHaveProperty("windArrows");
      expect(state.ui).toHaveProperty("hurricaneImage");
      expect(state.ui).toHaveProperty("accessibleSSTScale");
      expect(state.ui).toHaveProperty("categoryChangeMarkers");
      expect(state.ui).toHaveProperty("thermometerActive");
    });
  });

  describe("setInteractiveState", () => {
    it("does nothing when state is null", () => {
      const stores = createStores();
      const originalSeason = stores.simulation.season;
      setInteractiveState(stores, null);
      expect(stores.simulation.season).toBe(originalSeason);
    });

    it("restores simulation properties", () => {
      const stores = createStores();
      const state: IHurricaneInteractiveState = {
        version: 1,
        simulation: {
          season: "winter",
          startLocation: "gulf",
          pressureSystems: [{ type: "high", center: { lat: 30, lng: -80 }, strength: 10 }],
          simulationStarted: true,
          simulationFinished: false,
          time: 1000,
          hurricane: { center: { lat: 25, lng: -70 }, strength: 50, speed: { u: 100, v: 50 } },
          hurricaneTrack: [{ position: { lat: 20, lng: -60 }, category: 2 }],
          landfalls: [],
          strengthChangePositions: [0, 100],
          precipitationPoints: []
        },
        ui: {
          baseMap: "relief",
          overlay: "precipitation",
          windArrows: false,
          hurricaneImage: true,
          accessibleSSTScale: true,
          categoryChangeMarkers: false,
          thermometerActive: true,
          thermometerPositionSaved: [30, -85],
          zoomedInView: false
        }
      };

      setInteractiveState(stores, state);

      expect(stores.simulation.season).toBe("winter");
      expect(stores.simulation.startLocation).toBe("gulf");
      expect(stores.simulation.simulationStarted).toBe(true);
      expect(stores.simulation.time).toBe(1000);
      expect(stores.simulation.hurricane.center.lat).toBe(25);
      expect(stores.simulation.hurricane.strength).toBe(50);
    });

    it("restores UI properties", () => {
      const stores = createStores();
      const state: IHurricaneInteractiveState = {
        version: 1,
        simulation: {
          season: "fall",
          startLocation: "atlantic",
          pressureSystems: [],
          simulationStarted: false,
          simulationFinished: false,
          time: 0,
          hurricane: { center: { lat: 20, lng: -40 }, strength: 30, speed: { u: 0, v: 0 } },
          hurricaneTrack: [],
          landfalls: [],
          strengthChangePositions: [],
          precipitationPoints: []
        },
        ui: {
          baseMap: "relief",
          overlay: "precipitation",
          windArrows: false,
          hurricaneImage: true,
          accessibleSSTScale: true,
          categoryChangeMarkers: false,
          thermometerActive: true,
          thermometerPositionSaved: [30, -85],
          zoomedInView: false
        }
      };

      setInteractiveState(stores, state);

      expect(stores.ui.baseMap).toBe("relief");
      expect(stores.ui.overlay).toBe("precipitation");
      expect(stores.ui.windArrows).toBe(false);
      expect(stores.ui.hurricaneImage).toBe(true);
      expect(stores.ui.accessibleSSTScale).toBe(true);
      expect(stores.ui.thermometerActive).toBe(true);
    });

    it("restores cat3SSTThresholdReached", () => {
      const stores = createStores();
      expect(stores.simulation.hurricane.cat3SSTThresholdReached).toBe(false);

      const state: IHurricaneInteractiveState = {
        version: 1,
        simulation: {
          season: "fall",
          startLocation: "atlantic",
          pressureSystems: [],
          simulationStarted: true,
          simulationFinished: false,
          time: 500,
          hurricane: {
            center: { lat: 20, lng: -40 },
            strength: 60,
            speed: { u: 100, v: 50 },
            cat3SSTThresholdReached: true
          },
          hurricaneTrack: [],
          landfalls: [],
          strengthChangePositions: [],
          precipitationPoints: []
        },
        ui: {
          baseMap: "satellite",
          overlay: "sst",
          windArrows: true,
          hurricaneImage: false,
          accessibleSSTScale: false,
          categoryChangeMarkers: true,
          thermometerActive: false,
          thermometerPositionSaved: null,
          zoomedInView: false
        }
      };

      setInteractiveState(stores, state);
      expect(stores.simulation.hurricane.cat3SSTThresholdReached).toBe(true);
    });

    it("restores numberOfStepsOverSea and numberOfStepsOverLand", () => {
      const stores = createStores();
      expect(stores.simulation.numberOfStepsOverSea).toBe(0);
      expect(stores.simulation.numberOfStepsOverLand).toBe(0);

      const state: IHurricaneInteractiveState = {
        version: 1,
        simulation: {
          season: "fall",
          startLocation: "atlantic",
          pressureSystems: [],
          simulationStarted: true,
          simulationFinished: false,
          time: 500,
          hurricane: { center: { lat: 20, lng: -40 }, strength: 50, speed: { u: 0, v: 0 } },
          hurricaneTrack: [],
          landfalls: [],
          strengthChangePositions: [],
          precipitationPoints: [],
          numberOfStepsOverSea: 25,
          numberOfStepsOverLand: 3
        },
        ui: {
          baseMap: "satellite",
          overlay: "sst",
          windArrows: true,
          hurricaneImage: false,
          accessibleSSTScale: false,
          categoryChangeMarkers: true,
          thermometerActive: false,
          thermometerPositionSaved: null,
          zoomedInView: false
        }
      };

      setInteractiveState(stores, state);
      expect(stores.simulation.numberOfStepsOverSea).toBe(25);
      expect(stores.simulation.numberOfStepsOverLand).toBe(3);
    });

    it("restores consumed extended landfall areas", () => {
      const stores = createStores();
      const initialAreaCount = stores.simulation.extendedLandfallAreas.length;

      const state: IHurricaneInteractiveState = {
        version: 1,
        simulation: {
          season: "fall",
          startLocation: "atlantic",
          pressureSystems: [],
          simulationStarted: true,
          simulationFinished: false,
          time: 500,
          hurricane: { center: { lat: 20, lng: -40 }, strength: 50, speed: { u: 0, v: 0 } },
          hurricaneTrack: [],
          landfalls: [],
          strengthChangePositions: [],
          precipitationPoints: [],
          consumedExtendedLandfallAreas: ["PuertoRico", "FloridaEast1"]
        },
        ui: {
          baseMap: "satellite",
          overlay: "sst",
          windArrows: true,
          hurricaneImage: false,
          accessibleSSTScale: false,
          categoryChangeMarkers: true,
          thermometerActive: false,
          thermometerPositionSaved: null,
          zoomedInView: false
        }
      };

      setInteractiveState(stores, state);
      // Should have 2 fewer areas after restoration
      expect(stores.simulation.extendedLandfallAreas.length).toBe(initialAreaCount - 2);
    });
  });
});
