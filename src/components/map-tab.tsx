import { inject, observer } from "mobx-react";
import * as React from "react";
import { BaseComponent, IBaseProps } from "./base";
import { mapTypes } from "./right-panel";
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
    const tabStyle = tabType === mapTypes.geo ? css.geoMaps : css.impactMaps;
    const tabText = tabType === mapTypes.geo ? "Geo Maps" : "Impact Maps";

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
