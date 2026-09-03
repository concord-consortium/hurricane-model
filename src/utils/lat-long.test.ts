import { formatLatLng, getDirectionLetter } from "./lat-long";

describe("getDirectionLetter", () => {
  it("returns hemisphere letters", () => {
    expect(getDirectionLetter(10, "lat")).toBe("N");
    expect(getDirectionLetter(-10, "lat")).toBe("S");
    expect(getDirectionLetter(10, "lng")).toBe("E");
    expect(getDirectionLetter(-10, "lng")).toBe("W");
  });
});

describe("formatLatLng", () => {
  it("formats with two decimals and hemisphere letters", () => {
    expect(formatLatLng(10.5, -20)).toBe("10.50°N, 20.00°W");
    expect(formatLatLng(-3.456, 12.345)).toBe("3.46°S, 12.35°E");
  });
});
