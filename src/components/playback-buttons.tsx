import { inject, observer } from "mobx-react";
import * as React from "react";
import { BaseComponent, IBaseProps } from "./base";
import Button from "@material-ui/core/Button";
import StartIcon from "../assets/start.svg";
import PauseIcon from "../assets/pause.svg";
import RestartIcon from "../assets/restart.svg";

import * as css from "./playback-buttons.scss";

interface IProps extends IBaseProps {}
interface IState {}

@inject("stores")
@observer
export class PlaybackButtons extends BaseComponent<IProps, IState> {
  public componentDidMount() {
    // Calling reset here early in the launch of the application sets the offsets for the map
    // so that population tile overlay can display in the correct location and hurricane doesn't get offset
    setTimeout(this.handleReset, 0.5);
  }
  public render() {
    const sim = this.stores.simulation;
    return [
      <Button
        key="start-stop"
        onClick={sim.simulationRunning ? sim.stop : sim.start}
        disabled={!sim.ready}
        className={css.playbackButton}
        data-test="start-button"
        disableRipple={true}
      >
        { sim.simulationRunning ? <span><PauseIcon/> Stop</span> : <span><StartIcon /> Start</span> }
      </Button>,
      <Button
        key="reset"
        className={css.playbackButton}
        data-test="restart-button"
        onClick={this.handleReset}
        disableRipple={true}
      >
        <span><RestartIcon/> Restart</span>
      </Button>
    ];
  }

  public handleReset = () => {
    this.stores.simulation.reset();
    this.stores.ui.setNorthAtlanticView();
  }
}
