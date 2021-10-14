import { inject, observer } from "mobx-react";
import * as React from "react";
import { BaseComponent, IBaseProps } from "./base";
import Switch from "@material-ui/core/Switch";
import { log } from "@concord-consortium/lara-interactive-api";
import * as css from "./hurricane-image-toggle.scss";

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
        <div className={css.toggleContainer}>
          <Switch disableRipple={true} checked={checked} onChange={this.handleChange} />
        </div>
      </div>
    );
  }

  public handleChange = (e: any, checked: boolean) => {
    this.stores.ui.setHurricaneImage(checked);
    if (checked) {
      log("HurricaneImageShown");
    } else {
      log("HurricaneImageHidden");
    }
  }
}
