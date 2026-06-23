import { observer } from "mobx-react";
import React from "react";

import { temperatureAnomalyMax, temperatureAnomalyMin } from "../constants";
import { useStores } from "../stores-context";
import { NamedRegion } from "../types";
import { coldColor, temperatureAnomalyRegions, warmColor } from "../utils/regions";

import TempDecreaseIcon from "../assets/left-panel/temp-decrease-button.svg";
import TempDecreaseHoverIcon from "../assets/left-panel/temp-decrease-button-hover.svg";
import TempIncreaseIcon from "../assets/left-panel/temp-increase-button.svg";
import TempIncreaseHoverIcon from "../assets/left-panel/temp-increase-button-hover.svg";

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
  const TempHoverIcon = adjustment < 0 ? TempDecreaseHoverIcon : TempIncreaseHoverIcon;

  return (
    <button
      type="button"
      className={css.button}
      aria-label={`${changeWord} ${label} temperature`}
      disabled={disabled}
      onClick={() => simulation.adjustTemperatureAnomaly(regionKey, adjustment)}
    >
      <TempIcon className={css.baseIcon} />
      <TempHoverIcon className={css.hoverIcon} />
    </button>
  );
}

interface IProps {
  regionKey: NamedRegion;
}

function statusText(anomaly: number): string {
  if (anomaly === 0) return "Baseline";
  return `${anomaly > 0 ? "+" : ""}${anomaly}°C`;
}

export const RegionTemperatureControl = observer(function RegionTemperatureControl({ regionKey }: IProps) {
  const { simulation } = useStores();
  const { label } = temperatureAnomalyRegions[regionKey];
  const anomaly = simulation.temperatureAnomalyAt(regionKey);
  const color = anomaly > 0 ? warmColor : anomaly < 0 ? coldColor : "#434343";

  return (
    <React.Fragment>
      <div className={css.label}>{label}</div>
      <div className={css.buttonSection}>
        <ChangeButton adjustment={-1} anomaly={anomaly} regionKey={regionKey} />
        <span className={css.status} style={{ color }}>{statusText(anomaly)}</span>
        <ChangeButton adjustment={1} anomaly={anomaly} regionKey={regionKey} />
      </div>
    </React.Fragment>
  );
});
