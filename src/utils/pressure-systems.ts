import { distanceTo, headingTo } from "geolocation-utils";

import { PressureSystemType } from "../models/pressure-system";
import { IPressureSystemState } from "../types/interactive-state";

// Strength (m/s) -> barometric-pressure label (mb): the user-facing unit shown on the map markers.
// High pressure reads 1015..1030 mb (stronger = higher); low reads 1010..990 mb (stronger = lower).
// Previously, strengths were 3..20 and mb were 1015..1028 for high and 1010..997 for low systems.
// The strength maxima are now 22.6/29.2 to keep conversions consistent with those old ranges.
interface IPressureRange {
  weak: number;
  strong: number;
}

export const strengthRange: Record<PressureSystemType, IPressureRange> = {
  high: { weak: 3, strong: 22.6 },
  low: { weak: 3, strong: 29.2 }
};

export const mbRange: Record<PressureSystemType, IPressureRange> = {
  high: { weak: 1015, strong: 1030 },
  low: { weak: 1010, strong: 990 }
};

export function strengthToMb(type: PressureSystemType, strength: number): number {
  const strengthBounds = strengthRange[type];
  const mbBounds = mbRange[type];
  const norm = (strength - strengthBounds.weak) / (strengthBounds.strong - strengthBounds.weak);
  return Math.round(mbBounds.weak + norm * (mbBounds.strong - mbBounds.weak));
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

export function pressureLabel(type: PressureSystemType, strength: number, includeSpace = false) {
  // Non-breaking space so the value and its "mb" unit never split across a wrap.
  const space = includeSpace ? `\u00A0` : "";
  return `${strengthToMb(type, strength)}${space}mb`;
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
      mb: pressureLabel(ps.type, ps.strength, true)
    };
  });
}

// Low-pressure sliders read as pressure, not strength: up = higher mb = weaker system.
// Self-inverse, so one call serves both model -> slider and slider -> model.
export const invertLowStrength = (value: number) => strengthRange.low.strong + strengthRange.low.weak - value;
