import { inject, observer } from "mobx-react";
import * as React from "react";
import { BaseComponent, IBaseProps } from "./base";
import config from "../config";

import * as css from "./map-tab.scss";

interface IProps extends IBaseProps {
  tabType: string;
}
interface IState { }

@inject("stores")
@observer
export class MapTab extends BaseComponent<IProps, IState> {

  public render() {
    const { tabType } = this.props;
    const ui = this.stores.ui;
    let tabStyle = css.geoMaps;
    let tabText = "Geo Maps";
    switch (tabType) {
      case "geo":
        tabStyle = css.geoMaps;
        tabText = "Geo Maps";
        break;
      case "impact":
        tabStyle = css.impactMaps;
        tabText = "Impact Maps";
        break;
      default:
        tabStyle = css.geoMaps;
        tabText = "Geo Maps";
        break;
    }
    return (
      <div className={`${css.mapTab} ${tabStyle}`} data-test="map-tab">
        <div className={`${css.mapTabBack} ${tabStyle}`}>
          <div className={`${css.mapTabImage} ${tabStyle}`} />
          <div className={css.mapTabContent}>{tabText}</div>
        </div>
      </div>
    );
  }
}
