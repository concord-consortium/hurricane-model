import { inject, observer } from "mobx-react";
import * as React from "react";
import { BaseComponent, IBaseProps } from "./base";
import Button from "@material-ui/core/Button";
import PlayArrowIcon from "@material-ui/icons/PlayArrow";
import PauseIcon from "@material-ui/icons/Pause";
import RestartIcon from "@material-ui/icons/SkipPrevious";

import * as css from "./bottom-bar.scss";

interface IProps extends IBaseProps {}
interface IState {}

@inject("stores")
@observer
export class BottomBar extends BaseComponent<IProps, IState> {

  public render() {
    const started = this.stores.simulation.simulationStarted;
    const ready = this.stores.simulation.ready;
    return (
      <div className={css.bottomBar}>
        <Button
          onClick={started ? this.stores.simulation.stop : this.stores.simulation.start}
          disabled={!ready}
          data-test="start-button"
        >
          { started ? <span><PauseIcon/> Stop</span> : <span><PlayArrowIcon/> Start</span> }
        </Button>
        <Button onClick={this.stores.simulation.reset}><RestartIcon/> Restart</Button>
      </div>
    );
  }
}
