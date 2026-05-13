import * as React from "react";
import MuiDialog from "@mui/material/Dialog";
import CloseIcon from "@mui/icons-material/Close";
import css from "./dialog.scss";

interface IProps {
  onClose: () => void;
  open: boolean;
  title?: string;
  children?: React.ReactNode;
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
