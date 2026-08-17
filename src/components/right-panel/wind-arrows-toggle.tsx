import { clsx } from "clsx";
import { inject, observer } from "mobx-react";
import * as React from "react";
import { BaseComponent, IBaseProps } from "../base";
import Switch from "@mui/material/Switch";
import { log } from "../../log";
import css from "./wind-arrows-toggle.scss";

interface IProps extends IBaseProps {}
interface IState {}

@inject("stores")
@observer
export class WindArrowsToggle extends BaseComponent<IProps, IState> {
  public render() {
    const checked = this.stores.ui.windArrows;
    return (
      <div className={css.windArrowsToggle}>
        <div className={css.label}>Wind Direction<br />and Speed</div>
        <div className={css.toggleContainer} onClick={this.toggle}>
          <span data-text="Hide" className={clsx(css.stateLabel, { [css.active]: !checked })}>Hide</span>
          <Switch disableRipple={true} color="secondary" checked={checked}
            onChange={this.handleChange} onClick={this.stopClick} />
          <span data-text="Show" className={clsx(css.stateLabel, { [css.active]: checked })}>Show</span>
        </div>
      </div>
    );
  }

  public setWind = (checked: boolean) => {
    this.stores.ui.setWindArrows(checked);
    log(checked ? "WindArrowsShown" : "WindArrowsHidden");
  };

  public handleChange = (_e: any, checked: boolean) => this.setWind(checked);

  // Clicking anywhere in the row toggles the switch (both directions).
  public toggle = () => this.setWind(!this.stores.ui.windArrows);

  // The switch handles its own toggle via onChange; stop its click from also bubbling to the row
  // handler (which would toggle a second time and cancel it out).
  public stopClick = (e: React.MouseEvent) => e.stopPropagation();
}
