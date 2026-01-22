import * as React from "react";
import { useRef, useEffect } from "react";
import { observer } from "mobx-react";
import { reaction } from "mobx";
import {
  useInitMessage,
  useInteractiveState,
  useAuthoredState,
  setSupportedFeatures
} from "@concord-consortium/lara-interactive-api";
import { useAutoHeight } from "../hooks/use-auto-height";
import { migrateState, setInteractiveState, getInteractiveState } from "../models/interactive-state";
import { applyAuthoredState } from "../utils/apply-authored-state";
import { IHurricaneInteractiveState, IHurricaneAuthoredState } from "../types/interactive-state";
import { IStores } from "../models/stores";
import { AppComponent } from "./app";
import { AuthoringInterface } from "./authoring-interface";
import { LoadingIndicator } from "./loading-indicator";
import * as css from "./lara-app-wrapper.scss";

// Declare supported features on module load
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // Intentionally depends only on initMessage:
    // - stores.ui.mode is set synchronously in the previous useEffect from initMessage.mode
    // - authoredState is available from LARA at the same time as initMessage
    // - We only want to apply authored state once as initial defaults, not re-apply on changes
  }, [initMessage]);

  // Restore interactive state once on initial load.
  // This runs after authored state is applied, so interactive state
  // overwrites any authored defaults with the student's saved values.
  useEffect(() => {
    if (interactiveState && !hasRestoredState.current) {
      // Migrate state to current version before restoring
      const migratedState = migrateState(interactiveState);
      if (migratedState) {
        setInteractiveState(stores, migratedState);
      }
      hasRestoredState.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stores is stable
  }, [interactiveState]);

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
    <LaraAppContent
      stores={stores}
      authoredState={authoredState}
      setAuthoredState={setAuthoredState}
      containerRef={containerRef}
    />
  );
};
