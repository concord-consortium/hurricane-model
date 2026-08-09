import React from "react";

import { namedRegions } from "../../types";
import { RegionTemperatureControl } from "../region-temperature-control";
import { SetupSection } from "./setup-section";

import ThermometerIcon from "../../assets/left-panel/thermometer.svg";

import css from "./sea-surface-temperatures-section.scss";

const hint = "Adjust sea surface temperature by up to ±3 °C in each region. Changes highlight on the map.";

export function SeaSurfaceTemperaturesSection() {
  return (
    <SetupSection
      dataTest="sea-surface-temperatures"
      hint={hint}
      Icon={ThermometerIcon}
      setupMode="seaSurfaceTemperatures"
      title="Sea Surface Temp Anomalies"
    >
      <div className={css.temperatureControlRows}>
        {namedRegions.map(key => (
          <div className={css.temperatureControlRow} key={key}>
            <RegionTemperatureControl regionKey={key} />
          </div>
        ))}
      </div>
    </SetupSection>
  );
}
