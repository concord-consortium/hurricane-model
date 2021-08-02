import * as React from "react";
import { BaseComponent, IBaseProps } from "./base";
import RefreshIcon from "@material-ui/icons/Refresh";
import { Dialog } from "./dialog";
import { AboutDialogContent } from "./about-dialog-content";
import { ShareDialogContent } from "./share-dialog-content";
import { log } from "@concord-consortium/lara-interactive-api";
import * as css from "./top-bar.scss";

interface IProps extends IBaseProps {}
interface IState {
  shareOpen: boolean;
  aboutOpen: boolean;
}

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
    log("TopBarReloadButtonClicked");
    // Give some time for the log message to be delivered. Note it goes only to the parent window using postMessage,
    // so we don't have to wait for network request.
    setTimeout(() => window.location.reload(), 100);
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
