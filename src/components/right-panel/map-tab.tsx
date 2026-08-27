import { inject, observer } from "mobx-react";
import * as React from "react";
import { BaseComponent, IBaseProps } from "../base";
import { RightTab } from "../../models/ui";
import css from "./map-tab.scss";
import baseMapTabImg from "../../assets/base-map-tab.png";
import overlayTabImg from "../../assets/overlay-tab.png";

interface IProps extends IBaseProps {
  tabType: RightTab;
  active: boolean;
}
interface IState { }

@inject("stores")
@observer
export class MapTab extends BaseComponent<IProps, IState> {

  public render() {
    const { tabType, active } = this.props;
    const tabStyle = tabType === "base" ? css.geoMaps : tabType === "overlay" ? css.impactMaps : css.settings;
    const activeStyle = active ? css.active : "";
    const tabText = tabType === "base" ? "Base Maps" : tabType === "overlay" ? "Map Overlays" : "Settings";
    const tabImage = tabType === "base" ? baseMapTabImg : tabType === "overlay" ? overlayTabImg : undefined;
    return (
      <div className={`${css.mapTab} ${tabStyle}`} data-test="map-tab">
        <div className={`${css.mapTabBack} ${tabStyle} ${activeStyle}`}>
          {tabImage &&
            <div className={`${css.mapTabImage} ${tabStyle}`} style={{ backgroundImage: `url(${tabImage})` }}/>}
          <div className={`${css.mapTabContent} ${tabImage ? "" : css.noImage}`}>{tabText}</div>
        </div>
      </div>
    );
  }
}
