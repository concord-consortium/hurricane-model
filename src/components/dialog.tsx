import * as React from "react";
import MuiDialog from "@mui/material/Dialog";
import CloseIcon from "@mui/icons-material/Close";
import css from "./dialog.scss";

interface IProps {
  onClose: () => void;
  open: boolean;
  title: string;
  ariaDescribedBy?: string;
  children?: React.ReactNode;
}

export const Dialog: React.FC<IProps> = ({ onClose, open, title, ariaDescribedBy, children }) => {
  const titleId = React.useId();
  return (
    <MuiDialog
      onClose={onClose}
      open={open}
      maxWidth="lg"
      aria-labelledby={titleId}
      aria-describedby={ariaDescribedBy}
    >
      <div className={css.dialogBody}>
        <div id={titleId} className={css.title}>{ title }</div>
        <button
          type="button"
          aria-label="Close"
          className={css.closeButton}
          onClick={onClose}
        >
          <CloseIcon />
        </button>
        <div className={css.content}>{ children }</div>
      </div>
    </MuiDialog>
  );
};
