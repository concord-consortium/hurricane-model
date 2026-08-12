import { distanceTo, headingTo } from "geolocation-utils";

import { selectPressureSystems } from "../config";
import { PressureSystemType } from "../models/pressure-system";
import { isStartLocationName, StartLocation } from "../types";
import { IPressureSystemState } from "../types/interactive-state";

// Strength (m/s) -> barometric-pressure label (mb): the user-facing unit shown on the map markers.
// High pressure reads 1015..1028 mb (stronger = higher); low reads 1010..997 mb (stronger = lower).
// Single source of truth for this mapping — pressure-system-icon.tsx re-exports these.
export const minStrength = 3;
export const maxStrength = 20;
export const mbLabelRange = 13;

export function strengthToMb(type: PressureSystemType, strength: number): number {
  const norm = (strength - minStrength) / (maxStrength - minStrength);
  return type === "high"
    ? Math.round(1015 + norm * mbLabelRange)
    : Math.round(1010 - norm * mbLabelRange);
}

// Numbers each system within its type (H1, H2, L1, L2…). Used by BOTH the card chips and the map
// markers so the labels always match. Accepts anything carrying a `type` (models or serialized state).
export function perTypeNumbers(systems: { type: PressureSystemType }[]): number[] {
  const counts: Record<PressureSystemType, number> = { high: 0, low: 0 };
  return systems.map(s => (counts[s.type] += 1));
}

// 16-point compass label for a heading in degrees (0 = N, clockwise), e.g. "SSW". Used in the
// run-card readout ("moved SSW").
const COMPASS = [
  "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
  "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"
] as const;
export type Compass = typeof COMPASS[number];
function toCompass(deg: number): Compass {
  const i = Math.round((((deg % 360) + 360) % 360) / 22.5) % 16;
  return COMPASS[i];
}

// Report even the tiniest drag: anything past the default position counts as "moved". An untouched
// system sits exactly at its default (distance 0), so this epsilon only absorbs floating-point noise.
const MOVED_THRESHOLD_M = 1; // 1 m

export interface IPressureDelta {
  type: PressureSystemType;
  mb: number;          // current pressure label
  defaultMb: number;   // default (unmoved) label for this slot
  strengthChanged: boolean;
  stronger: boolean;   // strength increased vs default (drives the tooltip wording)
  moved: boolean;
  direction: Compass | null;
}

// Compares each pressure system in a run's setup to its per-start-location default (matched by slot
// order) and reports what the learner changed: whether it moved (+ which way) and its strength (mb).
// NOTE: defaults reset only for named start locations (atlantic/gulf); a custom-coordinate start keeps
// the prior markers, so those are baselined against the atlantic defaults — a known approximation.
export function pressureDeltas(
  startLocation: StartLocation,
  systems: IPressureSystemState[]
): IPressureDelta[] {
  const defaults = selectPressureSystems(isStartLocationName(startLocation) ? startLocation : "atlantic");
  return systems.map((ps, i) => {
    const def = defaults[i];
    const mb = strengthToMb(ps.type, ps.strength);
    const defaultMb = def ? strengthToMb(def.type, def.strength) : mb;
    let moved = false;
    let direction: Compass | null = null;
    if (def) {
      const from = { lat: def.center.lat, lon: def.center.lng };
      const to = { lat: ps.center.lat, lon: ps.center.lng };
      if (distanceTo(from, to) > MOVED_THRESHOLD_M) {
        moved = true;
        direction = toCompass(headingTo(from, to));
      }
    }
    return {
      type: ps.type,
      mb,
      defaultMb,
      strengthChanged: mb !== defaultMb,
      stronger: def ? ps.strength > def.strength : false,
      moved,
      direction
    };
  });
}

export interface IPressureReport {
  type: PressureSystemType;
  label: string;   // e.g. "H1" (colored per type on the card)
  detail: string;  // e.g. "moved SSW, 1000 mb" — only what actually changed
}

// Run-card readout for the pressure systems: one entry per system the learner changed (moved and/or
// re-strengthened). `detail` lists ONLY what changed — "moved <dir>" and/or "<mb> mb" (mb appears only
// when strength differs from default). An empty array means nothing changed — the card shows "Default".
export function pressureReport(startLocation: StartLocation, systems: IPressureSystemState[]): IPressureReport[] {
  const deltas = pressureDeltas(startLocation, systems);
  const nums = perTypeNumbers(deltas);
  const out: IPressureReport[] = [];
  deltas.forEach((d, i) => {
    if (!d.moved && !d.strengthChanged) return;
    const parts: string[] = [];
    // Position: "moved <dir>" if dragged, otherwise "default" (unchanged) — so a strength-only change
    // reads "H1: default, 1000 mb".
    parts.push(d.moved && d.direction ? `moved ${d.direction}` : "default");
    if (d.strengthChanged) parts.push(`${d.mb} mb`);
    out.push({ type: d.type, label: `${d.type === "high" ? "H" : "L"}${nums[i]}`, detail: parts.join(", ") });
  });
  return out;
}
