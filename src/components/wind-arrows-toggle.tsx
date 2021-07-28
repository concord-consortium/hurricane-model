import { inject, observer } from "mobx-react";
import * as React from "react";
import { BaseComponent, IBaseProps } from "./base";
import Switch from "@material-ui/core/Switch";
import { log } from "@concord-consortium/lara-interactive-api";
import * as css from "./wind-arrows-toggle.scss";

interface IProps extends IBaseProps {}
interface IState {}

@inject("stores")
@observer
export class WindArrowsToggle extends BaseComponent<IProps, IState> {
  public render() {
    const checked = this.stores.ui.windArrows;
    return (
      <div className={css.windArrowsToggle}>
        <div className={css.label}>Wind Direction and Speed</div>
        <div className={css.toggleContainer}>
          <Switch disableRipple={true} checked={checked} onChange={this.handleChange} />
        </div>
      </div>
    );
  }

  public handleChange = (e: any, checked: boolean) => {
    this.stores.ui.setWindArrows(checked);
    if (checked) {
      log("WindArrowsShown");
    } else {
      log("WindArrowsHidden")
    }
  }
}
