import { inject, observer } from "mobx-react";
import * as React from "react";
import { BaseComponent, IBaseProps } from "./base";
import config from "../config";

import * as css from "./map-tab.scss";

interface IProps extends IBaseProps { }
interface IState { }

@inject("stores")
@observer
export class MapTab extends BaseComponent<IProps, IState> {

  public render() {
    const ui = this.stores.ui;
    return (
      <div className={`${css.mapTab} ${css.geoMaps}`} data-test="map-tab">
        <div className={`${css.mapTabBack} ${css.geoMaps}`}>
          <div className={css.mapTabContent}>
            <div className={css.mapTabImage} />
          </div>
        </div>
      </div>
    );
  }
}
