import * as React from "react";
import MuiDialog from "@mui/material/Dialog";
import CloseIcon from "@mui/icons-material/Close";
import css from "./dialog.scss";

interface IProps {
  onClose: () => void;
  open: boolean;
  title?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  children?: React.ReactNode;
}

export const Dialog: React.FC<IProps> = ({ onClose, open, title, ariaLabel, ariaDescribedBy, children }) => {
  const labelId = React.useId();
  const labelText = title ?? ariaLabel;
  return (
    <MuiDialog
      onClose={onClose}
      open={open}
      maxWidth="lg"
      aria-labelledby={labelText ? labelId : undefined}
      aria-describedby={ariaDescribedBy}
    >
      <div className={css.dialogBody}>
        {title
          ? <div id={labelId} className={css.title}>{ title }</div>
          : ariaLabel && <span id={labelId} className={css.visuallyHidden}>{ ariaLabel }</span>}
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
