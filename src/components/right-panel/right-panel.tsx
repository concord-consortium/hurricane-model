import { inject, observer } from "mobx-react";
import * as React from "react";

import config from "../../config";
import { log } from "../../log";
import { RightTab } from "../../models/ui";
import { BaseComponent, IBaseProps } from "../base";
import { MapTab } from "./map-tab";
import { MapButton } from "./map-button";
import { LabeledSwitch } from "./labeled-switch";

import css from "./right-panel.scss";

interface IProps extends IBaseProps { }
interface IState {
  open: boolean;
  selectedTab: RightTab;
}

const overlayTabVisible = () => {
  return config.availableOverlays && config.availableOverlays.length > 0;
};

const settingsTabVisible = () => {
  return config.mode === "storm" && (config.windArrowsToggle || config.hurricaneImageToggle);
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
              <div id="base" data-test="tab-base" className={css.rightPanelTab} onClick={this.handleToggleDrawer}>
                <MapTab tabType="base" active={selectedTab === "base" || !open} />
              </div>
            </li>
            {
              overlayTabVisible() &&
              <li>
                <div
                  id="overlay"
                  data-test="tab-overlay"
                  className={css.rightPanelTab}
                  onClick={this.handleToggleDrawer}
                >
                  <MapTab tabType="overlay" active={selectedTab === "overlay" || !open} />
                </div>
              </li>
            }
            {
              settingsTabVisible() &&
              <li>
                <div
                  id="settings"
                  data-test="tab-settings"
                  className={css.rightPanelTab}
                  onClick={this.handleToggleDrawer}
                >
                  <MapTab tabType="settings" active={selectedTab === "settings" || !open} />
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
          {
            selectedTab === "settings" &&
            <div className={`${css.tabContentBack} ${css.settings}`} data-test="settings-panel">
              <div className={css.tabContent}>
                <div className={css.drawerTitle}>Settings</div>
                {
                  config.windArrowsToggle &&
                  <LabeledSwitch
                    title="Wind Direction and Speed" offLabel="Hide" onLabel="Show"
                    checked={this.stores.ui.windArrows} dataTest="wind-arrows-setting"
                    onChange={this.handleWindArrowsChange}
                  />
                }
                {
                  config.windArrowsToggle && config.hurricaneImageToggle &&
                  <hr className={css.divider} />
                }
                {
                  config.hurricaneImageToggle &&
                  <LabeledSwitch
                    title="Hurricane Image" offLabel="Icon" onLabel="Image"
                    checked={this.stores.ui.hurricaneImage} dataTest="hurricane-image-setting"
                    onChange={this.handleHurricaneImageChange}
                  />
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
    const tab = e.currentTarget.id as RightTab;
    if (tab !== selectedTab) {
      this.setState({ open: true, selectedTab: tab });
      log("MapTabOpened", { type: tab });
    } else {
      const newState = !this.state.open;
      this.setState({ open: newState });
      if (newState) {
        log("MapTabOpened", { type: tab });
      } else {
        log("MapTabClosed", { type: tab });
      }
    }
  }

  public handleWindArrowsChange = (checked: boolean) => {
    this.stores.ui.setWindArrows(checked);
    log(checked ? "WindArrowsShown" : "WindArrowsHidden");
  }

  public handleHurricaneImageChange = (checked: boolean) => {
    this.stores.ui.setHurricaneImage(checked);
    log(checked ? "HurricaneImageShown" : "HurricaneImageHidden");
  }
}
