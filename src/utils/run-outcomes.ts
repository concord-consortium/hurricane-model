import { IRunResult } from "../types/interactive-state";

export interface ILandfallSummary {
  count: number;
  peakCategory: number;
}

export function peakCategory(result: IRunResult): number {
  return Math.max(...[0, ...result.hurricaneTrack.map(p => p.category)]);
}

export function landfallSummary(result: IRunResult): ILandfallSummary {
  const peak = Math.max(...[-1, ...result.landfalls.map(lf => lf.category)]);

  return { count: result.landfalls.length, peakCategory: peak };
}

export function intensitySeries(result: IRunResult, max = 40): number[] {
  const { hurricaneTrack } = result;

  if (max <= 0) return [];
  if (hurricaneTrack.length <= max) return hurricaneTrack.map(p => p.category);
  if (max === 1) return [hurricaneTrack[hurricaneTrack.length - 1].category];

  const step = (hurricaneTrack.length - 1) / (max - 1);
  const out: number[] = [];
  for (let i = 0; i < max; i++) out.push(hurricaneTrack[Math.round(i * step)].category);
  return out;
}
