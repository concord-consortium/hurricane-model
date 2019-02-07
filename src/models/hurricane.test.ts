import { Hurricane, IHurricaneOptions } from "./hurricane";

describe("Hurricane store", () => {
  const options = {
    center: {lat: 0, lng: 0}
  };

  it("can be created without errors", () => {
    const hurricane = new Hurricane(options);
    expect(hurricane).toBeDefined();
  });

  describe("category", () => {
    it("should return category based on the Saffir-Simpson Hurricane Wind Scale", () => {
      const hurricane = new Hurricane(options);
      hurricane.strength = 5; // m/s
      expect(hurricane.category).toEqual(0);
      hurricane.strength = 36; // m/s
      expect(hurricane.category).toEqual(1);
      hurricane.strength = 44; // m/s
      expect(hurricane.category).toEqual(2);
      hurricane.strength = 53; // m/s
      expect(hurricane.category).toEqual(3);
      hurricane.strength = 64; // m/s
      expect(hurricane.category).toEqual(4);
      hurricane.strength = 90; // m/s
      expect(hurricane.category).toEqual(5);
    });
  });

  describe("active", () => {
    it("should depend on hurricane strength", () => {
      const hurricane = new Hurricane(options);
      hurricane.strength = 5; // m/s
      expect(hurricane.active).toEqual(false);
      hurricane.strength = 35; // m/s
      expect(hurricane.active).toEqual(true);
    });
  });

  describe("move", () => {
    it("should change hurricane position using its current speed and wind sped", () => {
      const hurricane = new Hurricane(options);
      const oldPos = Object.assign({}, hurricane.center);
      hurricane.move({ u: 0, v: 0 }, 1);
      expect(hurricane.center).toEqual(oldPos); // no speed

      hurricane.move({ u: 10, v: -10 }, 1);
      expect(hurricane.center.lng).toBeGreaterThan(oldPos.lng);
      expect(hurricane.center.lat).toBeLessThan(oldPos.lat);

      hurricane.move({ u: -30, v: 30 }, 1);
      expect(hurricane.center.lng).toBeLessThan(oldPos.lng);
      expect(hurricane.center.lat).toBeGreaterThan(oldPos.lat);
    });
  });

  describe("setStrengthChangeFromSST", () => {
    it("should set hurricane strengthChange from SST and update category 3 threshold flag", () => {
      const hurricane = new Hurricane(options);
      hurricane.setStrengthChangeFromSST(10);
      expect(hurricane.strengthChange).toBeLessThan(0);
      expect(hurricane.cat3SSTThresholdReached).toEqual(false);
      hurricane.setStrengthChangeFromSST(25);
      expect(hurricane.strengthChange).toBeLessThan(0);
      expect(hurricane.cat3SSTThresholdReached).toEqual(false);
      hurricane.setStrengthChangeFromSST(28);
      expect(hurricane.strengthChange).toBeGreaterThan(0);
      expect(hurricane.cat3SSTThresholdReached).toEqual(false);
      hurricane.setStrengthChangeFromSST(28.25);
      expect(hurricane.strengthChange).toBeGreaterThan(0);
      expect(hurricane.cat3SSTThresholdReached).toEqual(true);
      hurricane.setStrengthChangeFromSST(30);
      expect(hurricane.strengthChange).toBeGreaterThan(0);
      expect(hurricane.cat3SSTThresholdReached).toEqual(true);
    });
  });

  describe("updateStrength", () => {
    it("should set hurricane strength using strengthChange value and respecting cat3SSTThresholdReached", () => {
      const hurricane = new Hurricane(options);
      hurricane.strength = 10;
      hurricane.strengthChange = 5;
      hurricane.cat3SSTThresholdReached = false;
      hurricane.updateStrength();
      expect(hurricane.strength).toEqual(15);

      hurricane.strength = 45;
      hurricane.strengthChange = 20;
      hurricane.cat3SSTThresholdReached = false;
      hurricane.updateStrength();
      // Note that cat3SSTThresholdReached is false! Hurricane can't reach category 3 wind speeds.
      expect(hurricane.strength).toEqual(45);

      hurricane.cat3SSTThresholdReached = true;
      hurricane.updateStrength();
      // Now it can.
      expect(hurricane.strength).toEqual(65);

      hurricane.strength = 80;
      hurricane.strengthChange = -10;
      hurricane.cat3SSTThresholdReached = false;
      hurricane.updateStrength();
      expect(hurricane.strength).toEqual(70);
    });
  });

  describe("reset", () => {
    it("should basic params of the hurricane back to the initial options", () => {
      const params = {
        center: {lat: 10, lng: 10},
        speed: {u: 1, v: 2},
        strength: 45,

      };
      const hurricane = new Hurricane(params);
      hurricane.center.lat = 50;
      hurricane.speed.u = 50;
      hurricane.strength = 123;
      hurricane.strengthChange = 150;

      hurricane.reset();

      expect(hurricane.center).toEqual(params.center);
      expect(hurricane.center).not.toBe(params.center);
      expect(hurricane.speed).toEqual(params.speed);
      expect(hurricane.speed).not.toBe(params.speed);
      expect(hurricane.strength).toEqual(params.strength);
      expect(hurricane.strengthChange).toEqual(0);
    });
  });
});
