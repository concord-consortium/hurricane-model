import { selectPressureSystems } from "../config";
import { IPressureSystemState } from "../types/interactive-state";
import { pressureSystemReport, strengthRange, strengthToMb } from "./pressure-systems";

describe("strengthToMb", () => {
  it("maps high-pressure strength to 1015..1030 mb", () => {
    expect(strengthToMb("high", strengthRange.high.weak)).toBe(1015);
    expect(strengthToMb("high", strengthRange.high.strong)).toBe(1030);
    expect(strengthToMb("high", 19.5)).toBe(1028);
    expect(strengthToMb("high", 13.6)).toBe(1023);
  });

  it("maps low-pressure strength to 1010..990 mb (stronger = lower)", () => {
    expect(strengthToMb("low", strengthRange.low.weak)).toBe(1010);
    expect(strengthToMb("low", strengthRange.low.strong)).toBe(990);
    expect(strengthToMb("low", 6)).toBe(1008);
    expect(strengthToMb("low", 7)).toBe(1007);
  });

  it("keeps the old mb labels at strengths 18 and 20", () => {
    expect(strengthToMb("high", 20)).toBe(1028);
    expect(strengthToMb("low", 20)).toBe(997);
    expect(strengthToMb("high", 18)).toBe(1026);
    expect(strengthToMb("low", 18)).toBe(999);
  });
});

const defaultSetup = (): IPressureSystemState[] => {
  return selectPressureSystems("atlantic").map(ps => {
    const center = { ...ps.center };
    return { ...ps, center, initialState: { center, strength: ps.strength } }
  });
}

describe("pressureReport", () => {
  it("baselines a system against its own initial state when present", () => {
    const systems = defaultSetup();
    // Current position matches the Atlantic slot default, but the system started somewhere else.
    systems[0].initialState = { center: { lat: systems[0].center.lat - 5, lng: systems[0].center.lng }, strength: 10 };
    // Moved relative to the Atlantic default, but that IS this system's initial position.
    systems[1].center = { lat: systems[1].center.lat + 5, lng: systems[1].center.lng };
    systems[1].initialState = { center: { ...systems[1].center }, strength: systems[1].strength };

    const report = pressureSystemReport(systems);
    expect(report[0].position).toBe("Moved N");
    expect(report[1].position).toBe("Default");
  });

  it("reports every unmoved system as Default with its mb value", () => {
    const report = pressureSystemReport(defaultSetup());
    expect(report.map(r => `${r.label}: ${r.position}, ${r.mb}`)).toEqual([
      "H1: Default, 1023 mb",
      "H2: Default, 1028 mb",
      "L1: Default, 1008 mb",
      "L2: Default, 1007 mb"
    ]);
    expect(report.map(r => r.type)).toEqual(["high", "high", "low", "low"]);
  });

  it("reports a moved system with its compass direction", () => {
    const systems = defaultSetup();
    systems[1].center = { lat: systems[1].center.lat - 2, lng: systems[1].center.lng - 2 };
    expect(pressureSystemReport(systems)[1].position).toBe("Moved SW");
  });

  it("reports a strength change through the mb value", () => {
    const systems = defaultSetup();
    systems[0].strength = strengthRange.high.weak;
    expect(pressureSystemReport(systems)[0].mb).toBe("1015 mb");
  });

  it("renders a bare H or L for unlabeled systems", () => {
    const systems = defaultSetup().map(ps => ({ ...ps, label: undefined }));
    expect(pressureSystemReport(systems).map(r => r.label)).toEqual(["H", "H", "L", "L"]);
  });
});
