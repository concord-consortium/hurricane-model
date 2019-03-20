import { inject, observer } from "mobx-react";
import * as React from "react";
import { BaseComponent, IBaseProps } from "./base";
import { MapTab } from "./map-tab";
import config from "../config";

import * as css from "./right-panel.scss";
import { MapButton } from "./map-button";

export const mapTypes = {
  geo: "geo",
  impact: "impact"
};

interface IProps extends IBaseProps { }
interface IState {
  open: boolean;
  selectedTab: string;
}

@inject("stores")
@observer
export class RightPanel extends BaseComponent<IProps, IState> {
  constructor(props: IProps) {
    super(props);
    this.state = {
      open: false,
      selectedTab: mapTypes.geo
    };
  }

  public render() {
    const { open, selectedTab } = this.state;
    return (
      <div className={css.rightPanelContainer}>
        <div className={`${css.rightPanel} ${open ? css.open : ""}`} data-test="right-panel">
          <ul className={css.rightPanelTabs}>
            <li><div id={mapTypes.geo} className={css.rightPanelTab}
              onClick={this.handleToggleDrawer}><MapTab tabType={mapTypes.geo} /></div></li>
            <li><div id={mapTypes.impact} className={css.rightPanelTab}
              onClick={this.handleToggleDrawer}><MapTab tabType={mapTypes.impact} /></div></li>
          </ul>
          {selectedTab === mapTypes.geo &&
            <div className={`${css.tabContentBack} ${css.geoMaps}`} data-test="geo-panel">
              <div className={css.tabContent}>
                <div className={css.drawerTitle}>Geologic Maps</div>
                <MapButton label="Satellite" mapType={selectedTab} />
                <MapButton label="Relief" mapType={selectedTab} />
                <MapButton label="Street" mapType={selectedTab} />
              </div>
            </div>
          }
          {selectedTab === mapTypes.impact &&
            <div className={`${css.tabContentBack} ${css.impactMaps}`} data-test="impact-panel">
                <div className={css.tabContent}>
                  <div className={css.drawerTitle}>Impact Maps</div>
                  <MapButton label="Population" mapType={selectedTab} />
                  <MapButton label="Storm Surge" mapType={selectedTab} />
                  <MapButton label="Precipitation" mapType={selectedTab} />
                  <MapButton label="Vulnerability" mapType={selectedTab} />
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
      this.setState({ open: true, selectedTab: e.currentTarget.id });
    } else {
      this.setState({ open: !this.state.open });
    }
  }
}
