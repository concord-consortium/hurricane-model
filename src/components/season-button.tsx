import { log } from "@concord-consortium/lara-interactive-api";
import { inject, observer } from "mobx-react";
import * as React from "react";
import { BaseComponent, IBaseProps } from "./base";
import { Season, seasonLabels } from "../types";
import config from "../config";
import { SelectButton } from "./select-button";

interface IProps extends IBaseProps {
  onMenuOpen?: () => void;
  onMenuClose?: () => void;
}
interface IState {}

const seasons: Season[] = [ "fall", "winter", "spring", "summer" ];
const menuItems = seasons.map(season => ({
  label: seasonLabels[season],
  testId: `season-item-${season}`,
  value: season
}));

@inject("stores")
@observer
export class SeasonButton extends BaseComponent<IProps, IState> {
  public render() {
    const { onMenuOpen, onMenuClose } = this.props;
    const sim = this.stores.simulation;
    // If set to lock the UI while the simulation is running, lock UI once the sim is started until it is reset
    const uiDisabled = config.lockSimulationWhileRunning && sim.simulationStarted;
    return (
      <SelectButton
        label="Season"
        value={sim.season}
        onChange={this.handleSeasonChange}
        menuItems={menuItems}
        disabled={uiDisabled}
        onMenuOpen={onMenuOpen}
        onMenuClose={onMenuClose}
      />
    );
  }

  public handleSeasonChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const season = event.target.value as Season;
    this.stores.simulation.setSeason(season);
    log("SeasonChanged", { season });
  }
}
