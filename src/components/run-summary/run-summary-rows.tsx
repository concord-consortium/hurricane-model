import React from "react";

import {
  CategoryOverTimeValue, IRunSummaryValueProps, LandfallValue, PeakCategoryValue, PressureSystemsValue,
  SeaSurfaceTempValue, SeasonValue, StartLocationValue, StartingCategoryValue, SvgIcon
} from "./run-summary-values";

import CategoryOverTimeIcon from "../../assets/left-panel/category-over-time.svg";
import HurricaneIcon from "../../assets/left-panel/hurricane.svg";
import LandfallIcon from "../../assets/left-panel/landfall.svg";
import PeakCategoryIcon from "../../assets/left-panel/peak-category.svg";
import PressureSystemIcon from "../../assets/left-panel/pressure-system.svg";
import SeasonIcon from "../../assets/left-panel/season.svg";
import StormLocationIcon from "../../assets/left-panel/storm-location.svg";
import ThermometerIcon from "../../assets/left-panel/thermometer.svg";

import css from "./run-summary.scss";

export interface IRunSummaryRow {
  // Suffix of the row's data-test attribute, e.g. "setup-location".
  key: string;
  label: string;
  Icon: SvgIcon;
  iconClassName?: string;
  Value: React.ComponentType<IRunSummaryValueProps>;
  // The value draws its own category-colored icon, so a host that puts icons beside values skips Icon.
  valueHasIcon?: boolean;
}

export const setupRows: IRunSummaryRow[] = [
  { key: "location", label: "Storm Location", Icon: StormLocationIcon, Value: StartLocationValue },
  {
    key: "category", label: "Storm Category", Icon: HurricaneIcon, iconClassName: css.fillWhite,
    Value: StartingCategoryValue, valueHasIcon: true
  },
  { key: "season", label: "Season", Icon: SeasonIcon, Value: SeasonValue },
  { key: "anomalies", label: "Sea Surface Temp", Icon: ThermometerIcon, Value: SeaSurfaceTempValue },
  { key: "pressure-systems", label: "Pressure Systems", Icon: PressureSystemIcon, Value: PressureSystemsValue }
];

export const resultRows: IRunSummaryRow[] = [
  {
    key: "peak-category", label: "Peak Category", Icon: PeakCategoryIcon, iconClassName: css.fillWhite,
    Value: PeakCategoryValue, valueHasIcon: true
  },
  { key: "landfalls", label: "Landfall", Icon: LandfallIcon, Value: LandfallValue },
  {
    key: "category-over-time", label: "Category Over Time", Icon: CategoryOverTimeIcon,
    iconClassName: css.fillWhite, Value: CategoryOverTimeValue
  }
];
