import { inject, observer } from "mobx-react";
import * as React from "react";
import { BaseComponent, IBaseProps } from "./base";
import { MapView } from "./map-view";
import { BottomBar } from "./bottom-bar";
import { RightPanel } from "./right-panel";
import CircularProgress from "@material-ui/core/CircularProgress";

import * as css from "./index-page.scss";

interface IProps extends IBaseProps {}
interface IState {}

@inject("stores")
@observer
export class IndexPage extends BaseComponent<IProps, IState> {
  public render() {
    const loading = this.stores.simulation.loading;
    return (
      <div className={css.index}>
        {
          loading &&
          <CircularProgress className={css.progress} size={100} thickness={5} color="inherit" />
        }
        <MapView />
        <RightPanel />
        <BottomBar />
      </div>
    );
  }
}
