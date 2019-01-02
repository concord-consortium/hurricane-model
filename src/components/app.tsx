import { inject, observer } from "mobx-react";
import * as React from "react";
import { BaseComponent, IBaseProps } from "./base";
import { MapView } from "./map-view";

import * as css from "./app.scss";

interface IProps extends IBaseProps {}
interface IState {}

@inject("stores")
@observer
export class AppComponent extends BaseComponent<IProps, IState> {

  public render() {
    return (
      <div className={css.app}>
        <MapView />
      </div>
    );
  }
}
