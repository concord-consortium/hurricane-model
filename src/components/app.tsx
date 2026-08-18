import { inIframe } from "@concord-consortium/lara-interactive-api";
import { observer } from "mobx-react";
import React, { useEffect, useState } from "react";

import { setInteractiveState } from "../models/interactive-state";
import { useStores } from "../stores-context";
import { loadModelFromCloud } from "../utils/cloud-storage";
import { Authoring } from "./authoring/authoring";
import { IndexPage } from "./index-page";

import config from "../config";

import css from "./app.scss";
import commonCss from "./common.scss";

export const AppComponent = observer(function AppComponent() {
  const stores = useStores();
  const [modelLoadError, setModelLoadError] = useState<string | null>(null);

  // Load the saved model using the modelId url param.
  // Standalone only: in LARA, the wrapper handles loading so saved student work wins.
  useEffect(() => {
    let canUpdate = true;

    if (!inIframe() && config.modelId) {
      (async () => {
        try {
          const state = await loadModelFromCloud(config.modelId);
          if (canUpdate) setInteractiveState(stores, state, true);
        } catch (e) {
          if (canUpdate) setModelLoadError(e instanceof Error ? e.message : String(e));
        }
      })();
    }

    return () => {
      // Prevent updates if the component unmounts.
      canUpdate = false;
    };
  }, [stores]);

  return (
    <div className={css.app}>
      {modelLoadError &&
        <div className={commonCss.error} role="alert">
          Couldn&apos;t load the shared model: {modelLoadError}
        </div>}
      {config.authoring ? <Authoring /> : <IndexPage />}
    </div>
  );
});
