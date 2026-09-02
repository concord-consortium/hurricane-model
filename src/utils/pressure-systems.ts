import { distanceTo, headingTo } from "geolocation-utils";

import { PressureSystemType } from "../models/pressure-system";
import { IPressureSystemState } from "../types/interactive-state";

// Strength (m/s) -> barometric-pressure label (mb): the user-facing unit shown on the map markers.
// High pressure reads 1015..1028 mb (stronger = higher); low reads 1010..997 mb (stronger = lower).
// Single source of truth for this mapping.
export const minStrength = 3;
export const maxStrength = 20;
export const mbLabelRange = 13;

export function strengthToMb(type: PressureSystemType, strength: number): number {
  const norm = (strength - minStrength) / (maxStrength - minStrength);
  return type === "high"
    ? Math.round(1015 + norm * mbLabelRange)
    : Math.round(1010 - norm * mbLabelRange);
}

// 16-point compass label for a heading in degrees (0 = N, clockwise), e.g. "SSW".
const COMPASS = [
  "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
  "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"
] as const;
export type Compass = typeof COMPASS[number];
function toCompass(deg: number): Compass {
  const i = Math.round((((deg % 360) + 360) % 360) / 22.5) % 16;
  return COMPASS[i];
}

const MOVED_THRESHOLD_M = 1;

export interface IPressureSystemReport {
  type: PressureSystemType;
  label: string;
  position: string;
  mb: string;
}

export function pressureSystemReport(systems: IPressureSystemState[]): IPressureSystemReport[] {
  return systems.map((ps, i) => {
    const baselineCenter = ps.initialState?.center;
    let position = "Default";
    if (baselineCenter) {
      const from = { lat: baselineCenter.lat, lon: baselineCenter.lng };
      const to = { lat: ps.center.lat, lon: ps.center.lng };
      if (distanceTo(from, to) > MOVED_THRESHOLD_M) {
        position = `Moved ${toCompass(headingTo(from, to))}`;
      }
    }
    return {
      type: ps.type,
      label: `${ps.type === "high" ? "H" : "L"}${ps.label ?? ""}`,
      position,
      // Non-breaking space so the value and its "mb" unit never split across a wrap.
      mb: `${strengthToMb(ps.type, ps.strength)}\u00A0mb`
    };
  });
}
