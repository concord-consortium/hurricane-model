import React from "react";

import { SetupSection } from "./setup-section";

import ThermometerIcon from "../../assets/left-panel/thermometer.svg";

const hint = "Adjust sea surface temperature of each labeled region on the map by up to ±3°C.";

export function SeaSurfaceTemperaturesSection() {
  return (
    <SetupSection
      dataTest="sea-surface-temperatures"
      hint={hint}
      Icon={ThermometerIcon}
      setupMode="seaSurfaceTemperatures"
      title="Sea Surface Temp Anomalies"
    />
  );
}
