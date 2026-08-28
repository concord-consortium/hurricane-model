import { observer } from "mobx-react";
import React, { useState } from "react";

import config from "../../config";
import { log } from "../../log";
import { RightTabType } from "../../models/ui";
import { useStores } from "../../stores-context";
import { changeHurricaneImage, changeWindArrows } from "../../utils/ui";
import { Tab } from "../tab";
import { MapButton } from "./map-button";
import { LabeledSwitch } from "./labeled-switch";

import baseMapTabImg from "../../assets/base-map-tab.png";
import overlayTabImg from "../../assets/overlay-tab.png";

import tabCss from "../tab.scss";
import css from "./right-panel.scss";

const getAvailableOverlays = (): {[key: string]: boolean} => {
  return (config.availableOverlays || []).reduce((res: { [key: string]: boolean }, o: string) => {
    res[o] = true;
    return res;
  }, {});
};

export const RightPanel = observer(function RightPanel() {
  const { ui } = useStores();
  const [open, setOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState<RightTabType>("base");
  const availableOverlays = getAvailableOverlays();

  const overlayTabVisible = config.availableOverlays && config.availableOverlays.length > 0;
  const settingsTabVisible = config.mode === "storm" && (config.windArrowsToggle || config.hurricaneImageToggle);

  const handleToggleDrawer = (tab: RightTabType) => {
    if (tab !== selectedTab) {
      setOpen(true);
      setSelectedTab(tab);
      log("MapTabOpened", { type: tab });
    } else {
      const newState = !open;
      setOpen(newState);
      if (newState) {
        log("MapTabOpened", { type: tab });
      } else {
        log("MapTabClosed", { type: tab });
      }
    }
  }

  const handleWindArrowsChange = (checked: boolean) => {
    changeWindArrows(ui, checked);
  }

  const handleHurricaneImageChange = (checked: boolean) => {
    changeHurricaneImage(ui, checked);
  }

  return (
    <div className={css.rightPanelContainer}>
      <div className={`${css.rightPanel} ${open ? css.open : ""}`} data-test="right-panel">
        <ul className={css.rightPanelTabs}>
          <li>
            <Tab
              active={selectedTab === "base" || !open}
              className={tabCss.geoMaps}
              dataTest="tab-base"
              image={baseMapTabImg}
              onClick={() => handleToggleDrawer("base")}
              side="right"
              text="Base Maps"
            />
          </li>
          {
            overlayTabVisible &&
            <li>
              <Tab
                active={selectedTab === "overlay" || !open}
                className={tabCss.impactMaps}
                dataTest="tab-overlay"
                image={overlayTabImg}
                onClick={() => handleToggleDrawer("overlay")}
                side="right"
                text="Map Overlays"
              />
            </li>
          }
          {
            settingsTabVisible &&
            <li>
              <Tab
                active={selectedTab === "settings" || !open}
                className={tabCss.settings}
                dataTest="tab-settings"
                onClick={() => handleToggleDrawer("settings")}
                side="right"
                text="Settings"
              />
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
                  title="Wind Direction" title2="and Speed" offLabel="Hide" onLabel="Show"
                  checked={ui.windArrows} dataTest="wind-arrows-setting"
                  onChange={handleWindArrowsChange}
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
                  checked={ui.hurricaneImage} dataTest="hurricane-image-setting"
                  onChange={handleHurricaneImageChange}
                />
              }
            </div>
          </div>
        }
      </div>
    </div>
  );
});
