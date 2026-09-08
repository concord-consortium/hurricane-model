import React from "react";

import css from "./about-content.scss";

interface IProps {
  onBack: () => void;
}

export const AboutContent = ({ onBack }: IProps) => (
  <div className={css.about} data-test="about-storm-explorer">
    <p>
      Storm Explorer, like many weather models, is simplified and does not include all possible variables. As such,
      Storm Explorer should not be used for real-world hurricane forecasting.
    </p>
    <p><strong>Model simplifications include:</strong></p>
    <ul>
      <li>
        <strong>Wind.</strong> The model does not include upper atmosphere winds. Surface winds direct the storm
        path. Wind data is based on a 30-year average for the region.
      </li>
      <li>
        <strong>Sea Surface Temperature (SST).</strong> SST is based on the 2025 average temperatures for each time
        period: summer (June), early fall (September), and late fall (October). It is the primary energy source for
        changing storm categories in the model and anomaly adjustments can make the climate signal look stronger
        than reality. Finally, SST does not change as a storm passes over the ocean.
      </li>
      <li>
        <strong>Pressure Systems.</strong> There are only two high and two low pressure systems whose ranges are
        fixed and do not change according to season.
      </li>
      <li>
        <strong>Storm Surge.</strong> The model includes a risk map of plausible storm surge for each category of
        storm. It is not a prediction of what one particular simulated hurricane will do.
      </li>
    </ul>
    <button
      type="button"
      autoFocus={true}
      data-test="about-storm-explorer-back-button"
      className={css.backButton}
      onClick={onBack}
    >
      Back
    </button>
  </div>
);
