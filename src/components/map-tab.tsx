import { inject, observer } from "mobx-react";
import * as React from "react";
import { BaseComponent, IBaseProps } from "./base";
import { MapType } from "./right-panel";
import * as css from "./map-tab.scss";

import * as geoMapTab from "../assets/geo-map.png";
import * as impactMapTab from "../assets/impact-map.png";

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
    const tabStyle = tabType === "geo" ? css.geoMaps : css.impactMaps;
    const activeStyle = active ? css.active : "";
    const tabText = tabType === "geo" ? "Geo Maps" : "Impact Maps";
    const tabMap = {
      backgroundImage: ""
    };
    if (tabType === "geo") {
      tabMap.backgroundImage = `url(${geoMapTab})`;
    } else {
      tabMap.backgroundImage = `url(${impactMapTab})`;
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
