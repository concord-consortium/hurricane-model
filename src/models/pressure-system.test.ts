import { IPressureSystemOptions, PressureSystem } from "./pressure-system";
import config from "../config";

describe("PressureSystem store", () => {
  const defOptions: IPressureSystemOptions = {
    center: {lat: 15, lng: -40},
    type: "high"
  };

  it("can be created without errors", () => {
    const pressureSystem = new PressureSystem(defOptions);
    expect(pressureSystem).toBeDefined();
  });

  it("can be serialized", () => {
    const options: IPressureSystemOptions = {
      center: {lat: 12, lng: -13},
      type: "high",
      strength: 5.5
    };
    const pressureSystem = new PressureSystem(options);
    expect(pressureSystem.serialize()).toEqual(options);
  });

  describe("reset", () => {
    it("should basic params of the pressure system back to the initial options", () => {
      const options: IPressureSystemOptions = {
        center: {lat: 10, lng: 10},
        strength: 45,
        type: "low"
      };
      const pressureSystem = new PressureSystem(options);
      pressureSystem.center.lat = 50;
      pressureSystem.strength = 123;
      pressureSystem.type = "high";

      pressureSystem.reset();

      expect(pressureSystem.center).toEqual(options.center);
      expect(pressureSystem.center).not.toBe(options.center);
      expect(pressureSystem.strength).toEqual(options.strength);
      expect(pressureSystem.type).toEqual(options.type);
    });
  });

  describe("setCenter", () => {
    it("should ensure that a new center is not too close to other pressure systems", () => {
      const oldMinDist = config.minPressureSystemDistance;
      config.minPressureSystemDistance = 800000;
      const ps1 = new PressureSystem({ center: { lat: 20, lng: 20 } });
      const otherPs = [
        new PressureSystem({ center: { lat: 20, lng: 30 } }),
        new PressureSystem({ center: { lat: 20, lng: 40 } })
      ];
      ps1.setCenter({ lat: 20, lng: 25 }, otherPs);
      expect(ps1.center.lng).toBeCloseTo(22.32);
      ps1.setCenter({ lat: 20, lng: 35 }, otherPs);
      expect(ps1.center.lng).toBeCloseTo(47.69);
      config.minPressureSystemDistance = oldMinDist;
    });
  });
});
