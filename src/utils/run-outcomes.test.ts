import { defaultSimulationState } from "../models/simulation-serialization";
import { ISimulationState } from "../types/interactive-state";
import { intensitySeries, landfallSummary, peakCategory } from "./run-outcomes";

const trackPoint = (category: number, lat = 20, lng = -40) => ({ position: { lat, lng }, category });

const simWithTrack = (categories: number[]): ISimulationState => {
  const sim = defaultSimulationState();
  sim.hurricaneTrack = categories.map(c => trackPoint(c));
  return sim;
};

describe("peakCategory", () => {
  it("returns the strongest category along the track", () => {
    expect(peakCategory(simWithTrack([0, 1, 3, 2]))).toBe(3);
  });

  it("returns 0 for an empty track", () => {
    expect(peakCategory(simWithTrack([]))).toBe(0);
  });
});

describe("landfallSummary", () => {
  it("counts landfalls and reports the strongest one", () => {
    const sim = defaultSimulationState();
    sim.landfalls = [
      { position: { lat: 20, lng: -40 }, category: 1 },
      { position: { lat: 22, lng: -42 }, category: 4 }
    ];
    expect(landfallSummary(sim)).toEqual({ count: 2, peakCategory: 4 });
  });

  it("reports no landfalls as count 0 and peak -1", () => {
    expect(landfallSummary(defaultSimulationState())).toEqual({ count: 0, peakCategory: -1 });
  });
});

describe("intensitySeries", () => {
  it("returns the category at each track point", () => {
    expect(intensitySeries(simWithTrack([0, 1, 2]))).toEqual([0, 1, 2]);
  });

  it("downsamples long tracks to at most max points", () => {
    const series = intensitySeries(simWithTrack(Array.from({ length: 50 }, (_, i) => i % 6)), 40);
    expect(series.length).toBe(40);
  });
});
