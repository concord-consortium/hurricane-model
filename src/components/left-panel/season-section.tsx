import React from "react";

import { SetupSection } from "./setup-section";

import SeasonIcon from "../../assets/left-panel/season.svg";

const hint = "The season determines sea surface temperatures and wind shear across the basin.";

export function SeasonSection() {
  return (
    <SetupSection
      dataTest="season"
      hint={hint}
      Icon={SeasonIcon}
      setupMode="season"
      title="Season"
    >
    </SetupSection>
  );
}
