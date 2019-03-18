import { inject, observer } from "mobx-react";
import * as React from "react";
import { BaseComponent, IBaseProps } from "./base";
import { MapTab } from "./map-tab";
import config from "../config";

import * as css from "./right-panel.scss";

interface IProps extends IBaseProps { }
interface IState {
  open: boolean;
}

@inject("stores")
@observer
export class RightPanel extends BaseComponent<IProps, IState> {
  constructor(props: IProps) {
    super(props);
    this.state = {
      open: true
    };
  }

  public render() {
    const { open } = this.state;
    const ui = this.stores.ui;
    return (
      <div className={css.rightPanelContainer}>
        <div className={`${css.rightPanel} ${open ? css.open : ""}`} >
          <div className={css.rightPanelTab}
            onClick={this.handleToggleDrawer}><MapTab /></div>
          <div className={`${css.tabContentBack} ${css.geoMaps}`}>
            <div className={css.tabContent} />
          </div>
        </div>
      </div>
    );
  }

  private handleToggleDrawer = () => {
    this.setState({ open: !this.state.open });
  }
}
