import {
  SimulationModel, ISimulationOptions, windData, sstImages, minStepsOverSeaToDetectLandfall, extendedLandfallBounds
} from "./simulation";
import config from "../config";
import { PNG } from "pngjs";
import * as Leaflet from "leaflet";
const mockFetch = require("jest-fetch-mock");
const fs = require("fs");

const options: ISimulationOptions = {
  // Ensure that the initial season is always the same.
  season: "fall",
  pressureSystems: []
};

// File mock returns just a single value by default. Set different file names so some tests can work fine.
sstImages.fall = "fall.png";
sstImages.summer = "summer.png";

// Set some fake wind data that is easy to test.
const fallWind = [
  {lat: 10, lng: -10, u: 10, v: -10},
  {lat: 10, lng: 10, u: 10, v: 10}
];
windData.fall = fallWind;

describe("SimulationModel store", () => {
  beforeEach(() => {
    mockFetch.resetMocks();
    // SST Image data.
    mockFetch.mockResponse("123");
  });

  it("can be created without errors", () => {
    const sim = new SimulationModel(options);
    expect(sim.hurricane).toBeDefined();
  });

  describe("wind data", () => {
    it("returns correct, averaged wind when there are no pressure systems", () => {
      const sim = new SimulationModel(options);
      expect(sim.baseWind.length).toEqual(2);
      expect(sim.wind).toEqual(fallWind);
      expect(sim.windAt({lat: 10, lng: -10})).toEqual({u: 10, v: -10});
      expect(sim.windAt({lat: 10, lng: 10})).toEqual({u: 10, v: 10});
      expect(sim.windAt({lat: 10, lng: 0})).toEqual({u: 10, v: 0});
      // avg
      expect(sim.windAt({lat: 10, lng: -5}).u).toBeCloseTo(10);
      expect(sim.windAt({lat: 10, lng: -5}).v).toBeCloseTo(-5);
      expect(sim.windAt({lat: 10, lng: -9}).u).toBeCloseTo(10);
      expect(sim.windAt({lat: 10, lng: -9}).v).toBeCloseTo(-9);
      expect(sim.windAt({lat: 10, lng: 5}).u).toBeCloseTo(10);
      expect(sim.windAt({lat: 10, lng: 5}).v).toBeCloseTo(5);
      expect(sim.windAt({lat: 10, lng: 9}).u).toBeCloseTo(10);
      expect(sim.windAt({lat: 10, lng: 9}).v).toBeCloseTo(9);
    });

    it("takes pressure systems into account", () => {
      // High pressure system.
      let sim = new SimulationModel({
        season: "fall",
        pressureSystems: [
          {
            type: "high",
            center: {lat: 10, lng: 0},
            strength: 13
          }
        ]
      });
      expect(sim.baseWind.length).toEqual(2);
      expect(sim.wind).not.toEqual(fallWind);
      // Vector pointing up and slightly outwards.
      let p = sim.windAt({lat: 10, lng: -10});
      expect(p.u).toBeLessThan(1);
      expect(p.u).toBeGreaterThan(-2);
      expect(p.v).toBeGreaterThan(10);
      expect(p.v).toBeLessThan(11);
      // Vector pointing down and slightly outwards.
      p = sim.windAt({lat: 10, lng: 10});
      expect(p.u).toBeGreaterThan(1);
      expect(p.u).toBeLessThan(2);
      expect(p.v).toBeLessThan(-10);
      expect(p.v).toBeGreaterThan(-11);

      // Low pressure system.
      sim = new SimulationModel({
        season: "fall",
        pressureSystems: [
          {
            type: "low",
            center: {lat: 10, lng: 0},
            strength: 14
          }
        ]
      });
      expect(sim.baseWind.length).toEqual(2);
      expect(sim.wind).not.toEqual(fallWind);
      // Vector pointing down and slightly inwards.
      p = sim.windAt({lat: 10, lng: -10});
      expect(p.u).toBeGreaterThan(5);
      expect(p.u).toBeLessThan(6);
      expect(p.v).toBeLessThan(-12);
      expect(p.v).toBeGreaterThan(-13);
      // Vector pointing up and slightly inwards.
      p = sim.windAt({lat: 10, lng: 10});
      expect(p.u).toBeLessThan(-5);
      expect(p.u).toBeGreaterThan(-6);
      expect(p.v).toBeGreaterThan(12);
      expect(p.v).toBeLessThan(13);
    });

    describe("windIncHurricane", () => {
      it("includes hurricane effect", () => {
        const sim = new SimulationModel(options);
        sim.hurricane.center = {lat: 10, lng: 0};
        // Make it super strong so it affects two wind points that we have.
        sim.hurricane.strength = 140;
        expect(sim.windIncHurricane.length).toEqual(2);
        expect(sim.windIncHurricane).not.toEqual(fallWind);
        // Vector pointing down and slightly inwards.
        let p = sim.windIncHurricane[0];
        expect(p.u).toBeGreaterThan(33);
        expect(p.u).toBeLessThan(34);
        expect(p.v).toBeLessThan(-80);
        expect(p.v).toBeGreaterThan(-81);
        // Vector pointing up and slightly inwards.
        p = sim.windIncHurricane[1];
        expect(p.u).toBeLessThan(-34);
        expect(p.u).toBeGreaterThan(-35);
        expect(p.v).toBeGreaterThan(79);
        expect(p.v).toBeLessThan(80);
      });
    });

    describe("windWithinBounds", () => {
      it("changes depending on bounds", () => {
        const sim = new SimulationModel(options);
        let newBounds = {
          getWest: () => -180,
          getEast: () => 180, // area width 360
          getNorth: () => 85,
          getSouth: () => -85,
        };
        sim.updateBounds((newBounds as any) as Leaflet.LatLngBounds);
        expect(sim.windWithinBounds.length).toEqual(1); // every nth wind vector

        newBounds = {
          getWest: () => -45,
          getEast: () => 45, // area width 90
          getNorth: () => 45,
          getSouth: () => -45,
        };
        sim.updateBounds((newBounds as any) as Leaflet.LatLngBounds);
        expect(sim.windWithinBounds.length).toEqual(2); // all the vectors

        newBounds = {
          getWest: () => -20,
          getEast: () => 20,  // area width < 40
          getNorth: () => 20,
          getSouth: () => -20,
        };
        sim.updateBounds((newBounds as any) as Leaflet.LatLngBounds);
        expect(sim.windWithinBounds.length).toEqual(961); // 31 * 31 = 661 -> vectors generated using given range
      });
    });
  });

  describe("sea surface temperature data", () => {
    it("downloads sea surface temperature data on init or change of the season", () => {
      const sim = new SimulationModel(options);
      expect(sim.dataSeaSurfaceTempImgUrl).toEqual("fall.png");
      expect(sim.seaSurfaceTempData).toEqual(null); // no time to parse it
      expect(mockFetch.mock.calls.length).toEqual(1);
      expect(mockFetch.mock.calls[0][0]).toEqual(sim.dataSeaSurfaceTempImgUrl);

      sim.season = "summer";
      expect(sim.dataSeaSurfaceTempImgUrl).toEqual("summer.png");
      expect(sim.seaSurfaceTempData).toEqual(null); // no time to parse it
      expect(mockFetch.mock.calls.length).toEqual(2);
      expect(mockFetch.mock.calls[1][0]).toEqual(sim.dataSeaSurfaceTempImgUrl);
      // No valid data parsed yet, so expect null.
      expect(sim.seaSurfaceTempAt(config.initialHurricanePosition)).toEqual(null);
    });

    it("reports correct SST value", (done) => {
      jest.setTimeout(10000);
      mockFetch.mockResponseOnce(fs.readFileSync("./sea-surface-temp-img/sep-default.png"));
      const sim = new SimulationModel(options);
      sim._seaSurfaceTempDataParsed = () => {
        expect(sim.seaSurfaceTempData).not.toEqual(null); // real data, should be already parsed
        // Temperature in September at lat 20 lng -20 is 24.02*C.
        // Can be checked here:
        // https://worldview.earthdata.nasa.gov/?p=geographic&l=MODIS_Aqua_L3_SST_MidIR_4km_Night_Monthly,Reference_Lab
        // els(hidden),Reference_Features,Coastlines(hidden)&t=2018-09-19-T00%3A00%3A00Z&z=3&v=-144.11630581918422,-22.
        // 21990140009921,35.883694180815795,68.41291109990078
        // or in our data sets.
        expect(sim.seaSurfaceTempAt({lat: 20, lng: -20})).toEqual(24.02);
        expect(sim.seaSurfaceTempAt({lat: 20, lng: -90})).toEqual(null); // land

        // Change season and test again.
        mockFetch.mockResponseOnce(fs.readFileSync("./sea-surface-temp-img/jun-default.png"));
        sim.season = "summer";
        sim._seaSurfaceTempDataParsed = () => {
          expect(sim.seaSurfaceTempData).not.toEqual(null); // real data, should be already parsed
          // Temperature in June at lat 20 lng -20 is 20.73*C (colder than in Sept).
          // Can be checked here:
          // https://worldview.earthdata.nasa.gov/?p=geographic&l=MODIS_Aqua_L3_SST_MidIR_4km_Night_Monthly,Reference_
          // Labels(hidden),Reference_Features,Coastlines(hidden)&t=2018-09-19-T00%3A00%3A00Z&z=3&v=-144.11630581918422,
          // -22.21990140009921,35.883694180815795,68.41291109990078
          // or in our data sets.
          expect(sim.seaSurfaceTempAt({lat: 20, lng: -20})).toEqual(20.73);
          expect(sim.seaSurfaceTempAt({lat: 20, lng: -90})).toEqual(null); // land
          done();
        };
      };
    // 10s timeout, parsing can take some time.
    });
  });

  describe("categoryMarkerPositions", () => {
    const mapBounds = new Leaflet.LatLngBounds({ lat: -5, lng: -5 }, { lat: 5, lng: 5 });
    it("should show no markers with no hurricane track", () => {
      const sim = new SimulationModel(options);
      expect(sim.getCategoryMarkerPositions(mapBounds)).toEqual([]);
    });
    it("should show no markers with insufficient hurricane track", () => {
      const sim = new SimulationModel(options);
      sim.hurricaneTrack = [{ position: { lat: 1, lng: -1 }, category: 0 }];
      sim.strengthChangePositions = [0];
      expect(sim.getCategoryMarkerPositions(mapBounds)).toEqual([]);
    });
    it("should show marker in middle of middle segment for odd number of segments", () => {
      const sim = new SimulationModel(options);
      sim.hurricaneTrack = [
        { position: { lat: 1, lng: -1 }, category: 0 },
        { position: { lat: 3, lng: -3 }, category: 1 }
      ];
      sim.strengthChangePositions = [0, 1];
      expect(sim.getCategoryMarkerPositions(mapBounds)).toEqual([{ position: { lat: 2, lng: -2 }, category: 0 }]);
    });
    it("should show marker at join of middle segments for even number of segments", () => {
      const sim = new SimulationModel(options);
      sim.hurricaneTrack = [
        { position: { lat: 1, lng: -1 }, category: 0 },
        { position: { lat: 2, lng: -2 }, category: 0 },
        { position: { lat: 3, lng: -3 }, category: 1 }
      ];
      sim.strengthChangePositions = [0, 2];
      expect(sim.getCategoryMarkerPositions(mapBounds)).toEqual([{ position: { lat: 2, lng: -2 }, category: 0 }]);
    });
    it("should show markers in visible parts of segments", () => {
      const sim = new SimulationModel(options);
      sim.hurricaneTrack = [
        { position: { lat: 1, lng: -1 }, category: 0 },
        { position: { lat: 3, lng: -3 }, category: 1 },
        { position: { lat: 4, lng: -4 }, category: 1 },
        { position: { lat: 6, lng: -6 }, category: 1 },
        { position: { lat: 8, lng: -8 }, category: 0 }
      ];
      sim.strengthChangePositions = [0, 1, 4];
      expect(sim.getCategoryMarkerPositions(mapBounds))
        .toEqual([{ position: { lat: 2, lng: -2 }, category: 0 }, { position: { lat: 4, lng: -4 }, category: 1 }]);
    });
  });

  describe("tick", () => {
    it("increases simulation time, moves hurricane and saves it track", () => {
      const sim = new SimulationModel(options);
      sim.hurricane.move = jest.fn();
      sim.hurricane.setStrengthChangeFromSST = jest.fn();
      sim.hurricane.updateStrength = jest.fn();
      sim.seaSurfaceTempAt = jest.fn();
      sim.hurricaneWithinExtendedLandfallArea = jest.fn();
      expect(sim.time).toEqual(0);
      expect(sim.hurricaneTrack.length).toEqual(0);
      expect(sim.precipitationPoints.length).toEqual(0);
      const oldPos = sim.hurricane.center;
      sim.tick();
      expect(sim.time).toBeGreaterThan(0);
      expect(sim.hurricaneTrack[0].position).toEqual(oldPos);
      expect(sim.hurricane.move).toHaveBeenCalled();
      expect(sim.seaSurfaceTempAt).toHaveBeenCalled();
      expect(sim.hurricaneWithinExtendedLandfallArea).toHaveBeenCalled();
      expect(sim.hurricane.setStrengthChangeFromSST).toHaveBeenCalled();
      expect(sim.hurricane.updateStrength).toHaveBeenCalled();
      expect(sim.hurricaneTrack.length).toBeGreaterThan(0);
      expect(sim.hurricaneTrack[0].category).toEqual(sim.hurricane.category);
      expect(sim.hurricaneTrack[0].position).toEqual(oldPos);
      expect(sim.hurricaneTrack[0].position).not.toBe(oldPos); // we expect a copy
      expect(sim.numberOfStepsOverSea).toEqual(1);
      expect(sim.numberOfStepsOverLand).toEqual(0);
      expect(sim.precipitationPoints.length).toBeGreaterThan(0);
    });

    it("handles landfall detection", () => {
      const sim = new SimulationModel(options);
      expect(sim.numberOfStepsOverSea).toEqual(0);
      expect(sim.numberOfStepsOverLand).toEqual(0);

      sim.seaSurfaceTempAt = jest.fn().mockImplementation(() => null); // null => land
      sim.tick();
      expect(sim.numberOfStepsOverSea).toEqual(0);
      expect(sim.numberOfStepsOverLand).toEqual(1);

      sim.seaSurfaceTempAt = jest.fn().mockImplementation(() => 28); // temperature value => sea
      for (let i = 0; i < minStepsOverSeaToDetectLandfall; i++) sim.tick();
      expect(sim.numberOfStepsOverSea).toEqual(minStepsOverSeaToDetectLandfall);
      expect(sim.landfalls.length).toEqual(0);

      sim.seaSurfaceTempAt = jest.fn().mockImplementation(() => null); // null => land
      sim.tick();
      expect(sim.numberOfStepsOverSea).toEqual(0); // counter is reset now
      expect(sim.numberOfStepsOverLand).toEqual(1);
      expect(sim.landfalls.length).toEqual(1); // but landfall has been detected
      const landfall = sim.landfalls[0];
      expect(landfall.position).toEqual(sim.hurricane.center);
      expect(landfall.category).toEqual(sim.hurricane.category);
    });
  });

  describe("hurricaneWithinExtendedLandfallArea", () => {
    it("shouldn't modify extendedLandfallAreas property if hurricane is outside all of them", () => {
      const sim = new SimulationModel(options);
      const bounds = Object.values(extendedLandfallBounds);
      expect(sim.extendedLandfallAreas).toEqual(bounds);
      sim.hurricaneWithinExtendedLandfallArea();
      expect(sim.extendedLandfallAreas).toEqual(bounds);
    });

    it("should modify extendedLandfallAreas property if hurricane is inside one of them", () => {
      const sim = new SimulationModel(options);
      const PuertoRicoBounds = extendedLandfallBounds.PuertoRico;
      const bounds = Object.values(extendedLandfallBounds);
      expect(sim.extendedLandfallAreas).toEqual(bounds);
      sim.hurricane.center.lat = PuertoRicoBounds.getSouthWest().lat + 0.01;
      sim.hurricane.center.lng = PuertoRicoBounds.getSouthWest().lng + 0.01;
      sim.hurricaneWithinExtendedLandfallArea();
      expect(sim.extendedLandfallAreas.length).toEqual(Object.values(extendedLandfallBounds).length - 1);
      bounds.splice(bounds.indexOf(PuertoRicoBounds), 1);
      expect(sim.extendedLandfallAreas).toEqual(bounds);
    });
  });

  describe("restart", () => {
    it("restarts hurricane simulation without changing some of the initial conditions", () => {
      const sim = new SimulationModel({
        season: "fall",
        pressureSystems: [
          {
            type: "high",
            center: {lat: 10, lng: 0},
            strength: 13
          }
        ]
      });
      sim.hurricane.reset = jest.fn();
      sim.pressureSystems[0].reset = jest.fn();
      sim.time = 123;
      sim.hurricane.center = {lat: 33, lng: 123};
      sim.hurricane.speed = {u: 123, v: 123};
      sim.hurricaneTrack = [{category: 1, position: {lat: 33, lng: 123}}];
      sim.landfalls = [{category: 1, position: {lat: 33, lng: 123}}];
      sim.numberOfStepsOverSea = 123;
      sim.numberOfStepsOverLand = 321;
      sim.simulationStarted = true;
      sim.extendedLandfallAreas.length = 1;
      sim.season = "winter";
      sim.restart();
      expect(sim.time).toEqual(0);
      expect(sim.hurricaneTrack.length).toEqual(0);
      expect(sim.landfalls.length).toEqual(0);
      expect(sim.numberOfStepsOverSea).toEqual(0);
      expect(sim.numberOfStepsOverLand).toEqual(0);
      expect(sim.extendedLandfallAreas).toEqual(Object.values(extendedLandfallBounds));
      expect(sim.simulationStarted).toEqual(false);
      expect(sim.hurricane.reset).toHaveBeenCalled();
      // These properties shouldn't be reset:
      expect(sim.pressureSystems[0].reset).not.toHaveBeenCalled();
      expect(sim.season).toEqual("winter");
    });
  });

  describe("reset", () => {
    it("triggers restart and resets initial conditions", () => {
      const sim = new SimulationModel({
        season: "fall",
        pressureSystems: [
          {
            type: "high",
            center: {lat: 10, lng: 0},
            strength: 13
          }
        ]
      });
      jest.spyOn(sim, "restart");
      sim.pressureSystems[0].reset = jest.fn();
      sim.season = "winter";
      sim.reset();
      expect(sim.restart).toHaveBeenCalled();
      expect(sim.pressureSystems[0].reset).toHaveBeenCalled();
      expect(sim.season).toEqual("fall");
    });
  });

  describe("start", () => {
    it("starts the simulation", () => {
      const sim = new SimulationModel(options);
      expect(sim.simulationRunning).toEqual(false);
      expect(sim.simulationStarted).toEqual(false);
      sim.start();
      expect(sim.simulationRunning).toEqual(true);
      expect(sim.simulationStarted).toEqual(true);
    });
  });

  describe("stop", () => {
    it("stops the simulation without resetting it", () => {
      const sim = new SimulationModel(options);
      sim.simulationStarted = true;
      sim.simulationRunning = true;
      sim.stop();
      expect(sim.simulationRunning).toEqual(false);
      expect(sim.simulationStarted).toEqual(true);
    });
  });

  describe("ready", () => {
    it("is false until SST data is downloaded and the hurricane is active", () => {
      const sim = new SimulationModel(options);
      expect(sim.ready).toEqual(false);
      sim.seaSurfaceTempData = new PNG();
      expect(sim.ready).toEqual(true);
      sim.hurricane.strength = 0;
      expect(sim.ready).toEqual(false);
    });
  });

  describe("low pressure system and hurricane interaction", () => {
    test("low pressure system removed from the model if it's weaker than hurricane", () => {
      const sim = new SimulationModel({
        pressureSystems: [
          {
            type: "low",
            center: {lat: 20, lng: -20},
            strength: 7
          }
        ]
      });
      sim.hurricane.center.lat = 20;
      sim.hurricane.center.lng = -19.9;
      sim.hurricane.strength = 40;
      expect(sim.pressureSystems.length).toEqual(1);
      sim.tick();
      expect(sim.pressureSystems.length).toEqual(0);
      expect(sim.hurricane.strength).toBeGreaterThan(40); // around ~ 40 + 7
    });

    test("hurricane gets inactive if it's weaker than low pressure system", () => {
      const sim = new SimulationModel({
        pressureSystems: [
          {
            type: "low",
            center: {lat: 20, lng: -20},
            strength: 15
          }
        ]
      });
      sim.hurricane.center.lat = 20;
      sim.hurricane.center.lng = -19.9;
      sim.hurricane.strength = 11;
      expect(sim.hurricane.active).toEqual(true);
      sim.tick();
      expect(sim.hurricane.active).toEqual(false);
      expect(sim.pressureSystems[0].strength).toBeGreaterThan(15); // around ~ 15 + 11
    });
  });
});
