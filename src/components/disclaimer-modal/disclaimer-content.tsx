import React from "react";

import WarningIcon from "../../assets/warning.svg";

import css from "./disclaimer-content.scss";

interface IDisclaimerContentProps {
  id: string;
  onDismiss: () => void;
  showMoreInfo: () => void;
}

export function DisclaimerContent({ id, onDismiss, showMoreInfo }: IDisclaimerContentProps) {
  return (
    <div className={css.disclaimer} data-test="disclaimer-modal">
      <WarningIcon aria-hidden={true} focusable={false} />
      <div id={id} className={css.message}>
        This is a simulation and cannot be used to make a forecast.
      </div>
      <button
        type="button"
        autoFocus={true}
        data-test="disclaimer-got-it-button"
        className={css.gotItButton}
        onClick={onDismiss}
      >
        Got it
      </button>
      <button
        type="button"
        data-test="disclaimer-more-info-button"
        className={css.moreInfoButton}
        onClick={showMoreInfo}
      >
        Want to know more?
      </button>
    </div>
  );
}
