import { observer } from "mobx-react";
import React, { useId, useLayoutEffect, useState } from "react";

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
  const [content, setContent] = useState<ModalContent>("disclaimer");
  const messageId = useId();

  // Derived, not initial state: LaraAppWrapper sets ui.mode after the first render.
  const open = ui.disclaimerAvailable && !ui.disclaimerDismissed;
  const showAbout = content === "about";

  // Reopening from the map button should land on the disclaimer, not wherever the user left off.
  // Layout effect so the About content never paints during the opening transition.
  useLayoutEffect(() => {
    if (open) {
      setContent("disclaimer");
    }
  }, [open]);

  const dismiss = (source: DismissSource) => {
    ui.dismissDisclaimer();
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
