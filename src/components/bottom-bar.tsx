import { inject, observer } from "mobx-react";
import * as React from "react";
import { BaseComponent, IBaseProps } from "./base";
import Button from "@material-ui/core/Button";
import { SeasonButton } from "./season-button";
import { PlaybackButtons } from "./playback-buttons";
import * as ccLogo from "../assets/cc-logo.png";

import * as css from "./bottom-bar.scss";

interface IProps extends IBaseProps {}
interface IState {}

@inject("stores")
@observer
export class BottomBar extends BaseComponent<IProps, IState> {

  public render() {
    const ui = this.stores.ui;
    return (
      <div className={css.bottomBar}>
        <img className={css.logo} src={ccLogo} />
        <div className={css.widgetGroup}>
          <SeasonButton />
        </div>
        <div className={css.widgetGroup}>
          <PlaybackButtons />
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
}
