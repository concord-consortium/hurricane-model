import { inject, observer } from "mobx-react";
import * as React from "react";
import { BaseComponent, IBaseProps } from "../base";
import { MapType } from "./right-panel";
import css from "./map-tab.scss";
import baseMapTabImg from "../../assets/base-map-tab.png";
import overlayTabImg from "../../assets/overlay-tab.png";

interface IProps extends IBaseProps {
  tabType: MapType;
  active: boolean;
}
interface IState { }

@inject("stores")
@observer
export class MapTab extends BaseComponent<IProps, IState> {

  public render() {
    const { tabType, active } = this.props;
    const tabStyle = tabType === "base" ? css.geoMaps
      : tabType === "overlay" ? css.impactMaps
      : css.settingsMaps;
    const activeStyle = active ? css.active : "";
    const tabText = tabType === "base" ? "Base Maps"
      : tabType === "overlay" ? "Map Overlays"
      : "Settings";
    // Base/overlay tabs show a map thumbnail; the settings tab shows a plain white box (styled in CSS).
    const bgImg = tabType === "base" ? baseMapTabImg
      : tabType === "overlay" ? overlayTabImg
      : null;
    return (
      <div className={`${css.mapTab} ${tabStyle}`} data-test="map-tab">
        <div className={`${css.mapTabBack} ${tabStyle} ${activeStyle}`}>
          <div
            className={`${css.mapTabImage} ${tabStyle}`}
            style={bgImg ? { backgroundImage: `url(${bgImg})` } : undefined}
          />
          <div className={css.mapTabContent}>{tabText}</div>
        </div>
      </div>
    );
  }
}
