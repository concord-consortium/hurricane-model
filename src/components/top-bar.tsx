import * as React from "react";
import { inject, observer } from "mobx-react";
import { BaseComponent, IBaseProps } from "./base";
import RefreshIcon from "@material-ui/icons/Refresh";
import { Dialog } from "./dialog";
import { AboutDialogContent } from "./about-dialog-content";
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
          <span className={css.textButton} onClick={this.handleAboutOpen}>About</span>
        </span>
        <Dialog
          onClose={this.handleAboutClose}
          open={this.state.aboutOpen}
          title={"About: Hurricane Explorer"}
        >
          <AboutDialogContent />
        </Dialog>
      </div>
    );
  }

  public handleReload = () => {
    window.location.reload();
  }

  public handleAboutOpen = () => {
    this.setState({ aboutOpen: true });
  }

  public handleAboutClose = () => {
    this.setState({ aboutOpen: false });
  }
}
