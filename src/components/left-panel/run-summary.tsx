import React from "react";

import { hurricaneCategoryInfo } from "../../constants";
import { isStartLocationName, namedRegions, seasonLabels, startLocationNameLabels } from "../../types";
import { IHurricaneInteractiveState } from "../../types/interactive-state";
import { temperatureAnomalyRegions } from "../../utils/regions";

import StormLocationIcon from "../../assets/left-panel/storm-location.svg";
import HurricaneIcon from "../../assets/left-panel/hurricane.svg";
import SeasonIcon from "../../assets/left-panel/season.svg";
import ThermometerIcon from "../../assets/left-panel/thermometer.svg";
import PressureSystemIcon from "../../assets/left-panel/pressure-system.svg";

import css from "./run-summary.scss";

// Matches the panel's own anomaly display (0 -> Baseline, otherwise ±N°C).
function anomalyText(v: number): string {
  if (!v) return "Baseline";
  return `${v > 0 ? "+" : "−"}${Math.abs(v)}°C`;
}

function coords(lat: number, lng: number): string {
  return `${lat.toFixed(1)}°, ${lng.toFixed(1)}°`;
}

interface IProps {
  // A plain serialized run snapshot (not observable) — read directly.
  state: IHurricaneInteractiveState;
}

/**
 * Compact read-out of a saved run's setup selections (start location, category, season, SST
 * anomalies, pressure systems), shown inside the run's card in the Saved Tracks list. First pass:
 * complete but roomy; spacing gets tightened later.
 */
export function RunSummary({ state }: IProps) {
  const sim = state.simulation;
  const category = sim.hurricane.startingCategory != null
    ? hurricaneCategoryInfo[sim.hurricane.startingCategory]?.name ?? "—"
    : "—";
  const location = isStartLocationName(sim.startLocation)
    ? startLocationNameLabels[sim.startLocation]
    : coords(sim.startLocation.lat, sim.startLocation.lng);
  const season = seasonLabels[sim.season] ?? sim.season;

  return (
    <div className={css.runSummary}>
      <div className={css.row}><StormLocationIcon className={css.icon} /><span>{location}</span></div>
      <div className={css.row}><HurricaneIcon className={css.icon} /><span>{category}</span></div>
      <div className={css.row}><SeasonIcon className={css.icon} /><span>{season}</span></div>

      <div className={css.groupRow}>
        <ThermometerIcon className={css.icon} />
        <div className={css.groupValues}>
          {namedRegions.map(r => (
            <div key={r} className={css.subValue}>
              <span className={css.subLabel}>{temperatureAnomalyRegions[r].label}:</span>{" "}
              {anomalyText(sim.temperatureAnomalies?.[r] ?? 0)}
            </div>
          ))}
        </div>
      </div>

      <div className={css.groupRow}>
        <PressureSystemIcon className={css.icon} />
        <div className={css.groupValues}>
          {sim.pressureSystems.length === 0 && <div className={css.subValue}>None</div>}
          {sim.pressureSystems.map((ps, i) => (
            <div key={i} className={css.subValue}>
              <span className={css.subLabel}>{ps.type === "high" ? "High" : "Low"}:</span>{" "}
              {coords(ps.center.lat, ps.center.lng)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
