import { inject, observer } from "mobx-react";
import * as React from "react";
import { BaseComponent, IBaseProps } from "./base";
import Button from "@material-ui/core/Button";
import { Season } from "../types";
import config from "../config";

import * as css from "./season-button.scss";

interface IProps extends IBaseProps {}
interface IState {}

const seasons: Season[] = [ "fall", "winter", "spring", "summer" ];

@inject("stores")
@observer
export class SeasonButton extends BaseComponent<IProps, IState> {
  public render() {
    const sim = this.stores.simulation;
    // If set to lock the UI while the simulation is running, lock UI once the sim is started until it is reset
    const uiDisabled = config.lockSimulationWhileRunning && sim.simulationStarted;
    return (
      <Button
        onClick={this.handleSeasonChange}
        className={`${css.seasonButton} ${uiDisabled ? css.disabled : ""}`}
        data-test="season-button"
        disableTouchRipple={true}
        disabled={uiDisabled}
      >
        <div>
          <div className={css.seasonValue}>{ sim.season }</div>
          <div className={css.seasonLabel}>Season</div>
        </div>
      </Button>
    );
  }

  public handleSeasonChange = () => {
    const currentSeason = this.stores.simulation.season;
    const currentIdx = seasons.indexOf(currentSeason);
    this.stores.simulation.setSeason(seasons[(currentIdx + 1) % seasons.length]);
  }
}
