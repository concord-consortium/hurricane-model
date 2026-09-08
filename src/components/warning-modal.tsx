import React, { FC } from "react";
import MuiDialog from "@mui/material/Dialog";
import CloseIcon from "@mui/icons-material/Close";
import WarningIcon from "../assets/warning.svg";
import css from "./warning-modal.scss";

interface IProps {
  open: boolean;
  onClose: () => void;
}

// A dismissible notice shown on top of the map. Two views: the short "this is a simulation" warning
// (default), and an "About Storm Explorer" panel — reached via "Want to know more?" — listing the
// model's simplifications. Closed by the large "×" or Escape (backdrop clicks are ignored).
export const WarningModal: FC<IProps> = ({ open, onClose }) => {
  const [showAbout, setShowAbout] = React.useState(false);

  return (
    <MuiDialog
      open={open}
      onClose={(_e, reason) => { if (reason !== "backdropClick") onClose(); }}
      aria-labelledby={showAbout ? "about-modal-title" : "warning-modal-message"}
      // Let each view size to its own content (the About view is wider); default "sm" would cap it.
      maxWidth={false}
      // Reset to the warning view only AFTER the close animation finishes, so dismissing the About view
      // doesn't briefly reveal the warning underneath it as the modal fades out. (It reopens on the notice.)
      slotProps={{ transition: { onExited: () => setShowAbout(false) } }}
    >
      <div className={showAbout ? css.aboutBody : css.body}>
        <button type="button" aria-label="Close" className={css.closeButton} onClick={onClose}>
          <span className={css.closeInner}><CloseIcon /></span>
        </button>

        {showAbout ? (
          <>
            <h2 id="about-modal-title" className={css.aboutTitle}>About Storm Explorer</h2>
            <div className={css.aboutContent}>
              <p>
                Storm Explorer, like many weather models, is simplified and does not include all possible
                variables. As such, Storm Explorer should not be used for real-world hurricane forecasting.
              </p>
              <p className={css.aboutSubhead}>Model simplifications include:</p>
              <ul className={css.aboutList}>
                <li>
                  <strong>Wind.</strong> The model does not include upper atmosphere winds. Surface winds
                  direct the storm path. Wind data is based on a 30-year average for the region.
                </li>
                <li>
                  <strong>Sea Surface Temperature (SST).</strong> SST is based on the 2025 average
                  temperatures for each time period: summer (June–July), early fall (September), and late
                  fall (October). It is the primary energy source for changing storm categories and anomaly
                  adjustments can make the climate signal look stronger than reality. Finally, SST does not
                  change as a storm passes over the ocean.
                </li>
                <li>
                  <strong>Pressure Systems.</strong> There are only two high and two low pressure systems
                  whose ranges are fixed and do not change according to season.
                </li>
                <li>
                  <strong>Storm Surge.</strong> It is a risk map of plausible storm surge for each category
                  of storm. It is not a prediction of what one particular simulated hurricane will do.
                </li>
              </ul>
            </div>
            <button type="button" className={css.okButton} onClick={() => setShowAbout(false)}>
              Back
            </button>
          </>
        ) : (
          <>
            <span className={css.icon}><WarningIcon /></span>
            <p id="warning-modal-message" className={css.message}>
              This is a simulation and cannot be used to make a forecast.
            </p>
            <button type="button" className={css.okButton} onClick={onClose}>Got it</button>
            <button type="button" className={css.learnMore} onClick={() => setShowAbout(true)}>
              Want to know more?
            </button>
          </>
        )}
      </div>
    </MuiDialog>
  );
};
