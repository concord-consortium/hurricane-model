import { log } from "@concord-consortium/lara-interactive-api";
import { inject, observer } from "mobx-react";
import * as React from "react";
import { BaseComponent, IBaseProps } from "./base";
import { StartLocationNames, startLocationNameLabels } from "../types";
import config from "../config";
import { SelectButton } from "./select-button";

interface IProps extends IBaseProps {
  onMenuOpen?: () => void;
  onMenuClose?: () => void;
}
interface IState {}

const startLocations: StartLocationNames[] = [ "atlantic", "gulf" ];
const menuItems = startLocations.map(startLocation => ({
  label: startLocationNameLabels[startLocation],
  testId: `start-location-item-${startLocation}`,
  value: startLocation
}));

@inject("stores")
@observer
export class StartLocationButton extends BaseComponent<IProps, IState> {
  public render() {
    const { onMenuOpen, onMenuClose } = this.props;
    const sim = this.stores.simulation;
    // If set to lock the UI while the simulation is running, lock UI once the sim is started until it is reset
    const uiDisabled = config.lockSimulationWhileRunning && sim.simulationStarted;
    const currentValue = typeof sim.startLocation === "string" ? sim.startLocation : "atlantic";

    return (
      <SelectButton
        label="Start Location"
        value={currentValue}
        onChange={this.handleStartLocationChange}
        menuItems={menuItems}
        disabled={uiDisabled}
        onMenuOpen={this.props.onMenuOpen}
        onMenuClose={this.props.onMenuClose}
      />
    );
  }

  public handleStartLocationChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const startLocation = event.target.value as StartLocationNames;
    this.stores.simulation.setStartLocation(startLocation);
    log("StartLocationChanged", { startLocation });
  }
}
