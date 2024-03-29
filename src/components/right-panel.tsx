import { inject, observer } from "mobx-react";
import * as React from "react";
import { BaseComponent, IBaseProps } from "./base";
import { MapTab } from "./map-tab";
import { MapButton } from "./map-button";
import config from "../config";

import * as css from "./right-panel.scss";
import { log } from "@concord-consortium/lara-interactive-api";

export type MapType = "base" | "overlay";

interface IProps extends IBaseProps { }
interface IState {
  open: boolean;
  selectedTab: MapType;
}

const overlayTabVisible = () => {
  return config.availableOverlays && config.availableOverlays.length > 0;
};

const getAvailableOverlays = (): {[key: string]: boolean} => {
  return (config.availableOverlays || []).reduce((res: { [key: string]: boolean }, o: string) => {
    res[o] = true;
    return res;
  }, {});
};

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
    const availableOverlays = getAvailableOverlays();
    return (
      <div className={css.rightPanelContainer}>
        <div className={`${css.rightPanel} ${open ? css.open : ""}`} data-test="right-panel">
          <ul className={css.rightPanelTabs}>
            <li>
              <div id="base" className={css.rightPanelTab} onClick={this.handleToggleDrawer}>
                <MapTab tabType="base" active={selectedTab === "base" || !open} />
              </div>
            </li>
            {
              overlayTabVisible() &&
              <li>
                <div id="overlay" className={css.rightPanelTab} onClick={this.handleToggleDrawer}>
                  <MapTab tabType="overlay" active={selectedTab === "overlay" || !open} />
                </div>
              </li>
            }

          </ul>
          {
            selectedTab === "base" &&
            <div className={`${css.tabContentBack} ${css.geoMaps}`} data-test="base-panel">
              <div className={css.tabContent}>
                <div className={css.drawerTitle}>Base Maps</div>
                <MapButton label="Satellite" value="satellite" mapType="base" />
                <MapButton label="Relief" value="relief" mapType="base" />
                <MapButton label="Street" value="street" mapType="base" />
                {config.enablePopulationMap &&
                  <MapButton label="Population" value="population" mapType="base" />}
              </div>
            </div>
          }
          {
            selectedTab === "overlay" &&
            <div className={`${css.tabContentBack} ${css.impactMaps}`} data-test="overlay-panel">
                <div className={css.tabContent}>
                  <div className={css.drawerTitle}>Map Overlays</div>
                  {
                    availableOverlays.sst &&
                    <MapButton label="Sea Surface Temp" value="sst" mapType="overlay" />
                  }
                  {
                    availableOverlays.precipitation &&
                    <MapButton label="Precipitation" value="precipitation" mapType="overlay" />
                  }
                  {
                    availableOverlays.stormSurge &&
                    <MapButton label="Storm Surge" value="stormSurge" mapType="overlay" />
                  }
                </div>
            </div>
          }
        </div>
      </div>
    );
  }

  public handleToggleDrawer = (e: React.SyntheticEvent) => {
    const { selectedTab } = this.state;
    const mapType = e.currentTarget.id as MapType;
    if (mapType !== selectedTab) {
      this.setState({ open: true, selectedTab: mapType });
      log("MapTabOpened", { type: mapType });
    } else {
      const newState = !this.state.open;
      this.setState({ open: newState });
      if (newState) {
        log("MapTabOpened", { type: mapType });
      } else {
        log("MapTabClosed", { type: mapType });
      }
    }
  }
}
