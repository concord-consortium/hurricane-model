import React from "react";

import { SetupSection } from "./setup-section";

import ThermometerIcon from "../../assets/left-panel/thermometer.svg";

const hint = "Adjust sea surface temperature by up to ±5°F in each region. Changes are highlighted on the map.";

export function SeaSurfaceTemperaturesSection() {
  return (
    <SetupSection
      dataTest="sea-surface-temperatures"
      hint={hint}
      Icon={ThermometerIcon}
      setupMode="seaSurfaceTemperatures"
      title="Sea Surface Temp Anomalies"
    >
    </SetupSection>
  );
}
