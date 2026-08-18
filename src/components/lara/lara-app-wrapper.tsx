import {
  useInitMessage, useInteractiveState, useAuthoredState, setSupportedFeatures
} from "@concord-consortium/lara-interactive-api";
import { reaction } from "mobx";
import { observer } from "mobx-react";
import React, { useRef, useEffect, useState } from "react";

import config from "../../config";
import { useAutoHeight } from "../../hooks/use-auto-height";
import { migrateState, setInteractiveState, getInteractiveState } from "../../models/interactive-state";
import { IStores } from "../../models/stores";
import { IHurricaneInteractiveState, IHurricaneAuthoredState } from "../../types/interactive-state";
import { applyAuthoredState } from "../../utils/apply-authored-state";
import { loadModelFromCloud } from "../../utils/cloud-storage";
import { AppComponent } from "../app";
import { AuthoringInterface } from "./authoring-interface";
import { LoadingIndicator } from "./loading-indicator";

import commonCss from "../common.scss";
import css from "./lara-app-wrapper.scss";

setSupportedFeatures({
  interactiveState: true,
  authoredState: true
});

interface ILaraAppWrapperProps {
  stores: IStores;
}

interface ILaraAppContentProps {
  stores: IStores;
  authoredState: IHurricaneAuthoredState | null;
  setAuthoredState: (state: IHurricaneAuthoredState) => void;
  containerRef: (node: HTMLDivElement | null) => void;
}

/**
 * Inner component wrapped with observer for MobX reactivity.
 * This component handles rendering based on the current mode.
 * It receives all data from the outer component via props to avoid using hooks.
 */
const LaraAppContent: React.FC<ILaraAppContentProps> = observer((props) => {
  const { stores, authoredState, setAuthoredState, containerRef } = props;

  // In authoring mode, show the authoring interface
  if (stores.ui.mode === "authoring") {
    return (
      <div ref={containerRef}>
        <AuthoringInterface
          authoredState={authoredState}
          setAuthoredState={setAuthoredState}
        />
      </div>
    );
  }

  // In runtime/report mode, render the app
  return (
    <div ref={containerRef} className={css.laraAppContainer}>
      <AppComponent />
    </div>
  );
});

/**
 * Outer wrapper component that uses React hooks (no observer).
 * This component handles all LARA API integration and state management,
 * then delegates rendering to the observer-wrapped LaraAppContent.
 *
 * Stores are passed as a prop since mobx-react 5.x doesn't export MobXProviderContext.
 */
export const LaraAppWrapper: React.FC<ILaraAppWrapperProps> = ({ stores }) => {
  const hasRestoredState = useRef(false);
  const seedLoadStarted = useRef(false);
  const [modelLoadError, setModelLoadError] = useState<string | null>(null);

  // LARA API hooks
  const initMessage = useInitMessage<IHurricaneInteractiveState, IHurricaneAuthoredState>();
  const {
    interactiveState,
    setInteractiveState: saveInteractiveState
  } = useInteractiveState<IHurricaneInteractiveState>();
  const {
    authoredState,
    setAuthoredState
  } = useAuthoredState<IHurricaneAuthoredState>();

  const isLoading = !initMessage;

  // Auto-height reporting - returns a callback ref for the container
  const containerRef = useAutoHeight({ disabled: isLoading });

  // Update store with mode from initMessage
  useEffect(() => {
    if (initMessage) {
      stores.ui.setMode(initMessage.mode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stores is stable
  }, [initMessage?.mode]);

  // Apply authored state once when initMessage becomes available (only in runtime/report mode).
  // Authored state establishes initial defaults only; any restored interactive
  // state always takes precedence (applied in the next useEffect).
  // Must come BEFORE conditional returns to comply with Rules of Hooks.
  useEffect(() => {
    if (initMessage && stores.ui.mode !== "authoring" && authoredState) {
      applyAuthoredState(authoredState);
    }
    // Intentionally depends only on initMessage:
    // - stores.ui.mode is set synchronously in the previous useEffect from initMessage.mode
    // - authoredState is available from LARA at the same time as initMessage
    // - We only want to apply authored state once as initial defaults, not re-apply on changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initMessage]);

  // Restore interactive state once, after authored state is applied.
  // If there is no interactive state, use the modelId url param to seed initial state
  // with a remote model. Keyed on initMessage so this re-runs once applyAuthoredState
  // (the effect above) has set config.modelId.
  useEffect(() => {
    if (!initMessage || hasRestoredState.current) return;

    let canUpdate = true;

    if (interactiveState) {
      const migratedState = migrateState(interactiveState);
      if (migratedState) {
        setInteractiveState(stores, migratedState, true);
      }
      hasRestoredState.current = true;
    } else if (config.modelId && stores.ui.mode !== "authoring" && !seedLoadStarted.current) {
      seedLoadStarted.current = true;
      loadModelFromCloud(config.modelId)
        .then((state) => {
          if (!hasRestoredState.current) {
            if (canUpdate) setInteractiveState(stores, state, true);
          }
        })
        .catch((e) => {
          if (canUpdate) setModelLoadError(e instanceof Error ? e.message : String(e));
        })
        .finally(() => {
          // Mark restored so a failed seed-load doesn't block the save reaction.
          hasRestoredState.current = true;
        });
    }

    return () => {
      // Prevent updates on unmount.
      canUpdate = false;
    };
  }, [interactiveState, initMessage, stores]);

  // Save state whenever simulation changes (debounced via MobX reaction)
  useEffect(() => {
    // Skip saving in authoring mode
    if (stores.ui.mode === "authoring") {
      return;
    }

    const disposer = reaction(
      () => getInteractiveState(stores),
      (state) => {
        // IMPORTANT: Don't save until initial state has been restored.
        // This prevents a race condition where mounting triggers MobX changes
        // that would save default state before the restore completes.
        if (hasRestoredState.current) {
          saveInteractiveState(state);
        }
      },
      { delay: 500 } // Debounce saves by 500ms
    );
    return () => disposer();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stores is stable
  }, [stores.ui.mode]);

  // --- Conditional returns (after all hooks) ---

  if (isLoading) {
    return <LoadingIndicator message="Loading your simulation..." />;
  }

  // Render the observer-wrapped content component
  return (
    <>
      {modelLoadError &&
        <div className={commonCss.error} role="alert">Couldn&apos;t load the shared model: {modelLoadError}</div>}
      <LaraAppContent
        stores={stores}
        authoredState={authoredState}
        setAuthoredState={setAuthoredState}
        containerRef={containerRef}
      />
    </>
  );
};
