import { observer } from "mobx-react";
import React, { useId, useState } from "react";

import WarningIcon from "../assets/warning.svg";
import config from "../config";
import { log } from "../log";
import { useStores } from "../stores-context";
import { Dialog } from "./dialog";

import css from "./disclaimer-modal.scss";

type DismissSource = "gotIt" | "close";

export const DisclaimerModal = observer(function DisclaimerModal() {
  const { ui } = useStores();
  const [dismissed, setDismissed] = useState(false);
  const messageId = useId();

  // Derived, not initial state: LaraAppWrapper sets ui.mode after the first render.
  const open = !dismissed && !config.skipDisclaimer && config.mode === "storm" && !ui.isReportMode;

  const dismiss = (source: DismissSource) => {
    setDismissed(true);
    log("DisclaimerDismissed", { source });
  };

  return (
    <Dialog
      open={open}
      onClose={() => dismiss("close")}
      ariaLabel="Disclaimer"
      ariaDescribedBy={messageId}
    >
      <div className={css.disclaimer} data-test="disclaimer-modal">
        <WarningIcon aria-hidden={true} focusable={false} />
        <div id={messageId} className={css.message}>
          This is a simulation and cannot be used to make a forecast.
        </div>
        <button
          type="button"
          autoFocus={true}
          data-test="disclaimer-got-it-button"
          className={css.gotItButton}
          onClick={() => dismiss("gotIt")}
        >
          Got it
        </button>
      </div>
    </Dialog>
  );
});
