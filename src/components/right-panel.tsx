import { inject, observer } from "mobx-react";
import * as React from "react";
import { BaseComponent, IBaseProps } from "./base";
import { MapTab } from "./map-tab";
import { MapButton } from "./map-button";

import * as css from "./right-panel.scss";

export type MapType = "base" | "overlays";

interface IProps extends IBaseProps { }
interface IState {
  open: boolean;
  selectedTab: MapType;
}

@inject("stores")
@observer
export class RightPanel extends BaseComponent<IProps, IState> {
  constructor(props: IProps) {
    super(props);
    this.state = {
      open: false,
      selectedTab: "base"
    };
  }

  public render() {
    const { open, selectedTab } = this.state;
    const { ui } = this.stores;
    return (
      <div className={css.rightPanelContainer}>
        <div className={`${css.rightPanel} ${open ? css.open : ""}`} data-test="right-panel">
          <ul className={css.rightPanelTabs}>
            <li><div id={"base"} className={css.rightPanelTab} onClick={this.handleToggleDrawer}>
              <MapTab tabType={"base"} active={selectedTab === "base" || !open} /></div></li>
            <li><div id={"overlays"} className={css.rightPanelTab} onClick={this.handleToggleDrawer}>
              <MapTab tabType={"overlays"} active={selectedTab === "overlays" || !open} /></div></li>
          </ul>
          {
            selectedTab === "base" &&
            <div className={`${css.tabContentBack} ${css.geoMaps}`} data-test="geo-panel">
              <div className={css.tabContent}>
                <div className={css.drawerTitle}>Base Maps</div>
                <MapButton label="Satellite" value="satellite" mapType="base" />
                <MapButton label="Relief" value="relief" mapType="base" />
                <MapButton label="Street" value="street" mapType="base" />
              </div>
            </div>
          }
          {
            selectedTab === "overlays" &&
            <div className={`${css.tabContentBack} ${css.impactMaps}`} data-test="impact-panel">
                <div className={css.tabContent}>
                  <div className={css.drawerTitle}>Map Overlays</div>
                  <MapButton label="Population" value="population" mapType="overlays" />
                  <MapButton label="Precipitation" value="precipitation" mapType="overlays" />
                  <MapButton label="Storm Surge" value="stormSurge" mapType="overlays" disabled={!ui.zoomedInView} />
                </div>
            </div>
          }
        </div>
      </div>
    );
  }

  public handleToggleDrawer = (e: React.SyntheticEvent) => {
    const { selectedTab } = this.state;
    if (e.currentTarget.id !== selectedTab) {
      this.setState({ open: true, selectedTab: e.currentTarget.id as MapType});
    } else {
      this.setState({ open: !this.state.open });
    }
  }
}
