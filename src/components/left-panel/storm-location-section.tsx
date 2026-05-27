import React from "react";

import { SetupSection } from "./setup-section";

import HurricaneIcon from "../../assets/left-panel/hurricane.svg";

const hint = "Drag the storm to a starting position within the highlighted area on the map, "
  + "or type a latitude and longitude below.";

export function StormLocationSection() {
  return (
    <SetupSection
      dataTest="storm-location"
      hint={hint}
      Icon={HurricaneIcon}
      setupMode="stormLocation"
      title="Storm Start Location"
    >
    </SetupSection>
  );
}
