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

export const AppComponent = observer(function AppComponent() {
  const stores = useStores();
  const [modelLoadError, setModelLoadError] = useState<string | null>(null);

  useEffect(() => {
    // Standalone only: in LARA, the wrapper handles loading so saved student work wins.
    if (!inIframe() && config.modelId) {
      (async () => {
        try {
          const state = await loadModelFromCloud(config.modelId);
          setInteractiveState(stores, state);
        } catch (e) {
          setModelLoadError(e instanceof Error ? e.message : String(e));
        }
      })();
    }
    // Run once on mount; modelId is the only standalone state source.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={css.app}>
      {modelLoadError &&
        <div className={css.modelLoadError}>
          Couldn&apos;t load the shared model: {modelLoadError}
        </div>}
      {
        config.authoring ?
        <Authoring /> : <IndexPage />
      }
    </div>
  );
});
