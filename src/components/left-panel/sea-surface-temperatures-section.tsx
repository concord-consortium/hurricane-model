import React from "react";

import { namedRegions } from "../../types";
import { RegionTemperatureControl } from "../region-temperature-control";
import { SetupSection } from "./setup-section";

import ThermometerIcon from "../../assets/left-panel/thermometer.svg";

const hint = "Adjust sea surface temperature by up to ±3°C in each region. Changes are highlighted on the map.";

export function SeaSurfaceTemperaturesSection() {
  return (
    <SetupSection
      dataTest="sea-surface-temperatures"
      hint={hint}
      Icon={ThermometerIcon}
      setupMode="seaSurfaceTemperatures"
      title="Sea Surface Temp Anomalies"
    >
      {namedRegions.map(key => (
        <RegionTemperatureControl key={key} regionKey={key} variant="panel" />
      ))}
    </SetupSection>
  );
}
