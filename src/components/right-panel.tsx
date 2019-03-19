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
      open: true,
      selectedTab: mapTypes.geo
    };
  }

  public render() {
    const { open, selectedTab } = this.state;
    const ui = this.stores.ui;
    let selectedPanelStyle = css.geoMaps;
    let selectedPanelTitle = "Geologic Maps";
    switch (selectedTab) {
      case mapTypes.geo:
        selectedPanelStyle = css.geoMaps;
        selectedPanelTitle = "Geologic Maps";
        break;
      case mapTypes.impact:
        selectedPanelStyle = css.impactMaps;
        selectedPanelTitle = "Impact Maps";
        break;
      default:
        selectedPanelStyle = css.geoMaps;
        selectedPanelTitle = "Geologic Maps";
        break;
    }

    return (
      <div className={css.rightPanelContainer}>
        <div className={`${css.rightPanel} ${open ? css.open : ""}`} data-test="right-panel">
          <ul className={css.rightPanelTabs}>
            <li><div id={mapTypes.geo} className={css.rightPanelTab}
              onClick={this.handleToggleDrawer}><MapTab tabType={mapTypes.geo} /></div></li>
            <li><div id={mapTypes.impact} className={css.rightPanelTab}
              onClick={this.handleToggleDrawer}><MapTab tabType={mapTypes.impact} /></div></li>
          </ul>
          <div className={`${css.tabContentBack} ${selectedPanelStyle}`}>
            {selectedTab === mapTypes.geo &&
              <div className={css.tabContent}>
                <div className={css.drawerTitle}>Geologic Maps</div>
                <MapButton label="Satellite" mapType={selectedTab} active={true} />
                <MapButton label="Relief" mapType={selectedTab} />
                <MapButton label="Street" mapType={selectedTab} />
              </div>
            }
            {selectedTab === mapTypes.impact &&
              <div className={css.tabContent}>
                <div className={css.drawerTitle}>Impact Maps</div>
                <MapButton label="Population" mapType={selectedTab} active={true} />
                <MapButton label="Storm Surge" mapType={selectedTab} />
                <MapButton label="Precipitation" mapType={selectedTab} />
                <MapButton label="Vulnerability" mapType={selectedTab} />
              </div>
            }
          </div>
        </div>
      </div>
    );
  }

  private handleToggleDrawer = (e: React.SyntheticEvent) => {
    const { selectedTab } = this.state;
    if (e.currentTarget.id !== selectedTab) {
      this.setState({ open: true, selectedTab: e.currentTarget.id });
    } else {
      this.setState({ open: !this.state.open });
    }
  }
}
