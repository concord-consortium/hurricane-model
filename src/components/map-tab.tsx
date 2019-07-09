import { inject, observer } from "mobx-react";
import * as React from "react";
import { BaseComponent, IBaseProps } from "./base";
import { MapType } from "./right-panel";
import * as css from "./map-tab.scss";
import * as baseMapTabImg from "../assets/base-map-tab.png";
import * as overlayTabImg from "../assets/overlay-tab.png";

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
    const tabStyle = tabType === "base" ? css.geoMaps : css.impactMaps;
    const activeStyle = active ? css.active : "";
    const tabText = tabType === "base" ? "Base Maps" : "Maps Overlays";
    const tabMap = {
      backgroundImage: ""
    };
    if (tabType === "base") {
      tabMap.backgroundImage = `url(${baseMapTabImg})`;
    } else {
      tabMap.backgroundImage = `url(${overlayTabImg})`;
    }
    return (
      <div className={`${css.mapTab} ${tabStyle}`} data-test="map-tab">
        <div className={`${css.mapTabBack} ${tabStyle} ${activeStyle}`}>
          <div className={`${css.mapTabImage} ${tabStyle}`} style={tabMap}/>
          <div className={css.mapTabContent}>{tabText}</div>
        </div>
      </div>
    );
  }
}
