import { clsx } from "clsx";
import React from "react";

import { clampCategory } from "../../../config";
import { categoryLabel } from "../../../utils/hurricane-categories";
import { resolveStartLocation } from "../../../models/simulation";
import { namedRegions, seasonLabels } from "../../../types";
import { IRunSetup } from "../../../types/interactive-state";
import { formatLatLng } from "../../../utils/lat-long";
import { pressureSystemReport } from "../../../utils/pressure-systems";
import { temperatureAnomalyRegions } from "../../../utils/regions";

import HurricaneIcon from "../../../assets/left-panel/hurricane.svg";
import PressureSystemIcon from "../../../assets/left-panel/pressure-system.svg";
import SeasonIcon from "../../../assets/left-panel/season.svg";
import StormLocationIcon from "../../../assets/left-panel/storm-location.svg";
import ThermometerIcon from "../../../assets/left-panel/thermometer.svg";

import categoryCss from "../../hurricane-category.scss";
import cardCss from "./run-card.scss";
import css from "./run-setup-summary.scss";

function anomalyText(value: number): string {
  return `${value > 0 ? "+" : "−"}${Math.abs(value)}\u00A0°C`;
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
  const report = pressureSystemReport(setup.pressureSystemsSetup);

  const rowClasses = clsx(cardCss.categoryRow, css.categoryRow);

  return (
    <div className={clsx(cardCss.summaryColumn, css.runSetupSummary)} data-test="run-setup-summary">
      <div className={rowClasses} data-test="setup-location">
        <StormLocationIcon aria-hidden={true} className={cardCss.icon} />
        <span>{formatLatLng(start.lat, start.lng)}</span>
      </div>
      <div className={rowClasses} data-test="setup-category">
        <HurricaneIcon aria-hidden={true} className={clsx(cardCss.icon, categoryCss["category" + category])} />
        <span>{categoryLabel(category)}</span>
      </div>
      <div className={rowClasses} data-test="setup-season">
        <SeasonIcon aria-hidden={true} className={cardCss.icon} />
        <span>{seasonLabels[setup.season] ?? setup.season}</span>
      </div>
      <div className={rowClasses} data-test="setup-anomalies">
        <ThermometerIcon aria-hidden={true} className={cardCss.icon} />
        <span className={css.stackedLines}>
          {anomalies.length === 0 && <span>Baseline</span>}
          {anomalies.map(a => (
            <span key={a.label} className={a.value > 0 ? css.warm : css.cool}>
              {a.label} {anomalyText(a.value)}
            </span>
          ))}
        </span>
      </div>
      <div className={rowClasses} data-test="setup-pressure-systems">
        <PressureSystemIcon aria-hidden={true} className={cardCss.icon} />
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
