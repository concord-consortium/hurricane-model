import React, { FC } from "react";
import MuiDialog from "@mui/material/Dialog";
import CloseIcon from "@mui/icons-material/Close";
import WarningIcon from "../assets/warning.svg";
import css from "./warning-modal.scss";

interface IProps {
  open: boolean;
  onClose: () => void;
}

// A simple, dismissible notice shown on top of the map (via MUI Dialog's portal/backdrop/Escape).
// Closed by the large "×", a backdrop click, or Escape.
export const WarningModal: FC<IProps> = ({ open, onClose }) => (
  <MuiDialog
    open={open}
    onClose={(_e, reason) => { if (reason !== "backdropClick") onClose(); }}
    aria-labelledby="warning-modal-message"
  >
    <div className={css.body}>
      <button type="button" aria-label="Close" className={css.closeButton} onClick={onClose}>
        <span className={css.closeInner}><CloseIcon /></span>
      </button>
      <span className={css.icon}><WarningIcon /></span>
      <p id="warning-modal-message" className={css.message}>
        This is a simulation and cannot be used to make a forecast.
      </p>
      <button type="button" className={css.okButton} onClick={onClose}>Got it</button>
    </div>
  </MuiDialog>
);
