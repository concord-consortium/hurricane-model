import { PressureSystemType } from "../models/pressure-system";

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
