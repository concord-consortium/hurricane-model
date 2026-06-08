import React from "react";

import { SetupSection } from "./setup-section";

import PressureSystemIcon from "../../assets/left-panel/pressure-system.svg";

const hint = "Drag the H and L markers on the map to reposition pressure systems. " +
  "Use the vertical slider on each to adjust strength.";
const tip = "High pressure systems (H) steer the storm. Move them to change the projected path.";

export function PressureSystemsSection() {
  return (
    <SetupSection
      dataTest="pressure-systems"
      hint={hint}
      Icon={PressureSystemIcon}
      setupMode="pressureSystems"
      tip={tip}
      title="Pressure Systems"
    >
    </SetupSection>
  );
}
