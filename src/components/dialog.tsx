import React, { FC, ReactNode, useId } from "react";
import MuiDialog, { DialogProps } from "@mui/material/Dialog";
import CloseIcon from "@mui/icons-material/Close";
import css from "./dialog.scss";

interface IProps {
  onClose: () => void;
  open: boolean;
  title?: string;
  // Accessible name for a dialog with no visible title. Ignored when title is set.
  ariaLabel?: string;
  ariaDescribedBy?: string;
  children?: ReactNode;
}

export const Dialog: FC<IProps> = ({ onClose, open, title, ariaLabel, ariaDescribedBy, children }) => {
  const titleId = useId();

  // Escape is the only MUI-reported reason we honor, so a reason MUI adds later cannot
  // dismiss a dialog by default. Backdrop clicks are ignored; the close button calls onClose directly.
  const handleClose: NonNullable<DialogProps["onClose"]> = (_event, reason) => {
    if (reason !== "escapeKeyDown") return;
    onClose();
  };

  return (
    <MuiDialog
      onClose={handleClose}
      open={open}
      maxWidth="lg"
      // MUI's own aria-labelledby prop fabricates a dangling id when undefined. Label the paper
      // instead: slotProps override MUI's internal value even when explicitly undefined.
      slotProps={{ paper: {
        "aria-labelledby": title ? titleId : undefined,
        "aria-label": title ? undefined : ariaLabel
      } }}
      aria-describedby={ariaDescribedBy}
    >
      <div className={css.dialogBody}>
        { title && <div id={titleId} className={css.title}>{ title }</div> }
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
