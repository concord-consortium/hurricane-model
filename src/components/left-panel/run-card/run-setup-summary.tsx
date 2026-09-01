import { clsx } from "clsx";
import React from "react";

import { clampCategory } from "../../../config";
import { resolveStartLocation } from "../../../models/simulation";
import { NamedRegion, namedRegions, Season, seasonLabels, StartLocation } from "../../../types";
import { IPressureSystemState } from "../../../types/interactive-state";
import { formatLatLng } from "../../../utils/lat-long";
import { pressureSystemReport } from "../../../utils/pressure-systems";
import { temperatureAnomalyRegions } from "../../../utils/regions";

import HurricaneIcon from "../../../assets/left-panel/hurricane.svg";
import PressureSystemIcon from "../../../assets/left-panel/pressure-system.svg";
import SeasonIcon from "../../../assets/left-panel/season.svg";
import StormLocationIcon from "../../../assets/left-panel/storm-location.svg";
import ThermometerIcon from "../../../assets/left-panel/thermometer.svg";

import categoryCss from "../../hurricane-category.scss";
import css from "./run-setup-summary.scss";

// The subset of a run's setup that a card summarizes.
export interface IRunSetup {
  season: Season;
  startLocation: StartLocation;
  startingCategory?: number;
  pressureSystems: IPressureSystemState[];
  temperatureAnomalies?: Partial<Record<NamedRegion, number>>;
}

function anomalyText(value: number): string {
  return `${value > 0 ? "+" : "−"}${Math.abs(value)} °C`;
}

interface IProps {
  setup: IRunSetup;
}

export function RunSetupSummary({ setup }: IProps) {
  const start = resolveStartLocation(setup.startLocation);
  const category = clampCategory(setup.startingCategory ?? 0);
  const anomalies = namedRegions
    .map(region => ({
      label: temperatureAnomalyRegions[region].shortLabel,
      value: setup.temperatureAnomalies?.[region] ?? 0
    }))
    .filter(a => a.value !== 0);
  const report = pressureSystemReport(setup.startLocation, setup.pressureSystems);

  return (
    <div className={css.runSetupSummary} data-test="run-setup-summary">
      <div className={css.categoryRow} data-test="setup-location">
        <StormLocationIcon aria-hidden={true} className={css.icon} />
        <span>{formatLatLng(start.lat, start.lng)}</span>
      </div>
      <div className={css.categoryRow} data-test="setup-category">
        <HurricaneIcon aria-hidden={true} className={clsx(css.icon, categoryCss["category" + category])} />
        <span>{category === 0 ? "TS" : `Cat ${category}`}</span>
      </div>
      <div className={css.categoryRow} data-test="setup-season">
        <SeasonIcon aria-hidden={true} className={css.icon} />
        <span>{seasonLabels[setup.season] ?? setup.season}</span>
      </div>
      <div className={css.categoryRow} data-test="setup-anomalies">
        <ThermometerIcon aria-hidden={true} className={css.icon} />
        <span className={css.stackedLines}>
          {anomalies.length === 0 && <span>Baseline</span>}
          {anomalies.map(a => (
            <span key={a.label} className={a.value > 0 ? css.warm : css.cool}>
              {a.label} {anomalyText(a.value)}
            </span>
          ))}
        </span>
      </div>
      <div className={css.categoryRow} data-test="setup-pressure-systems">
        <PressureSystemIcon aria-hidden={true} className={css.icon} />
        <span className={css.stackedLines}>
          {report.map((r, i) => (
            <span key={i} className={css.pressureSystem}>
              <span className={r.type === "high" ? css.high : css.low}>{r.label}:</span>
              {" "}
              <span className={css.pressureDetail}>
                <span>{r.position},</span>
                {" "}
                <span>{r.mb}</span>
              </span>
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}
