import React, { FC, ReactNode, useId } from "react";
import MuiDialog from "@mui/material/Dialog";
import CloseIcon from "@mui/icons-material/Close";
import css from "./dialog.scss";

interface IProps {
  onClose: () => void;
  open: boolean;
  title?: string;
  ariaDescribedBy?: string;
  children?: ReactNode;
}

export const Dialog: FC<IProps> = ({ onClose, open, title, ariaDescribedBy, children }) => {
  const titleId = useId();

  // MUI calls onClose for backdrop clicks, escape, and nothing else. Swallow
  // backdrop clicks so a dialog only closes deliberately; callers keep their
  // simple `() => void` signature and never see the reason.
  const handleClose = (event: object, reason: "backdropClick" | "escapeKeyDown") => {
    if (reason === "backdropClick") return;
    onClose();
  };

  return (
    <MuiDialog
      onClose={handleClose}
      open={open}
      maxWidth="lg"
      // MUI generates a fallback aria-labelledby id when its own prop is undefined, and that id points
      // at a title element a title-less dialog never renders. Labelling the paper (the element that
      // carries role="dialog") directly lets undefined mean "no label".
      slotProps={{ paper: { "aria-labelledby": title ? titleId : undefined } }}
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
