import * as React from "react";
import { BaseComponent, IBaseProps } from "./base";
import { Authoring } from "./authoring";
import { IndexPage } from "./index-page";

import config from "../config";

import * as css from "./app.scss";

interface IProps extends IBaseProps {}
interface IState {}

export class AppComponent extends BaseComponent<IProps, IState> {
  public render() {
    return (
      <div className={css.app}>
        {
          config.authoring ?
          <Authoring /> : <IndexPage />
        }
      </div>
    );
  }
}
