import { IRunResult } from "../types/interactive-state";

export interface ILandfallSummary {
  count: number;
  peakCategory: number;
}

export function peakCategory(result: IRunResult | null): number | null {
  if (!result) return null;

  return Math.max(...[0, ...result.hurricaneTrack.map(p => p.category)]);
}

export function landfallSummary(result: IRunResult | null): ILandfallSummary | null {
  if (!result) return null;

  const peak = Math.max(...[-1, ...result.landfalls.map(lf => lf.category)]);

  return { count: result.landfalls.length, peakCategory: peak };
}

export function intensitySeries(result: IRunResult | null, max = 40): number[] {
  if (!result) return [];

  const { hurricaneTrack } = result;

  if (max <= 0) return [];
  if (hurricaneTrack.length <= max) return hurricaneTrack.map(p => p.category);
  if (max === 1) return [hurricaneTrack[hurricaneTrack.length - 1].category];

  const step = (hurricaneTrack.length - 1) / (max - 1);
  const out: number[] = [];
  for (let i = 0; i < max; i++) out.push(hurricaneTrack[Math.round(i * step)].category);
  return out;
}
