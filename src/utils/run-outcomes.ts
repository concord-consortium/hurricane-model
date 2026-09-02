import { ISimulationState } from "../types/interactive-state";

export interface ILandfallSummary {
  count: number;
  peakCategory: number;
}

export function peakCategory(sim: ISimulationState): number {
  return Math.max(...[0, ...sim.hurricaneTrack.map(p => p.category)]);
}

export function landfallSummary(sim: ISimulationState): ILandfallSummary {
  const peak = Math.max(...[-1, ...sim.landfalls.map(lf => lf.category)]);

  return { count: sim.landfalls.length, peakCategory: peak };
}

export function intensitySeries(sim: ISimulationState, max = 40): number[] {
  const { hurricaneTrack } = sim;

  if (hurricaneTrack.length <= max) return hurricaneTrack.map(p => p.category);

  const step = hurricaneTrack.length / max;
  const out: number[] = [];
  for (let i = 0; i < max; i++) out.push(hurricaneTrack[Math.floor(i * step)].category);
  return out;
}
