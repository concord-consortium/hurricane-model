import { selectPressureSystems } from "../config";
import { IPressureSystemState } from "../types/interactive-state";
import { maxStrength, minStrength, pressureReport, strengthToMb } from "./pressure";

describe("strengthToMb", () => {
  it("maps high-pressure strength to 1015..1028 mb", () => {
    expect(strengthToMb("high", minStrength)).toBe(1015);
    expect(strengthToMb("high", maxStrength)).toBe(1028);
    expect(strengthToMb("high", 19.5)).toBe(1028);
    expect(strengthToMb("high", 13.6)).toBe(1023);
  });

  it("maps low-pressure strength to 1010..997 mb (stronger = lower)", () => {
    expect(strengthToMb("low", minStrength)).toBe(1010);
    expect(strengthToMb("low", maxStrength)).toBe(997);
    expect(strengthToMb("low", 6)).toBe(1008);
    expect(strengthToMb("low", 7)).toBe(1007);
  });
});

const defaultSetup = (): IPressureSystemState[] =>
  selectPressureSystems("atlantic").map(ps => ({ ...ps, center: { ...ps.center } }));

describe("pressureReport", () => {
  it("reports every default Atlantic system as Default with its mb value", () => {
    const report = pressureReport("atlantic", defaultSetup());
    expect(report.map(r => `${r.label}: ${r.position}, ${r.mb}`)).toEqual([
      "H1: Default, 1028 mb",
      "H2: Default, 1023 mb",
      "L1: Default, 1008 mb",
      "L2: Default, 1007 mb"
    ]);
    expect(report.map(r => r.type)).toEqual(["high", "high", "low", "low"]);
  });

  it("reports a moved system with its compass direction", () => {
    const systems = defaultSetup();
    systems[1].center = { lat: systems[1].center.lat - 2, lng: systems[1].center.lng - 2 };
    expect(pressureReport("atlantic", systems)[1].position).toBe("Moved SW");
  });

  it("reports a strength change through the mb value", () => {
    const systems = defaultSetup();
    systems[0].strength = minStrength;
    expect(pressureReport("atlantic", systems)[0].mb).toBe("1015 mb");
  });

  it("renders a bare H or L for unlabeled systems", () => {
    const systems = defaultSetup().map(ps => ({ ...ps, label: undefined }));
    expect(pressureReport("atlantic", systems).map(r => r.label)).toEqual(["H", "H", "L", "L"]);
  });

  it("baselines a custom-coordinate start against the Atlantic defaults", () => {
    const report = pressureReport({ lat: 10, lng: -20 }, defaultSetup());
    expect(report.every(r => r.position === "Default")).toBe(true);
  });
});
