import { ISimulationState } from "../types/interactive-state";

// Derived "what happened" metrics for a completed run, computed from its stored snapshot. Kept as
// pure functions (no MobX / stores) so the Compare view can read them straight off a saved run.

export interface ILandfallSummary {
  count: number;
  peakCategory: number; // strongest landfall category; -1 when there were no landfalls
}

// Strongest category the storm reached anywhere along its track.
export function peakCategory(sim: ISimulationState): number {
  const track = sim.hurricaneTrack || [];
  let peak = 0;
  for (const p of track) {
    if (p.category > peak) peak = p.category;
  }
  return peak;
}

// Landfall count + the strongest category at any landfall.
export function landfallSummary(sim: ISimulationState): ILandfallSummary {
  const landfalls = sim.landfalls || [];
  let peak = -1;
  for (const lf of landfalls) {
    if (lf.category > peak) peak = lf.category;
  }
  return { count: landfalls.length, peakCategory: peak };
}

// Relative lifetime as the number of track points (proportional to elapsed sim time — the model has
// no real-world hours mapping, so this is a comparable duration, not an absolute clock).
export function durationSteps(sim: ISimulationState): number {
  return (sim.hurricaneTrack || []).length;
}

// Category value at each track point — the series behind the intensity sparkline. Downsampled to at
// most `max` points so a long track still renders as a compact line.
export function intensitySeries(sim: ISimulationState, max = 40): number[] {
  const track = sim.hurricaneTrack || [];
  if (track.length <= max) return track.map(p => p.category);
  const step = track.length / max;
  const out: number[] = [];
  for (let i = 0; i < max; i++) out.push(track[Math.floor(i * step)].category);
  return out;
}

// Stable signature of the pressure-system configuration, for detecting whether two runs differ.
export function pressureSignature(sim: ISimulationState): string {
  return (sim.pressureSystems || [])
    .map(ps => `${ps.type}@${ps.center.lat.toFixed(1)},${ps.center.lng.toFixed(1)}:${Math.round(ps.strength)}`)
    .join(" | ");
}
