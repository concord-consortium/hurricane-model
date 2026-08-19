import React from "react";

import { SetupSection } from "./setup-section";

import ThermometerIcon from "../../assets/left-panel/thermometer.svg";

const hint = "Adjust the sea surface temperature of each labeled region on the map by up to ±3 °C.";

// The per-region adjust controls live on the map (anchored to each region while this section is open);
// the left panel just carries the instruction.
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
