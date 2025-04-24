import { log } from "@concord-consortium/lara-interactive-api";
import { inject, observer } from "mobx-react";
import * as React from "react";
import { BaseComponent, IBaseProps } from "./base";
import { StartLocation, startLocationLabels } from "../types";
import config from "../config";
import { SelectButton } from "./select-button";

interface IProps extends IBaseProps {
  onMenuOpen?: () => void;
  onMenuClose?: () => void;
}
interface IState {}

const startLocations: StartLocation[] = [ "atlantic", "gulf" ];
const menuItems = startLocations.map(startLocation => ({
  label: startLocationLabels[startLocation],
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
    return (
      <SelectButton
        label="Start Location"
        value={sim.startLocation}
        onChange={this.handleStartLocationChange}
        menuItems={menuItems}
        disabled={uiDisabled}
        onMenuOpen={this.props.onMenuOpen}
        onMenuClose={this.props.onMenuClose}
      />
    );
  }

  public handleStartLocationChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const startLocation = event.target.value as StartLocation;
    this.stores.simulation.setStartLocation(startLocation);
    log("StartLocationChanged", { startLocation });
  }
}
