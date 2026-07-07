import React, { useEffect, useState } from "react";

import { log } from "../../log";
import { getInteractiveState } from "../../models/interactive-state";
import { useStores } from "../../stores-context";
import { getAppName } from "../../utils/app";
import { saveModelToCloud } from "../../utils/cloud-storage";
import { Copyright } from "./copyright";

import css from "./share-dialog-content.scss";

const getURL = () => window.location.href;

const getIframeString = () => {
  return `<iframe width='1000px' height='800px' frameborder='no' scrolling='no' ` +
         `allowfullscreen='true' src='${getURL()}'></iframe>`;
};

const getModelUrl = (modelId: string) => {
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set("modelId", modelId);
  return url.toString();
};

export const ShareDialogContent: React.FC = () => {
  const stores = useStores();
  const [saving, setSaving] = useState(true);
  const [modelId, setModelId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Upload the current model (the component mounts fresh
  // each open because MUI Dialog unmounts its children on close).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const id = await saveModelToCloud(getInteractiveState(stores));
        if (cancelled) return;
        setModelId(id);
        log("ModelShared", { modelId: id });
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setSaving(false);
      }
    })();
    return () => { cancelled = true; };
  }, [stores]);

  return (
    <div className={css.shareDialog}>
      <p>
        To share the {getAppName()} simulation in email or IM, copy this link:
        <textarea id="page-url" value={getURL()} readOnly={true} />
      </p>
      <p>
        To embed the {getAppName()} simulation in a website or blog, copy this html:
        <textarea id="iframe-string" value={getIframeString()} readOnly={true} />
      </p>
      <p>
        {saving &&
          <span data-test="share-model-saving">Saving model...</span>}
        {!saving && error &&
          <span data-test="share-model-error">Couldn&apos;t save the model: {error}</span>}
        {!saving && modelId &&
          <>
            To share this exact model state in email or IM, copy this link:
            <textarea
              id="model-url"
              data-test="share-model-url"
              value={getModelUrl(modelId)}
              readOnly={true}
            />
          </>}
      </p>
      <Copyright/>
    </div>
  );
};
