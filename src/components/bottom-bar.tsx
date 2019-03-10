import { inject, observer } from "mobx-react";
import * as React from "react";
import { BaseComponent, IBaseProps } from "./base";
import Button from "@material-ui/core/Button";
import Select from "@material-ui/core/Select";
import MenuItem from "@material-ui/core/MenuItem";
import StartIcon from "../assets/start.svg";
import PauseIcon from "../assets/pause.svg";
import RestartIcon from "../assets/restart.svg";
import { Season } from "../types";

import * as css from "./bottom-bar.scss";

interface IProps extends IBaseProps {}
interface IState {}

@inject("stores")
@observer
export class BottomBar extends BaseComponent<IProps, IState> {

  public render() {
    const sim = this.stores.simulation;
    const ui = this.stores.ui;
    return (
      <div className={css.bottomBar}>
        <div className={css.widgetGroup}>
          <Button
            onClick={sim.simulationStarted ? sim.stop : sim.start}
            disabled={!sim.ready}
            className={css.tallButton}
            data-test="start-button"
          >
            { sim.simulationStarted ? <span><PauseIcon/> Stop</span> : <span><StartIcon /> Start</span> }
          </Button>
          <Button className={css.tallButton} data-test="restart-button" onClick={this.handleReset}>
            <span><RestartIcon/> Restart</span>
          </Button>
        </div>
        <div className={css.seasonSelect}>
          <span className={css.label}>Season:</span>
          <Select
            data-test="season-select"
            value={sim.season}
            autoWidth={false}
            onChange={this.handleSeasonChange}
          >
            <MenuItem value="spring">Spring</MenuItem>
            <MenuItem value="summer">Summer</MenuItem>
            <MenuItem value="fall">Fall</MenuItem>
            <MenuItem value="winter">Winter</MenuItem>
        </Select>
        {
          ui.zoomedInView &&
          <Button onClick={this.stores.ui.setNorthAtlanticView}>Return to full map</Button>
        }
        </div>
      </div>
    );
  }

  public handleSeasonChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    this.stores.simulation.setSeason(event.target.value as Season);
  }

  public handleReset = () => {
    this.stores.simulation.reset();
    this.stores.ui.setNorthAtlanticView();
  }
}
