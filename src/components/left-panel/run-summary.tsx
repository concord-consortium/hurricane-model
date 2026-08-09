import { clsx } from "clsx";
import React from "react";

import { hurricaneCategoryInfo } from "../../constants";
import { resolveStartLocation } from "../../models/simulation";
import { NamedRegion, namedRegions, Season, seasonLabels, StartLocation } from "../../types";
import { IPressureSystemState } from "../../types/interactive-state";
import { temperatureAnomalyRegions } from "../../utils/regions";

import StormLocationIcon from "../../assets/left-panel/storm-location.svg";
import HurricaneIcon from "../../assets/left-panel/hurricane.svg";
import SeasonIcon from "../../assets/left-panel/season.svg";
import ThermometerIcon from "../../assets/left-panel/thermometer.svg";
import PressureSystemIcon from "../../assets/left-panel/pressure-system.svg";

import categoryCss from "../hurricane-category.scss";
import css from "./run-summary.scss";

// The subset of a run's setup that a card summarizes. Satisfied by a captured run's
// ISimulationState and by a live snapshot of the current setup (for the editable card).
export interface IRunSetupSim {
  season: Season;
  startLocation: StartLocation;
  hurricane: { startingCategory?: number };
  pressureSystems: IPressureSystemState[];
  temperatureAnomalies?: Partial<Record<NamedRegion, number>>;
}

// Run labels are letters A, B, C… (0-based index -> letter).
export function runLetter(index0: number): string {
  return String.fromCharCode(65 + index0);
}

// Saffir–Simpson colors indexed by category (TS..Cat 5), matching common.scss $cat0..$cat5.
export const CATEGORY_COLORS = ["#f2f2f2", "#ffffcc", "#ffe775", "#ffc140", "#ff8f20", "#ff6060"];

// Chip label + color + full name for any category index (TS..Cat 5). Shared by cards and Compare.
export function categoryChip(category: number | undefined) {
  const idx = category != null ? Math.max(0, Math.min(5, Math.round(category))) : 0;
  return {
    label: idx === 0 ? "TS" : `Cat ${idx}`,
    color: CATEGORY_COLORS[idx],
    name: hurricaneCategoryInfo[idx]?.name,
    index: idx
  };
}

// Badge label + color for a run's starting category (shown in the card header).
export function runCategory(sim: IRunSetupSim) {
  const c = sim.hurricane.startingCategory;
  const idx = c != null ? Math.max(0, Math.min(5, c)) : 0;
  return {
    label: idx === 0 ? "TS" : `Cat ${idx}`,
    color: CATEGORY_COLORS[idx],
    name: hurricaneCategoryInfo[idx]?.name
  };
}

function anomalyText(v: number): string {
  return `${v > 0 ? "+" : "−"}${Math.abs(v)} °C`;
}
function coords(lat: number, lng: number): string {
  return `${lat.toFixed(1)}°, ${lng.toFixed(1)}°`;
}

interface IProps {
  sim: IRunSetupSim;
}

/**
 * Compact read-out of a run's setup for its card: start location, season, adjusted SST anomalies
 * (chips), and pressure systems (H/L chips). Category is shown in the card header.
 */
export function RunSummary({ sim }: IProps) {
  // Always show the actual lat/lon of the start position (even for a preset like "Atlantic").
  const start = resolveStartLocation(sim.startLocation);
  const location = coords(start.lat, start.lng);
  const cat = categoryChip(sim.hurricane.startingCategory);
  const season = seasonLabels[sim.season] ?? sim.season;
  const anomalies = namedRegions
    .map(r => ({ label: temperatureAnomalyRegions[r].label, v: sim.temperatureAnomalies?.[r] ?? 0 }))
    .filter(a => a.v !== 0);
  const pressures = sim.pressureSystems.map(ps => (ps.type === "high" ? "H" : "L"));

  return (
    <div className={css.runSummary}>
      <div className={css.setupHeading}>Setup</div>
      <div className={css.row}><StormLocationIcon className={css.icon} /><span>{location}</span></div>
      <div className={css.row}>
        <HurricaneIcon className={clsx(css.icon, categoryCss["category" + cat.index])} />
        <span className={css.catText}>{cat.label}</span>
      </div>
      <div className={css.row}><SeasonIcon className={css.icon} /><span>{season}</span></div>
      <div className={css.row}>
        <ThermometerIcon className={css.icon} />
        <span className={css.chips}>
          {anomalies.length === 0 && <span className={css.chip}>Baseline</span>}
          {anomalies.map(a => (
            <span key={a.label} className={clsx(css.chip, a.v > 0 ? css.warm : css.cool)}>
              {a.label} {anomalyText(a.v)}
            </span>
          ))}
        </span>
      </div>
      <div className={css.row}>
        <PressureSystemIcon className={css.icon} />
        <span className={css.chips}>
          {pressures.length === 0 && <span className={css.chip}>None</span>}
          {pressures.map((p, i) => (
            <span key={i} className={clsx(css.chip, p === "H" ? css.high : css.low)}>{p}</span>
          ))}
        </span>
      </div>
    </div>
  );
}
