import { observer } from "mobx-react";
import React, { useId, useState } from "react";

import config from "../../config";
import { log } from "../../log";
import { useStores } from "../../stores-context";
import { Dialog } from "../dialog";
import { AboutContent } from "./about-content";
import { DisclaimerContent } from "./disclaimer-content";

type DismissSource = "gotIt" | "close";
type ModalContent = "disclaimer" | "about";

const ABOUT_TITLE = "About Storm Explorer";

export const DisclaimerModal = observer(function DisclaimerModal() {
  const { ui } = useStores();
  const [dismissed, setDismissed] = useState(false);
  const [content, setContent] = useState<ModalContent>("disclaimer");
  const messageId = useId();

  // Derived, not initial state: LaraAppWrapper sets ui.mode after the first render.
  const open = !dismissed && !config.skipDisclaimer && config.mode === "storm" && !ui.isReadOnly;
  const showAbout = content === "about";

  const dismiss = (source: DismissSource) => {
    setDismissed(true);
    log("DisclaimerDismissed", { source });
  };

  const showMoreInfo = () => {
    setContent("about");
    log("DisclaimerMoreInfoOpened");
  };

  return (
    <Dialog
      open={open}
      onClose={() => dismiss("close")}
      title={showAbout ? ABOUT_TITLE : undefined}
      ariaLabel="Disclaimer"
      ariaDescribedBy={showAbout ? undefined : messageId}
    >
      {
        showAbout
          ? <AboutContent onBack={() => setContent("disclaimer")} />
          : <DisclaimerContent id={messageId} onDismiss={() => dismiss("gotIt")} showMoreInfo={showMoreInfo} />
      }
    </Dialog>
  );
});
