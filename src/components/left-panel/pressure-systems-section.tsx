import React from "react";

import { SetupSection } from "./setup-section";

import PressureSystemIcon from "../../assets/left-panel/pressure-system.svg";

const hint = "Drag the H and L markers on the map to reposition pressure systems. " +
  "Use the vertical slider on each to adjust strength.";

export function PressureSystemsSection() {
  return (
    <SetupSection
      dataTest="pressure-systems"
      hint={hint}
      Icon={PressureSystemIcon}
      setupMode="pressureSystems"
      title="Pressure Systems"
    >
    </SetupSection>
  );
}
