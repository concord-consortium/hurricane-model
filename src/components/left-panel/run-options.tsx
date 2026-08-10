import { observer } from "mobx-react";
import React from "react";

import { useStores } from "../../stores-context";

import css from "./run-options.scss";

/**
 * Run preferences pinned to the bottom of the Storm Setup panel. Currently just the option to keep
 * the panel open when a run starts (applies to both single-run and multi-track modes).
 */
export const RunOptions = observer(function RunOptions() {
  const { ui } = useStores();
  return (
    <div className={css.runOptions}>
      <label className={css.checkboxRow}>
        <input
          type="checkbox"
          className={css.checkbox}
          checked={ui.keepPanelOpenOnRun}
          data-test="keep-panel-open-checkbox"
          onChange={e => ui.setKeepPanelOpenOnRun(e.target.checked)}
        />
        <span>Keep panel open during run</span>
      </label>
    </div>
  );
});
