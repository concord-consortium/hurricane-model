import { maxStrength, minStrength, strengthToMb } from "./pressure";

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
