import * as React from "react";
import { inject, observer } from "mobx-react";
import { BaseComponent, IBaseProps } from "./base";
import RefreshIcon from "@material-ui/icons/Refresh";
import * as css from "./top-bar.scss";

interface IProps extends IBaseProps {}
interface IState {
  shareOpen: boolean;
  aboutOpen: boolean;
}

@inject("stores")
@observer
export class TopBar extends BaseComponent<IProps, IState> {
  constructor(props: IProps) {
    super(props);
    this.state = {
      shareOpen: false,
      aboutOpen: false
    };
  }

  public render() {
    return (
      <div className={css.topBar}>
        <span className={css.textButton} onClick={this.handleReload}><RefreshIcon /></span>
        <span>
          {/*<span className={css.textButton}>Share</span>*/}
          {/*<span className={css.textButton}>About</span>*/}
        </span>
      </div>
    );
  }

  public handleReload = () => {
    window.location.reload();
  }
}
