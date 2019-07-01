import * as React from "react";
import MuiDialog from "@material-ui/core/Dialog";
import CloseIcon from "@material-ui/icons/Close";
import * as css from "./dialog.scss";

interface IProps {
  onClose: () => void;
  open: boolean;
  title?: string;
}

export class Dialog extends React.Component<IProps> {
  public render() {
    const { onClose, open, title, children } = this.props;
    return (
        <MuiDialog
          onClose={onClose}
          open={open}
          maxWidth="lg"
        >
          <div className={css.dialogBody}>
            <div className={css.title}>{ title }</div>
            <CloseIcon className={css.closeButton} onClick={onClose} />
            <div className={css.content}>{ children }</div>
          </div>
        </MuiDialog>
    );
  }
}
