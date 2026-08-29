import { migrateState, getInteractiveState, setInteractiveState } from "./interactive-state";
import { createStores } from "./stores";
import { IHurricaneInteractiveState, ISimulationState, IUIState } from "../types/interactive-state";
import config from "../config";

const v1SimulationFixture: ISimulationState = {
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
};

const uiFixture: IUIState = {
  baseMap: "satellite",
  overlay: "sst",
  windArrows: true,
  hurricaneImage: false,
  accessibleSSTScale: false,
  categoryChangeMarkers: true,
  thermometerActive: false,
  thermometerPositionSaved: null,
  zoomedInView: false
};

const makeV2State = (simulation: ISimulationState, ui: IUIState = uiFixture): IHurricaneInteractiveState => ({
  version: 2,
  runs: [{ id: "run-1", simulation }],
  selectedRunId: "run-1",
  ui
});

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

    it("returns state unchanged if version is current (2)", () => {
      const state = makeV2State(v1SimulationFixture);
      expect(migrateState(state)).toEqual(state);
    });

    it("migrates v1 state by wrapping the simulation as a single run", () => {
      const v1State = { version: 1, mode: "storm", simulation: v1SimulationFixture, ui: uiFixture };
      const migrated = migrateState(v1State);
      expect(migrated?.version).toBe(2);
      expect(migrated?.mode).toBe("storm");
      expect(migrated?.runs).toEqual([{ id: "run-1", simulation: v1SimulationFixture }]);
      expect(migrated?.selectedRunId).toBe("run-1");
      expect(migrated?.ui).toEqual(uiFixture);
    });

    it("migrates legacy state without version field", () => {
      const legacyState = {
        simulation: { season: "winter" },
        ui: { baseMap: "relief" }
      };
      const migrated = migrateState(legacyState);
      expect(migrated).not.toBeNull();
      expect(migrated?.version).toBe(2);
      expect(migrated?.runs).toEqual([{ id: "run-1", simulation: { season: "winter" } }]);
      expect(migrated?.selectedRunId).toBe("run-1");
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

      expect(state.version).toBe(2);
      expect(state.runs.length).toBe(1);
      expect(state.selectedRunId).toBe(stores.runs.selectedRunId);
      expect(state.runs[0].simulation).toBeDefined();
      expect(state.runs[0].simulation.season).toBe(stores.simulation.season);
      expect(state.runs[0].simulation.hurricane.center).toEqual(stores.simulation.hurricane.center);
      expect(state.ui).toBeDefined();
      expect(state.ui.baseMap).toBe(stores.ui.baseMap);
    });

    it("includes all required simulation properties", () => {
      const stores = createStores();
      const state = getInteractiveState(stores);
      const simulation = state.runs[0].simulation;

      expect(simulation).toHaveProperty("season");
      expect(simulation).toHaveProperty("startLocation");
      expect(simulation).toHaveProperty("pressureSystems");
      expect(simulation).toHaveProperty("pressureSystemsSetup");
      expect(simulation).toHaveProperty("simulationStarted");
      expect(simulation).toHaveProperty("simulationFinished");
      expect(simulation).toHaveProperty("time");
      expect(simulation).toHaveProperty("hurricane");
      expect(simulation).toHaveProperty("hurricaneTrack");
      expect(simulation).toHaveProperty("landfalls");
      // Internal state for seamless resume
      expect(simulation).toHaveProperty("numberOfStepsOverSea");
      expect(simulation).toHaveProperty("numberOfStepsOverLand");
      expect(simulation).toHaveProperty("consumedExtendedLandfallAreas");
    });

    it("serializes cat3SSTThresholdReached in hurricane state", () => {
      const stores = createStores();
      stores.simulation.hurricane.cat3SSTThresholdReached = true;
      const state = getInteractiveState(stores);

      expect(state.runs[0].simulation.hurricane.cat3SSTThresholdReached).toBe(true);
    });

    it("serializes numberOfStepsOverSea and numberOfStepsOverLand", () => {
      const stores = createStores();
      stores.simulation.numberOfStepsOverSea = 15;
      stores.simulation.numberOfStepsOverLand = 5;
      const state = getInteractiveState(stores);

      expect(state.runs[0].simulation.numberOfStepsOverSea).toBe(15);
      expect(state.runs[0].simulation.numberOfStepsOverLand).toBe(5);
    });

    it("serializes consumed extended landfall areas", () => {
      const stores = createStores();
      // Simulate consuming Puerto Rico area by removing it from the array
      stores.simulation.extendedLandfallAreas = stores.simulation.extendedLandfallAreas
        .filter((_, idx) => idx !== 0); // Remove first area (PuertoRico)
      const state = getInteractiveState(stores);

      expect(state.runs[0].simulation.consumedExtendedLandfallAreas).toContain("PuertoRico");
    });

    it("serializes the selected run from the live simulation", () => {
      const stores = createStores();
      stores.simulation.season = "winter";
      const state = getInteractiveState(stores);
      expect(state.runs[0].simulation.season).toBe("winter");
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
      const state = makeV2State({
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
      });

      setInteractiveState(stores, state);

      expect(stores.simulation.season).toBe("winter");
      expect(stores.simulation.startLocation).toBe("gulf");
      expect(stores.simulation.simulationStarted).toBe(true);
      expect(stores.simulation.time).toBe(1000);
      expect(stores.simulation.hurricane.center.lat).toBe(25);
      expect(stores.simulation.hurricane.strength).toBe(50);
      expect(stores.simulation.pressureSystems.length).toBe(1);
      expect(stores.simulation.pressureSystems[0].type).toBe("high");
      expect(stores.simulation.pressureSystems[0].center.lat).toBe(30);
      // This state predates pressureSystemsSetup, so the setup falls back to pressureSystems.
      expect(stores.simulation.pressureSystemsSetup.map(ps => ps.serialize()))
        .toEqual([{ type: "high", center: { lat: 30, lng: -80 }, strength: 10, label: "" }]);
      expect(stores.simulation.simulationFinished).toBe(false);
      expect(stores.simulation.hurricaneTrack.length).toBe(1);
      expect(stores.simulation.hurricaneTrack[0].category).toBe(2);
      expect(stores.simulation.landfalls).toEqual([]);
      expect(stores.simulation.strengthChangePositions).toEqual([0, 100]);
      expect(stores.simulation.precipitationPoints).toEqual([]);
      expect(stores.runs.runs.length).toBe(1);
      expect(stores.runs.selectedRunId).toBe("run-1");
    });

    it("restores UI properties", () => {
      const stores = createStores();
      const state = makeV2State(v1SimulationFixture, {
        baseMap: "relief",
        overlay: "precipitation",
        windArrows: false,
        hurricaneImage: true,
        accessibleSSTScale: true,
        categoryChangeMarkers: false,
        thermometerActive: true,
        thermometerPositionSaved: [30, -85],
        zoomedInView: false
      });

      setInteractiveState(stores, state);

      expect(stores.ui.baseMap).toBe("relief");
      expect(stores.ui.overlay).toBe("precipitation");
      expect(stores.ui.windArrows).toBe(false);
      expect(stores.ui.hurricaneImage).toBe(true);
      expect(stores.ui.sstOverlay.accessibleSSTScale).toBe(true);
      expect(stores.ui.thermometerActive).toBe(true);
      expect(stores.ui.categoryChangeMarkers).toBe(false);
      expect(stores.ui.thermometerPositionSaved).toEqual([30, -85]);
      expect(stores.ui.zoomedInView).toBe(false);
    });

    it("restores cat3SSTThresholdReached", () => {
      const stores = createStores();
      expect(stores.simulation.hurricane.cat3SSTThresholdReached).toBe(false);

      const state = makeV2State({
        ...v1SimulationFixture,
        simulationStarted: true,
        time: 500,
        hurricane: {
          center: { lat: 20, lng: -40 },
          strength: 60,
          speed: { u: 100, v: 50 },
          cat3SSTThresholdReached: true
        }
      });

      setInteractiveState(stores, state);
      expect(stores.simulation.hurricane.cat3SSTThresholdReached).toBe(true);
    });

    it("restores numberOfStepsOverSea and numberOfStepsOverLand", () => {
      const stores = createStores();
      expect(stores.simulation.numberOfStepsOverSea).toBe(0);
      expect(stores.simulation.numberOfStepsOverLand).toBe(0);

      const state = makeV2State({
        ...v1SimulationFixture,
        simulationStarted: true,
        time: 500,
        numberOfStepsOverSea: 25,
        numberOfStepsOverLand: 3
      });

      setInteractiveState(stores, state);
      expect(stores.simulation.numberOfStepsOverSea).toBe(25);
      expect(stores.simulation.numberOfStepsOverLand).toBe(3);
    });

    it("restores consumed extended landfall areas", () => {
      const stores = createStores();
      const initialAreaCount = stores.simulation.extendedLandfallAreas.length;

      const state = makeV2State({
        ...v1SimulationFixture,
        simulationStarted: true,
        time: 500,
        consumedExtendedLandfallAreas: ["PuertoRico", "FloridaEast1"]
      });

      setInteractiveState(stores, state);
      // Should have 2 fewer areas after restoration
      expect(stores.simulation.extendedLandfallAreas.length).toBe(initialAreaCount - 2);
    });

    it("restores legacy state with ui only (no simulation) without crashing", () => {
      const migrated = migrateState({ ui: uiFixture });
      expect(() => setInteractiveState(createStores(), migrated!)).not.toThrow();
    });

    it("degrades safely on corrupt v2 state with no runs field", () => {
      const stores = createStores();
      const corrupt = { version: 2, ui: uiFixture } as unknown as IHurricaneInteractiveState;
      expect(() => setInteractiveState(stores, corrupt)).not.toThrow();
      expect(stores.runs.runs.length).toBe(1);
    });

    it("round-trips multiple runs through get/setInteractiveState", () => {
      const source = createStores();
      source.simulation.season = "winter";
      source.simulation.simulationStarted = true;
      source.simulation.simulationFinished = true;
      source.runs.addRun();
      const saved = JSON.parse(JSON.stringify(getInteractiveState(source)));
      expect(saved.runs.length).toBe(2);

      const target = createStores();
      setInteractiveState(target, saved);
      expect(target.runs.runs.map((r: any) => r.id)).toEqual(source.runs.runs.map(r => r.id));
      expect(target.runs.selectedRunId).toBe(source.runs.selectedRunId);
      expect(target.runs.runs[0].simulation.season).toBe("winter");
      expect(target.simulation.simulationFinished).toBe(false); // selected (second) run is fresh
    });
  });

  describe("temperatureAnomalies round-trip", () => {
    it("serializes anomalies as a plain object", () => {
      const stores = createStores();
      stores.simulation.adjustTemperatureAnomaly("gulf", 2);
      stores.simulation.adjustTemperatureAnomaly("caribbean", -1);
      const state = getInteractiveState(stores);
      expect(state.runs[0].simulation.temperatureAnomalies).toMatchObject({ gulf: 2, caribbean: -1 });
    });

    it("restores anomalies into the model", () => {
      const stores = createStores();
      const state = getInteractiveState(stores);
      state.runs[0].simulation.temperatureAnomalies = { gulf: 3, coastalAfrica: -2 };
      expect(stores.simulation.temperatureAnomalyAt("gulf")).toBe(0);
      expect(stores.simulation.temperatureAnomalyAt("coastalAfrica")).toBe(0);
      expect(stores.simulation.temperatureAnomalyAt("caribbean")).toBe(0);
      setInteractiveState(stores, state);
      expect(stores.simulation.temperatureAnomalyAt("gulf")).toBe(3);
      expect(stores.simulation.temperatureAnomalyAt("coastalAfrica")).toBe(-2);
      expect(stores.simulation.temperatureAnomalyAt("caribbean")).toBe(0);
    });

    it("does not override current state when the field is absent (legacy state)", () => {
      const stores = createStores();
      stores.simulation.adjustTemperatureAnomaly("gulf", 2);
      const state = getInteractiveState(stores);
      delete state.runs[0].simulation.temperatureAnomalies;
      expect(stores.simulation.temperatureAnomalyAt("gulf")).toBe(2);
      setInteractiveState(stores, state);
      // Absent field => no override; model keeps whatever it had (here, the prior value).
      expect(stores.simulation.temperatureAnomalyAt("gulf")).toBe(2);
    });
  });

  describe("mode round-trip", () => {
    // `mode` (hurricane vs storm) is read from / written to the config singleton,
    // so save and restore it around each test to avoid leaking into other suites.
    let originalMode: string;
    beforeEach(() => { originalMode = config.mode; });
    afterEach(() => { config.mode = originalMode; });

    it("serializes the current config.mode", () => {
      config.mode = "storm";
      const state = getInteractiveState(createStores());
      expect(state.mode).toBe("storm");
    });

    it("restores config.mode so a modelId load enters the saved mode", () => {
      const stores = createStores();
      config.mode = "storm";
      const state = getInteractiveState(stores);
      // Simulate loading the saved state into an app running in the default mode.
      config.mode = "hurricane";
      setInteractiveState(stores, state);
      expect(config.mode).toBe("storm");
    });

    it("does not override the current mode when the field is absent (legacy state)", () => {
      const stores = createStores();
      expect(config.mode).toBe("hurricane");
      const state = getInteractiveState(stores);
      expect(state.mode).toBe("hurricane");
      delete state.mode;
      expect(state.mode).toBeUndefined();
      config.mode = "storm";
      setInteractiveState(stores, state);
      // Absent field => no override; the app keeps its current mode.
      expect(config.mode).toBe("storm");
    });
  });
});
