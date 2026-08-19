import { clsx } from "clsx";
import { inject, observer } from "mobx-react";
import * as React from "react";
import { BaseComponent, IBaseProps } from "../base";
import Switch from "@mui/material/Switch";
import { log } from "../../log";
import css from "./hurricane-image-toggle.scss";

interface IProps extends IBaseProps {}
interface IState {}

@inject("stores")
@observer
export class HurricaneImageToggle extends BaseComponent<IProps, IState> {
  public render() {
    const checked = this.stores.ui.hurricaneImage;
    return (
      <div className={css.hurricaneImageToggle}>
        <div className={css.label}>Hurricane Image</div>
        <div className={css.toggleContainer} onClick={this.toggle}>
          <span data-text="Icon" className={clsx(css.stateLabel, { [css.active]: !checked })}>Icon</span>
          <Switch disableRipple={true} color="secondary" checked={checked}
            onChange={this.handleChange} onClick={this.stopClick} />
          <span data-text="Image" className={clsx(css.stateLabel, { [css.active]: checked })}>Image</span>
        </div>
      </div>
    );
  }

  public setImage = (checked: boolean) => {
    this.stores.ui.setHurricaneImage(checked);
    log(checked ? "HurricaneImageShown" : "HurricaneImageHidden");
  };

  public handleChange = (_e: any, checked: boolean) => this.setImage(checked);

  // Clicking anywhere in the row toggles the switch (both directions).
  public toggle = () => this.setImage(!this.stores.ui.hurricaneImage);

  // The switch handles its own toggle via onChange; stop its click from also bubbling to the row
  // handler (which would toggle a second time and cancel it out).
  public stopClick = (e: React.MouseEvent) => e.stopPropagation();
}
