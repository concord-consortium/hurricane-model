import * as React from "react";
import { useState } from "react";
import { useStores } from "../../stores-context";
import { getInteractiveState } from "../../models/interactive-state";
import { saveModelToCloud } from "../../utils/cloud-storage";
import { Dialog } from "../dialog";
import { log } from "../../log";

const buildModelUrl = (modelId: string) =>
  window.location.href.split("?")[0] + "?modelId=" + modelId;

export const ShareModelButton: React.FC = () => {
  const stores = useStores();
  const [saving, setSaving] = useState(false);
  const [modelId, setModelId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setSaving(true);
    setError(null);
    try {
      const state = getInteractiveState(stores);
      const id = await saveModelToCloud(state);
      setModelId(id);
      log("ModelShared", { modelId: id });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setModelId(null);
    setError(null);
  };

  return (
    <>
      <button
        type="button"
        data-test="share-model-button"
        onClick={handleClick}
        disabled={saving}
      >
        {saving ? "Saving…" : "Share Model"}
      </button>

      <Dialog
        open={!!modelId || !!error}
        onClose={handleClose}
        title="Share Model"
      >
        {error &&
          <p>Sorry, we couldn&apos;t save your model: {error}</p>
        }
        {modelId &&
          <div>
            <p>
              Model code
              <textarea style={{ width: "100%" }} value={modelId} readOnly />
            </p>
            <p>
              Link to model
              <textarea style={{ width: "100%" }} value={buildModelUrl(modelId)} readOnly />
            </p>
          </div>
        }
      </Dialog>
    </>
  );
};
