import { IPressureSystemOptions, PressureSystem } from "./pressure-system";

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
});
