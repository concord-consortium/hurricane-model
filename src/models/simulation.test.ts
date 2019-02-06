import { SimulationModel, ISimulationOptions, windData, sstImages } from "./simulation";
import config from "../config";
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
    global.fetch.resetMocks();
    // SST Image data.
    global.fetch.mockResponse("123");
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
      expect(p.u).toBeGreaterThan(4);
      expect(p.u).toBeLessThan(5);
      expect(p.v).toBeLessThan(-12);
      expect(p.v).toBeGreaterThan(-13);
      // Vector pointing up and slightly inwards.
      p = sim.windAt({lat: 10, lng: 10});
      expect(p.u).toBeLessThan(-4);
      expect(p.u).toBeGreaterThan(-5);
      expect(p.v).toBeGreaterThan(12);
      expect(p.v).toBeLessThan(13);
    });

    describe("windIncHurricane", () => {
      it("includes hurricane effect", () => {
        const sim = new SimulationModel(options);
        sim.hurricane.center = {lat: 10, lng: 0};
        // Make it super strong so it affects two wind points that we have.
        sim.hurricane.strength = 102;
        expect(sim.windIncHurricane.length).toEqual(2);
        expect(sim.windIncHurricane).not.toEqual(fallWind);
        // Vector pointing down and slightly inwards.
        let p = sim.windIncHurricane[0];
        expect(p.u).toBeGreaterThan(29);
        expect(p.u).toBeLessThan(30);
        expect(p.v).toBeLessThan(-84);
        expect(p.v).toBeGreaterThan(-85);
        // Vector pointing up and slightly inwards.
        p = sim.windIncHurricane[1];
        expect(p.u).toBeLessThan(-32);
        expect(p.u).toBeGreaterThan(-33);
        expect(p.v).toBeGreaterThan(83);
        expect(p.v).toBeLessThan(84);
      });
    });
  });

  describe("sea surface temperature data", () => {
    it("downloads sea surface temperature data on init or change of the season", () => {
      const sim = new SimulationModel(options);
      expect(sim.seaSurfaceTempImgUrl).toEqual("fall.png");
      expect(sim.seaSurfaceTempData).toEqual(null); // no time to parse it
      expect(global.fetch.mock.calls.length).toEqual(1);
      expect(global.fetch.mock.calls[0][0]).toEqual(sim.seaSurfaceTempImgUrl);

      sim.season = "summer";
      expect(sim.seaSurfaceTempImgUrl).toEqual("summer.png");
      expect(sim.seaSurfaceTempData).toEqual(null); // no time to parse it
      expect(global.fetch.mock.calls.length).toEqual(2);
      expect(global.fetch.mock.calls[1][0]).toEqual(sim.seaSurfaceTempImgUrl);
      // No valid data parsed yet, so expect null.
      expect(sim.seaSurfaceTempAt(config.initialHurricanePosition)).toEqual(null);
    });

    it("reports correct SST value", (done) => {
      global.fetch.mockResponseOnce(fs.readFileSync("./sea-surface-temp-img/sep.png"));
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
        global.fetch.mockResponseOnce(fs.readFileSync("./sea-surface-temp-img/jun.png"));
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

  describe("tick", () => {
    it("increases simulation time, moves hurricane and saves it track", () => {
      const sim = new SimulationModel(options);
      sim.hurricane.move = jest.fn();
      sim.hurricane.setStrengthChangeFromSST = jest.fn();
      sim.hurricane.updateStrength = jest.fn();
      sim.seaSurfaceTempAt = jest.fn();
      expect(sim.time).toEqual(0);
      expect(sim.hurricaneTrack.length).toEqual(0);
      const oldPos = sim.hurricane.center;
      sim.tick();
      expect(sim.time).toBeGreaterThan(0);
      expect(sim.hurricaneTrack[0].position).toEqual(oldPos);
      expect(sim.hurricane.move).toHaveBeenCalled();
      expect(sim.seaSurfaceTempAt).toHaveBeenCalled();
      expect(sim.hurricane.setStrengthChangeFromSST).toHaveBeenCalled();
      expect(sim.hurricane.updateStrength).toHaveBeenCalled();
      expect(sim.hurricaneTrack.length).toBeGreaterThan(0);
      expect(sim.hurricaneTrack[0].category).toEqual(sim.hurricane.category);
      expect(sim.hurricaneTrack[0].position).toEqual(oldPos);
      expect(sim.hurricaneTrack[0].position).not.toBe(oldPos); // we expect a copy
    });
  });

  describe("reset", () => {
    it("restores initial settings", () => {
      const sim = new SimulationModel(options);
      sim.hurricane.reset = jest.fn();
      sim.time = 123;
      sim.hurricane.center = {lat: 33, lng: 123};
      sim.hurricane.speed = {u: 123, v: 123};
      sim.hurricaneTrack = [{category: 1, position: {lat: 33, lng: 123}}];
      sim.reset();
      expect(sim.time).toEqual(0);
      expect(sim.hurricane.reset).toHaveBeenCalled();
      expect(sim.hurricaneTrack.length).toEqual(0);
    });
  });

  describe("start", () => {
    it("starts the simulation", () => {
      const sim = new SimulationModel(options);
      expect(sim.simulationStarted).toEqual(false);
      sim.start();
      expect(sim.simulationStarted).toEqual(true);
    });
  });

  describe("stop", () => {
    it("stops the simulation", () => {
      const sim = new SimulationModel(options);
      sim.simulationStarted = true;
      sim.stop();
      expect(sim.simulationStarted).toEqual(false);
    });
  });
});
