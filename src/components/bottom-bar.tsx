import { inject, observer } from "mobx-react";
import * as React from "react";
import { BaseComponent, IBaseProps } from "./base";
import Button from "@material-ui/core/Button";
import StartIcon from "../assets/start.svg";
import PauseIcon from "../assets/pause.svg";
import RestartIcon from "../assets/restart.svg";
import { SeasonButton } from "./season-button";

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
          <SeasonButton />
        </div>
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
        {
          ui.zoomedInView &&
          <Button onClick={this.stores.ui.setNorthAtlanticView}>Return to full map</Button>
        }
        </div>
      </div>
    );
  }

  public handleReset = () => {
    this.stores.simulation.reset();
    this.stores.ui.setNorthAtlanticView();
  }
}
