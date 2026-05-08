import * as React from "react";
import { inject, observer } from "mobx-react";
import { BaseComponent, IBaseProps } from "./base";
import RefreshIcon from "@mui/icons-material/Refresh";
import { Dialog } from "./dialog";
import { AboutDialogContent } from "./about-dialog-content";
import { ShareDialogContent } from "./share-dialog-content";
import { log } from "../log";
import css from "./top-bar.scss";

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
        <span data-test="reload" className={css.textButton} onClick={this.handleReload}><RefreshIcon /></span>
        <span>
          <span data-test="share" className={css.textButton} onClick={this.handleShareOpen}>Share</span>
          <span data-test="about" className={css.textButton} onClick={this.handleAboutOpen}>About</span>
        </span>
        <Dialog
          onClose={this.handleAboutClose}
          open={this.state.aboutOpen}
          title="About: Hurricane Explorer"
        >
          <AboutDialogContent />
        </Dialog>
        <Dialog
          onClose={this.handleShareClose}
          open={this.state.shareOpen}
          title="Share: Hurricane Explorer"
        >
          <ShareDialogContent />
        </Dialog>
      </div>
    );
  }

  public handleReload = () => {
    log("SimulationEnded", {
      reason: "TopBarReloadButtonClicked",
      outcome: this.stores.simulation.getOutcomeData()
    });
    log("TopBarReloadButtonClicked");
    // Give some time for the log message to be delivered. Note it goes only to the parent window using postMessage,
    // so we don't have to wait for network request.
    setTimeout(() => this.reloadWindow(), 100);
  }

  // reloadWindow is a separate function so it can be mocked in jest tests.
  public reloadWindow() {
    window.location.reload();
  }

  public handleShareOpen = () => {
    this.setState({ shareOpen: true });
    log("ShareDialogOpened");
  }

  public handleAboutOpen = () => {
    this.setState({ aboutOpen: true });
    log("AboutDialogOpened");
  }

  public handleShareClose = () => {
    this.setState({ shareOpen: false });
  }

  public handleAboutClose = () => {
    this.setState({ aboutOpen: false });
  }
}
