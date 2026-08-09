import { clsx } from "clsx";
import { observer } from "mobx-react";
import React from "react";

import { temperatureAnomalyMax, temperatureAnomalyMin } from "../constants";
import { useStores } from "../stores-context";
import { NamedRegion } from "../types";
import { temperatureAnomalyRegions } from "../utils/regions";

import TempDecreaseIcon from "../assets/left-panel/temp-decrease-button.svg";
import TempIncreaseIcon from "../assets/left-panel/temp-increase-button.svg";

import css from "./region-temperature-control.scss";

interface IChangeButtonProps {
  adjustment: number;
  anomaly: number;
  regionKey: NamedRegion;
}
function ChangeButton({ adjustment, anomaly, regionKey }: IChangeButtonProps) {
  const { simulation } = useStores();
  const { label } = temperatureAnomalyRegions[regionKey];

  const changeWord = adjustment < 0 ? "Decrease" : "Increase";
  const disabled = adjustment < 0 ? anomaly <= temperatureAnomalyMin : anomaly >= temperatureAnomalyMax;
  const TempIcon = adjustment < 0 ? TempDecreaseIcon : TempIncreaseIcon;

  return (
    <button
      type="button"
      // Direction class drives the hover/press recolor in CSS (decrease = cool/blue, increase = warm/red).
      className={clsx(css.button, adjustment < 0 ? css.decrease : css.increase)}
      aria-label={`${changeWord} ${label} temperature`}
      disabled={disabled}
      onClick={() => simulation.adjustTemperatureAnomaly(regionKey, adjustment)}
    >
      <TempIcon className={css.icon} />
    </button>
  );
}

interface IProps {
  regionKey: NamedRegion;
}

function statusText(anomaly: number): string {
  if (anomaly === 0) return "Baseline";
  // Non-breaking space so the value and unit never split across a line wrap.
  return `${anomaly > 0 ? "+" : ""}${anomaly} °C`;
}

export const RegionTemperatureControl = observer(function RegionTemperatureControl({ regionKey }: IProps) {
  const { simulation } = useStores();
  const { label } = temperatureAnomalyRegions[regionKey];
  const anomaly = simulation.temperatureAnomalyAt(regionKey);
  const colorClass = anomaly > 0 ? css.warm : anomaly < 0 ? css.cold : undefined;

  return (
    <React.Fragment>
      <div className={css.label}>{label}</div>
      <div className={css.buttonSection}>
        <ChangeButton adjustment={-1} anomaly={anomaly} regionKey={regionKey} />
        <span className={clsx(css.status, colorClass)}>{statusText(anomaly)}</span>
        <ChangeButton adjustment={1} anomaly={anomaly} regionKey={regionKey} />
      </div>
    </React.Fragment>
  );
});
