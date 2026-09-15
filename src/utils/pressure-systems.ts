import { distanceTo, headingTo } from "geolocation-utils";

import { PressureSystemType } from "../models/pressure-system";
import { IPressureSystemState } from "../types/interactive-state";

// Strength (m/s) -> barometric-pressure label (mb): the user-facing unit shown on the map markers.
// High pressure reads 1015..1030 mb (stronger = higher); low reads 1010..990 mb (stronger = lower).
export const strengthRange: Record<PressureSystemType, { min: number, max: number }> = {
  high: { min: 3, max: 22.6 },
  low: { min: 3, max: 29.2 }
};

export const mbRange: Record<PressureSystemType, { min: number, max: number }> = {
  high: { min: 1015, max: 1030 },
  low: { min: 1010, max: 990 }
};

export function strengthToMb(type: PressureSystemType, strength: number): number {
  const strengths = strengthRange[type];
  const mb = mbRange[type];
  const norm = (strength - strengths.min) / (strengths.max - strengths.min);
  return Math.round(mb.min + norm * (mb.max - mb.min));
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
  return systems.map(ps => {
    let position = "Default";
    const baselineCenter = ps.initialState?.center;
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
