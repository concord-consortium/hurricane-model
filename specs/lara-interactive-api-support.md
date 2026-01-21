# LARA Interactive API Support Specification

## Overview

**Repository**: https://github.com/concord-consortium/hurricane-model

This specification defines the implementation of full LARA Interactive API support for the Hurricane Model application. The application currently uses only the `log()` function from `@concord-consortium/lara-interactive-api`. This spec outlines the integration of state persistence, authoring, runtime mode handling, and auto-height features.

---

## Summary for Product Owners

This section provides a non-technical overview of the changes described in this specification.

### What This Enables

#### 1. Student Work is Saved Automatically

When students use the Hurricane Model within LARA or Activity Player, their work will be automatically saved as they interact with the simulation. This includes:

- The position and strength of pressure systems they've configured
- Which season and starting location they selected
- The hurricane's path and any landfalls that occurred
- Their map and overlay preferences
- Whether the simulation was running, paused, or completed

**Benefit**: Students can leave an activity and return later to continue exactly where they left off. No more lost work if they accidentally close a tab or their session times out.

#### 2. Teachers Can Review Student Work

When teachers view a student's submitted work in report mode, they will see exactly what the student saw—including the hurricane track, pressure system positions, and all simulation results. The simulation controls are disabled in this view to preserve the student's work.

**Note**: In CLUE, the Hurricane Model will appear as a tile on the left side of the interface when in report mode, alongside other student work tiles. CLUE will also resize its tile height based on the height reported by the interactive via `setHeight()`.

**Benefit**: Teachers can accurately assess student understanding by seeing the exact state of their simulation, not just a screenshot or final answer.

#### 3. Curriculum Authors Can Pre-Configure Simulations

Authors creating activities can customize the Hurricane Model's initial settings without needing developer support. The authoring interface uses the same URL parameters that the application already supports—the same parameters developers use for testing and configuration—but presents them in a user-friendly form within the LARA authoring environment.

Authors can configure:

- The starting season (fall, winter, spring, summer)
- The hurricane's starting location (Atlantic or Gulf)
- Visibility of specific controls (wind arrows, hurricane image, etc.)
- Locking certain features to focus student attention
- Which map overlays are available

**Benefit**: Authors can create focused learning experiences tailored to specific learning objectives without writing code. The authoring system leverages existing, well-tested configuration options rather than introducing a separate configuration mechanism.

#### 4. The Simulation Fits Properly in LARA

The simulation will automatically communicate its size to LARA, ensuring it displays at the correct height without scrollbars or cut-off content.

**Benefit**: Better visual presentation and user experience when the simulation is embedded in activities.

### Future Compatibility

Once implemented, this integration will also enable the Hurricane Model to run inside **CLUE** (Collaborative Learning User Environment) when CLUE adds interactive API support. The same state persistence, authoring, and report mode features will work in both LARA and CLUE environments.

### What Doesn't Change

- **Standalone mode**: The simulation continues to work exactly as before when accessed directly (not through LARA or CLUE)
- **Existing functionality**: All current features remain unchanged
- **URL parameters**: Direct links with URL parameters still work for testing and sharing specific configurations

### User Experience Summary

| User | Current Experience | After Implementation |
|------|-------------------|---------------------|
| **Student** | Work is lost if they leave the activity | Work is automatically saved and restored |
| **Teacher** | Cannot see student's simulation state | Can view exact simulation state in reports |
| **Author** | Must request developer help for customization | Can configure via simple parameter interface |

---

## Current State

### Existing Implementation
- **Package**: `@concord-consortium/lara-interactive-api` v1.1.2
- **Current Usage**: Only `log()` function for event tracking
- **State Management**: MobX stores (`UIModel`, `SimulationModel`)
- **Configuration**: URL parameter-based via `config.ts`

### Package Upgrade Required

The package must be upgraded from v1.1.2 to the latest version (v1.12.0 as of this writing):

```bash
npm install @concord-consortium/lara-interactive-api@latest
```

The latest version includes improvements to hooks, better TypeScript types, and bug fixes. Review the changelog for any breaking changes before upgrading.

### Files Using LARA API (logging only)
- `src/components/bottom-bar.tsx`
- `src/components/season-button.tsx`
- `src/components/map-button.tsx`
- `src/components/wind-arrows-toggle.tsx`
- `src/components/hurricane-image-toggle.tsx`
- `src/components/pressure-system-icon.tsx`
- `src/components/pressure-system-marker.tsx`
- `src/components/sst-key.tsx`
- `src/components/right-panel.tsx`
- `src/components/top-bar.tsx`
- `src/components/start-location-button.tsx`
- `src/components/map-view.tsx`

## Requirements

### 1. Iframe Detection

The application must detect whether it is running inside an iframe (LARA/Activity Player context) or standalone, and only initialize LARA API features when iframed.

#### 1.1 Detection Method

Use the `inIframe()` function from the LARA API:

```typescript
import { inIframe } from "@concord-consortium/lara-interactive-api";

if (inIframe()) {
  // Running in LARA/Activity Player - enable LARA API features
} else {
  // Running standalone - skip LARA API initialization
}
```

#### 1.2 Standalone Mode Behavior

When running standalone (not in an iframe):
- Skip all LARA API hook initialization
- Do not call `setSupportedFeatures`
- Do not wait for `initMessage`
- Use URL parameters and default config only
- Log calls will be no-ops (already handled by the API)
- Application should function normally with full interactivity

#### 1.3 Implementation Pattern

Since React hooks must always be called in the same order, the iframe check must happen at the component tree level, not inside conditional hook calls.

**Store the mode in UIModel to avoid prop drilling:**

```typescript
// src/models/ui.ts - add mode to UIModel
export type InteractiveMode = "runtime" | "authoring" | "report" | "reportItem";

export class UIModel {
  @observable public mode: InteractiveMode = "runtime";

  @action.bound public setMode(mode: InteractiveMode) {
    this.mode = mode;
  }

  // ... existing properties
}
```

**Mode descriptions:**
- `runtime` - Normal student interaction mode
- `authoring` - Teacher/author configuring the interactive
- `report` - Read-only view of student work (teacher viewing submissions)
- `reportItem` - Similar to `report` but used when displaying in a report dashboard alongside other interactives. Treat identically to `report` mode (read-only, controls disabled).

**Conditional component rendering at the top level:**

```typescript
// index.tsx - decide which app to render at the top level
import { inIframe } from "@concord-consortium/lara-interactive-api";

const isIframed = inIframe();

ReactDOM.render(
  <Provider stores={stores}>
    <MuiThemeProvider theme={hurricanesTheme}>
      {isIframed ? <LaraAppWrapper stores={stores} /> : <AppComponent />}
    </MuiThemeProvider>
  </Provider>,
  document.getElementById("app")
);
```

**Passing stores as a prop:**

The existing codebase uses MobX `@inject("stores")` decorator for class components. For the `LaraAppWrapper` functional component, we pass stores directly as a prop rather than using a `useStores` hook.

**Note on mobx-react 5.x compatibility:** This project uses `mobx-react` version 5.x, which does not export `MobXProviderContext`. A `useStores` hook pattern that relies on `MobXProviderContext` will not work. Instead, stores are passed explicitly as a prop to `LaraAppWrapper`.

The `LaraAppWrapper` component uses all LARA hooks and manages mode, state restoration, and auto-height. See section 3.5 for the complete implementation.

**LoadingIndicator Component:**

```typescript
// src/components/loading-indicator.tsx
import * as React from "react";
import { useEffect } from "react";

interface IProps {
  message?: string;
}

// Inject keyframes once on first render
let keyframesInjected = false;
function injectKeyframes() {
  if (keyframesInjected) return;
  const style = document.createElement("style");
  style.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
  document.head.appendChild(style);
  keyframesInjected = true;
}

export const LoadingIndicator: React.FC<IProps> = ({ message = "Loading..." }) => {
  useEffect(() => {
    injectKeyframes();
  }, []);

  return (
    <div
      className="loading-indicator"
      role="status"
      aria-live="polite"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "200px",
        fontFamily: "sans-serif"
      }}
    >
      <div className="spinner" aria-hidden="true" style={{
        width: "32px",
        height: "32px",
        border: "3px solid #e0e0e0",
        borderTopColor: "#3498db",
        borderRadius: "50%",
        animation: "spin 1s linear infinite"
      }} />
      <p style={{ marginTop: "12px", color: "#666" }}>{message}</p>
    </div>
  );
};
```

```typescript
// Components can now access mode via stores
@inject("stores") @observer
class SomeComponent extends React.Component<IProps> {
  render() {
    const { mode } = this.props.stores.ui;

    if (mode === "report") {
      // Read-only behavior
    }

    // ...
  }
}
```

The key point is that `inIframe()` is called once at startup (not a hook, just a function), and determines which component tree to render. The LARA hooks are only present in the `LaraAppWrapper` component. The mode is stored in `UIModel` so any component can access it via the existing MobX stores pattern.

### 2. Auto Height

The application must communicate its height to the LARA host for proper iframe sizing.

#### 2.1 Implementation

The LARA API provides `setHeight()` for reporting height. We need a custom `useAutoHeight` hook that:
- Returns a callback ref to capture the container element after render
- Monitors a container element with ResizeObserver
- Can be disabled (e.g., during loading states)
- Reports height changes to LARA via `setHeight()`

**Why a callback ref?** A regular `useRef` returns `null` on the first render, and the ref value isn't captured until after the component mounts. By using a callback ref pattern with `useState`, we ensure the hook's effect re-runs when the container element becomes available.

```typescript
// src/hooks/use-auto-height.ts
import { useEffect, useRef, useState, useCallback } from "react";
import { setHeight } from "@concord-consortium/lara-interactive-api";

interface IUseAutoHeightOptions {
  disabled?: boolean;
}

/**
 * Hook that reports container height to the LARA/Activity Player host.
 * Returns a callback ref that should be attached to the container element.
 */
export const useAutoHeight = ({ disabled }: IUseAutoHeightOptions = {}) => {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const setHeightCalled = useRef(false);

  // Callback ref to capture the container element
  const containerRef = useCallback((node: HTMLDivElement | null) => {
    setContainer(node);
  }, []);

  useEffect(() => {
    if (disabled || !container) {
      // Sending empty string disables height and uses aspect ratio instead
      if (setHeightCalled.current) {
        setHeight("");
      }
      return;
    }

    // Set overflow hidden for accurate scrollHeight measurement
    const prevOverflow = container.style.overflow;
    container.style.overflow = "hidden";

    const observer = new ResizeObserver((entries) => {
      const height = entries[0]?.target.scrollHeight ?? 0;
      if (height > 0) {
        setHeight(Math.ceil(height));
        setHeightCalled.current = true;
      }
    });

    observer.observe(container);

    return () => {
      observer.disconnect();
      container.style.overflow = prevOverflow;
    };
  }, [container, disabled]);

  return containerRef;
};
```

#### 2.2 Usage in LaraAppWrapper

The `useAutoHeight` hook is used in `LaraAppWrapper` as shown in section 3.5. Key points:
- The hook returns a callback ref to attach to the container element
- Disable during loading state (before `initMessage` arrives)
- The hook automatically reports height changes to LARA

#### 2.3 Height Considerations

- The hook uses ResizeObserver to detect container size changes
- Height is reported via `setHeight(Math.ceil(height))`
- `overflow: hidden` is set temporarily for accurate `scrollHeight` measurement
- When disabled, sends empty string to revert to aspect ratio sizing
- The application should avoid fixed heights that prevent proper sizing

#### 2.4 Iframe Ready Signal

LARA/Activity Player sometimes waits for a specific signal before displaying the interactive to avoid layout shift. The `setHeight()` call serves as this "ready" signal.

**Important**: Ensure `setHeight()` is called at least once immediately after `initMessage` is processed, even if the height hasn't changed. This signals to the host that the interactive is ready to be shown.

The `useAutoHeight` hook handles this automatically via the ResizeObserver, which fires immediately when it starts observing. However, if the container isn't available yet (e.g., during conditional rendering), you may need to call `setHeight()` explicitly:

```typescript
// In LaraAppWrapper, after initMessage is processed
useEffect(() => {
  if (initMessage && containerRef.current) {
    // Ensure host knows we're ready by reporting initial height
    const height = containerRef.current.scrollHeight;
    if (height > 0) {
      setHeight(Math.ceil(height));
    }
  }
}, [initMessage]);
```

This is typically not needed if `useAutoHeight` is called with a valid container, but can be useful as a fallback for edge cases where the ResizeObserver doesn't fire immediately.

### 3. Interactive State Persistence

The application must save and restore its state when embedded in LARA/Activity Player contexts.

#### 3.1 State Migration

Before restoring state, it must be migrated to the current version. This handles legacy state formats and missing version fields:

```typescript
// src/models/interactive-state.ts

import { IHurricaneInteractiveState } from "../types";

const CURRENT_VERSION = 1;

/**
 * Migrates any saved state to the current version format.
 * Handles: missing version field, legacy formats, and future version upgrades.
 */
export function migrateState(state: unknown): IHurricaneInteractiveState | null {
  if (!state || typeof state !== "object") {
    return null;
  }

  const rawState = state as Record<string, unknown>;

  // Handle missing version field (legacy state from before versioning)
  if (!("version" in rawState)) {
    // Attempt to migrate legacy state
    return migrateLegacyState(rawState);
  }

  const version = rawState.version;

  // Already current version
  if (version === CURRENT_VERSION) {
    return state as IHurricaneInteractiveState;
  }

  // Future version migrations would go here:
  // if (version === 1) {
  //   return migrateV1ToV2(state as IHurricaneInteractiveStateV1);
  // }

  // Unknown version - log warning and return null to use defaults
  console.warn(`Unknown interactive state version: ${version}. Using defaults.`);
  return null;
}

/**
 * Attempts to migrate state saved before versioning was added.
 * Returns null if the state structure is unrecognizable.
 */
function migrateLegacyState(rawState: Record<string, unknown>): IHurricaneInteractiveState | null {
  // Check for recognizable structure
  if (!rawState.simulation && !rawState.ui) {
    return null;
  }

  // Add version field and return
  return {
    version: 1,
    simulation: rawState.simulation as IHurricaneInteractiveState["simulation"],
    ui: rawState.ui as IHurricaneInteractiveState["ui"]
  };
}
```

#### 3.2 State Restoration Functions

Create the state restoration logic in `src/models/interactive-state.ts`:

```typescript
import { runInAction, reaction } from "mobx";
import { IStores } from "./stores";
import { PressureSystem } from "./pressure-system";
import { IHurricaneInteractiveState } from "../types";

export function setInteractiveState(
  stores: IStores,
  state: IHurricaneInteractiveState | null
): void {
  if (!state) {
    return;
  }

  const { simulation, ui } = stores;
  const { simulation: simState, ui: uiState } = state;

  // Restore simulation state
  if (simState) {
    // Use runInAction to batch all MobX updates
    runInAction(() => {
      // Basic properties
      if (simState.season) {
        simulation.season = simState.season;
      }
      if (simState.startLocation) {
        simulation.startLocation = simState.startLocation;
      }

      // Pressure systems - recreate from serialized state
      if (simState.pressureSystems) {
        simulation.pressureSystems = simState.pressureSystems.map(
          ps => new PressureSystem(ps)
        );
      }

      // Simulation progress state
      simulation.simulationStarted = simState.simulationStarted ?? false;
      simulation.simulationFinished = simState.simulationFinished ?? false;

      // Track data - these are plain objects, safe to assign directly
      if (simState.hurricaneTrack) {
        simulation.hurricaneTrack = simState.hurricaneTrack.slice();
      }
      if (simState.landfalls) {
        simulation.landfalls = simState.landfalls.slice();
      }

      // Restore hurricane state if simulation was in progress
      if (simState.hurricane) {
        simulation.hurricane.center = { ...simState.hurricane.center };
        simulation.hurricane.strength = simState.hurricane.strength;
        if (simState.hurricane.speed) {
          simulation.hurricane.speed = { ...simState.hurricane.speed };
        }
      }

      // Restore additional simulation state needed for resumption
      if (simState.time !== undefined) {
        simulation.time = simState.time;
      }
      if (simState.strengthChangePositions) {
        simulation.strengthChangePositions = simState.strengthChangePositions.slice();
      }
      if (simState.precipitationPoints) {
        simulation.precipitationPoints = simState.precipitationPoints.slice();
      }
    });
  }

  // Restore UI state
  if (uiState) {
    runInAction(() => {
      if (uiState.baseMap) {
        ui.baseMap = uiState.baseMap;
      }
      if (uiState.overlay !== undefined) {
        ui.overlay = uiState.overlay;
      }
      if (uiState.windArrows !== undefined) {
        ui.windArrows = uiState.windArrows;
      }
      if (uiState.hurricaneImage !== undefined) {
        ui.hurricaneImage = uiState.hurricaneImage;
      }
      if (uiState.accessibleSSTScale !== undefined) {
        ui.accessibleSSTScale = uiState.accessibleSSTScale;
      }
      if (uiState.categoryChangeMarkers !== undefined) {
        ui.categoryChangeMarkers = uiState.categoryChangeMarkers;
      }
      if (uiState.thermometerActive !== undefined) {
        ui.thermometerActive = uiState.thermometerActive;
      }
      if (uiState.thermometerPositionSaved !== undefined) {
        ui.thermometerPositionSaved = uiState.thermometerPositionSaved;
      }
      if (uiState.zoomedInView !== undefined) {
        ui.zoomedInView = uiState.zoomedInView;
      }
    });
  }
}
```

#### 3.3 Interactive State Schema

The schema needs to include hurricane state and additional simulation state for proper restoration.

**Version Strategy**: The `version` field uses a literal type (e.g., `version: 1`) to enable TypeScript discrimination. When the schema changes:
1. Create a new interface with the new version number (e.g., `IHurricaneInteractiveStateV2`)
2. Create a union type: `type IHurricaneInteractiveState = IHurricaneInteractiveStateV1 | IHurricaneInteractiveStateV2`
3. Add migration logic in `migrateState` (section 3.1) to handle older versions

```typescript
interface IHurricaneInteractiveState {
  version: 1;
  simulation: ISimulationState;
  ui: IUIState;
}

interface ISimulationState {
  // Core settings
  season: Season;
  startLocation: StartLocation;
  pressureSystems: IPressureSystemState[];

  // Simulation progress
  simulationStarted: boolean;
  simulationFinished: boolean;
  time: number;

  // Hurricane state (for mid-simulation restore)
  hurricane: IHurricaneState;

  // Track data
  hurricaneTrack: ITrackPoint[];
  landfalls: ILandfall[];
  strengthChangePositions: number[];
  precipitationPoints: IPrecipitationPoint[];
}

interface IHurricaneState {
  center: ICoordinates;
  strength: number;
  speed: IVector;
}

interface IPressureSystemState {
  type: "high" | "low";
  center: ICoordinates;
  strength: number;
}

interface IUIState {
  baseMap: MapTilesName;
  overlay: Overlay | null;
  windArrows: boolean;
  hurricaneImage: boolean;
  accessibleSSTScale: boolean;
  categoryChangeMarkers: boolean;
  thermometerActive: boolean;
  thermometerPositionSaved: LatLngExpression | null;
  zoomedInView: ZoomedInViewProps;
}
```

#### 3.4 getInteractiveState

Use MobX's `toJS()` for arrays to ensure clean serialization without proxy objects:

```typescript
import { toJS } from "mobx";

// IMPORTANT: Do not add conditional access to observables in this function.
// MobX reactions rely on unconditional reads to track dependencies correctly.
// If you wrap observable access in conditionals (if statements), the reaction
// won't re-run when those observables change, breaking auto-save.
export function getInteractiveState(stores: IStores): IHurricaneInteractiveState {
  const { simulation, ui } = stores;

  return {
    version: 1,
    simulation: {
      season: simulation.season,
      startLocation: simulation.startLocation,
      pressureSystems: simulation.pressureSystems.map(ps => ps.serialize()),
      simulationStarted: simulation.simulationStarted,
      simulationFinished: simulation.simulationFinished,
      time: simulation.time,
      hurricane: {
        center: { ...simulation.hurricane.center },
        strength: simulation.hurricane.strength,
        speed: { ...simulation.hurricane.speed }
      },
      // Use toJS() for observable arrays to ensure clean serialization
      hurricaneTrack: toJS(simulation.hurricaneTrack),
      landfalls: toJS(simulation.landfalls),
      strengthChangePositions: toJS(simulation.strengthChangePositions),
      precipitationPoints: toJS(simulation.precipitationPoints)
    },
    ui: {
      baseMap: ui.baseMap,
      overlay: ui.overlay,
      windArrows: ui.windArrows,
      hurricaneImage: ui.hurricaneImage,
      accessibleSSTScale: ui.accessibleSSTScale,
      categoryChangeMarkers: ui.categoryChangeMarkers,
      thermometerActive: ui.thermometerActive,
      thermometerPositionSaved: ui.thermometerPositionSaved,
      zoomedInView: ui.zoomedInView
    }
  };
}
```

#### 3.5 Complete LaraAppWrapper Implementation

This is the canonical complete implementation of `LaraAppWrapper` that integrates all LARA API features.

**Two-component pattern:** The implementation is split into two components to avoid a conflict between `mobx-react`'s `observer` HOC and React hooks. In `mobx-react` 5.x, the `observer` HOC converts functional components to class components internally, which breaks React hooks. The solution is:

1. **`LaraAppWrapper`** (outer) - Functional component that uses all React hooks. NOT wrapped with `observer`.
2. **`LaraAppContent`** (inner) - Component wrapped with `observer` for MobX reactivity. Receives all data via props, no hooks.

```typescript
// src/components/lara-app-wrapper.tsx
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
      <AuthoringInterface
        authoredState={authoredState}
        setAuthoredState={setAuthoredState}
      />
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

  // Apply authored state once on mount (only in runtime/report mode).
  // Authored state establishes initial defaults only; any restored interactive
  // state always takes precedence (applied in the next useEffect).
  // Must come BEFORE conditional returns to comply with Rules of Hooks.
  useEffect(() => {
    if (initMessage && stores.ui.mode !== "authoring" && authoredState) {
      applyAuthoredState(authoredState);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once on mount
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
```

**Container styling (lara-app-wrapper.scss):**

The container needs an explicit `height` (not just `min-height`) because child components use `height: 100%` which doesn't inherit from `min-height`.

```scss
// src/components/lara-app-wrapper.scss
.laraAppContainer {
  // In iframe mode, the app needs an explicit height since child elements
  // use height: 100% which doesn't work with min-height.
  // This matches the min-height in app.scss
  height: 618px;
  min-width: 831px;
}
```

#### 3.6 Important Considerations

1. **One-time restoration**: Use a ref (`hasRestoredState`) to ensure state is only restored once on initial load, not on every re-render.

2. **Debounced saving**: Use MobX `reaction` with a delay to avoid excessive state saves during rapid changes (e.g., during simulation playback).

3. **Deep copying**: Use `toJS()` from MobX for observable arrays to ensure clean serialization without proxy objects.

4. **Null checks**: The restored state may have missing fields (e.g., from older versions), so check each field before applying.

5. **runInAction**: Batch all MobX updates in `runInAction` for better performance and to avoid intermediate renders.

6. **Reaction disposal**: Always return the disposer from `useEffect` cleanup to prevent memory leaks when the component unmounts.

7. **Observable property requirements**: All properties being restored in `setInteractiveState` must be decorated with `@observable` in their respective models for reactivity to work correctly.

   **SimulationModel** - Verified ✅ (all have `@observable`):
   - `season` ✅ (line 215)
   - `startLocation` ✅ (line 213)
   - `simulationStarted` ✅ (line 227)
   - `simulationFinished` ✅ (line 219)
   - `hurricaneTrack` ✅ (line 212)
   - `landfalls` ✅ (line 230)
   - `pressureSystems` ✅ (line 221)
   - `strengthChangePositions` ✅ (line 229)
   - `precipitationPoints` ✅ (line 217)
   - `time` ⚠️ NOT observable (line 232) - saves won't trigger on time changes alone

   **UIModel** - Verified ✅ (all have `@observable`):
   - `baseMap` ✅ (line 68)
   - `overlay` ✅ (line 69)
   - `windArrows` ✅ (line 64)
   - `hurricaneImage` ✅ (line 65)
   - `accessibleSSTScale` ✅ (line 70)
   - `categoryChangeMarkers` ✅ (line 71)
   - `thermometerActive` ✅ (line 72)
   - `thermometerPositionSaved` ✅ (line 73)
   - `zoomedInView` ✅ (line 59)

   **Note**: `simulation.time` is not observable, so changes to time alone won't trigger auto-save. This is acceptable because time changes are always accompanied by other observable changes (track points, hurricane position, etc.).

8. **Unconditional observable access**: The `getInteractiveState` function must access all tracked observables unconditionally (not inside if statements) for the MobX reaction to properly track dependencies.

9. **Hurricane state**: The hurricane's position, strength, and speed must be saved/restored for mid-simulation resumption.

10. **Mid-simulation restoration behavior**: When a student returns to a simulation that was mid-run (i.e., `simulationStarted === true` and `simulationFinished === false`), the simulation is restored in a **paused state**. The `setInteractiveState` function sets `simulationStarted` but the simulation timer is not automatically resumed. This gives students a moment to orient themselves before continuing. They can press the play button to resume from where they left off.

    **User guidance**: Show a brief tooltip or message when restoring a paused mid-simulation state: "Your simulation was paused. Press play to continue." This helps students understand why the hurricane isn't moving and what action to take.

11. **Non-observable state**: Some simulation state like `time`, `numberOfStepsOverSea`, etc. are not observable but may need restoration for accurate resumption. Consider which are essential.

12. **State application order**: Authored state establishes initial defaults only; any restored interactive state always takes precedence. This means if an author sets `season=fall` but the student's saved state has `season=winter`, the student will see winter. This is the correct behavior—student work should never be overwritten by authored defaults.

### 4. Report Mode UI Behavior

When the application is in `report` mode, all controls that could modify simulation state must be disabled. The report mode shows a read-only view of the student's saved work.

#### 4.1 Controls to Disable in Report Mode

The following controls should be disabled when `stores.ui.mode === "report"`:

| Component | Control | Reason |
|-----------|---------|--------|
| `BottomBar` | Start/Stop button | Cannot run simulation |
| `BottomBar` | Restart button | Cannot restart simulation |
| `BottomBar` | Reload button | Cannot reset simulation |
| `BottomBar` | Season button | Cannot change season |
| `BottomBar` | Start Location button | Cannot change start location |
| `PressureSystemMarker` | Drag to move | Cannot reposition pressure systems |
| `PressureSystemIcon` | Strength slider | Cannot change pressure system strength |

#### 4.2 Controls to Keep Enabled in Report Mode

These controls only affect the view, not the simulation state, so they can remain enabled:

| Component | Control | Reason |
|-----------|---------|--------|
| `BottomBar` | Wind Arrows toggle | View-only setting |
| `BottomBar` | Hurricane Image toggle | View-only setting |
| `BottomBar` | Thermometer button | View-only tool |
| `RightPanel` | Base map selector | View-only setting |
| `RightPanel` | Overlay selector | View-only setting |
| `MapView` | Pan/zoom | View-only interaction |
| Fullscreen toggle | Toggle fullscreen | View-only setting |

#### 4.3 Implementation

Add a computed property to UIModel for convenience:

```typescript
// src/models/ui.ts
export class UIModel {
  @observable public mode: InteractiveMode = "runtime";

  @computed public get isReportMode(): boolean {
    return this.mode === "report";
  }

  // ... existing properties
}
```

Update components to check report mode. Example for `BottomBar`:

```typescript
// src/components/bottom-bar.tsx
@inject("stores")
@observer
export class BottomBar extends BaseComponent<IProps, IState> {
  public render() {
    const sim = this.stores.simulation;
    const ui = this.stores.ui;

    // Disable simulation controls in report mode
    const isReportMode = ui.isReportMode;
    const startLocationButtonDisabled = isReportMode ||
      (config.lockSimulationWhileRunning && sim.simulationStarted);
    const seasonButtonDisabled = isReportMode ||
      (config.lockSimulationWhileRunning && sim.simulationStarted);
    const simulationControlsDisabled = isReportMode;

    return (
      <div className={css.bottomBar}>
        {/* ... */}
        <Button
          onClick={this.handleStartStop}
          disabled={!sim.ready || simulationControlsDisabled}
          // ...
        >
          {/* ... */}
        </Button>
        <Button
          disabled={simulationControlsDisabled}
          onClick={this.handleRestart}
          // ...
        >
          Restart
        </Button>
        <Button
          disabled={simulationControlsDisabled}
          onClick={this.handleReload}
          // ...
        >
          Reload
        </Button>
        {/* ... */}
      </div>
    );
  }
}
```

Example for `PressureSystemMarker`:

```typescript
// src/components/pressure-system-marker.tsx
@inject("stores")
@observer
export class PressureSystemMarker extends BaseComponent<IProps, IState> {
  public render() {
    const { model } = this.props;
    const { sliderDrag } = this.state;
    const sim = this.stores.simulation;
    const ui = this.stores.ui;

    // Disable in report mode
    const uiDisabled = ui.isReportMode ||
      config.pressureSystemsLocked ||
      ui.thermometerActive ||
      (config.lockSimulationWhileRunning && sim.simulationStarted);

    return (
      <LeafletCustomMarker
        position={model.center}
        onDrag={this.handlePressureSysDrag}
        onDragEnd={this.handlePressureSysDragEnd}
        draggable={!sliderDrag && !uiDisabled}
      >
        <PressureSystemIcon
          model={model}
          disabled={uiDisabled}
          onSliderDrag={this.handleDrag}
          onSliderDragEnd={this.handleDragEnd}
        />
      </LeafletCustomMarker>
    );
  }
}
```

#### 4.4 Visual Indication

Consider adding visual indication that the simulation is in report mode:
- Disabled buttons should appear grayed out (Material-UI handles this automatically)
- Optionally add a "Report View" label or badge to indicate read-only state

### 5. Authored State Support

Teachers can configure initial simulation parameters through the LARA authoring interface. Rather than building a complex custom authoring UI, we leverage the existing URL parameter system by allowing authors to enter URL parameters directly.

#### 5.1 Authored State Schema

The authored state is intentionally simple - just a version number and a string containing URL parameters:

```typescript
interface IHurricaneAuthoredState {
  version: 1;
  urlParams?: string;  // URL parameters in query string format: key1=value1&key2=value2
}
```

#### 5.2 URL Parameters Format

The `urlParams` field is stored in standard query string format:

```
season=fall&startLocation=atlantic&windArrows=true&lockSimulationWhileRunning=true
```

The authoring interface accepts flexible input (query string or newline-separated key=value pairs) but normalizes to query string format when saving.

#### 5.3 Authoring Interface

When in authoring mode (`mode === "authoring"`), display a simple authoring interface with inline parameter documentation, validation with suggestions, preview capability, and save confirmation feedback:

```typescript
// src/components/authoring-interface.tsx
import * as React from "react";
import { useState, useCallback } from "react";
import { IHurricaneAuthoredState } from "../types/interactive-state";
import { parseAuthoredUrlParams, validateUrlParams, KNOWN_PARAMETERS } from "../utils/parse-authored-params";

interface IProps {
  authoredState: IHurricaneAuthoredState | null;
  setAuthoredState: (state: IHurricaneAuthoredState) => void;
}

export const AuthoringInterface: React.FC<IProps> = ({ authoredState, setAuthoredState }) => {
  const [urlParams, setUrlParams] = useState(authoredState?.urlParams ?? "");
  const [validationResult, setValidationResult] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  const [showDocs, setShowDocs] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved">("idle");

  const handleValidate = useCallback(() => {
    const result = validateUrlParams(urlParams);
    if (result.valid) {
      setValidationResult({
        type: "success",
        message: `✓ Valid configuration with ${Object.keys(result.params).length} parameter(s):\n${JSON.stringify(result.params, null, 2)}`
      });
    } else {
      setValidationResult({
        type: "error",
        message: result.errors.join("\n")
      });
    }
  }, [urlParams]);

  const handleSave = useCallback(() => {
    // Normalize to query string format before saving
    const { params } = parseAuthoredUrlParams(urlParams);
    const normalizedUrlParams = Object.entries(params)
      .map(([key, value]) => `${key}=${value}`)
      .join("&");

    setAuthoredState({
      version: 1,
      urlParams: normalizedUrlParams || undefined
    });

    setSaveStatus("saved");
    setValidationResult({
      type: "info",
      message: "✓ Configuration saved successfully!"
    });

    // Reset save status after 3 seconds
    setTimeout(() => setSaveStatus("idle"), 3000);
  }, [urlParams, setAuthoredState]);

  return (
    <div className="authoring-interface" role="main" aria-labelledby="authoring-title">
      <h2 id="authoring-title">Hurricane Model Configuration</h2>
      <p id="authoring-description">
        Enter URL parameters to configure the simulation. Use query string format
        (key=value&key2=value2) or newline-separated key=value pairs.
      </p>

      {/* Collapsible Parameter Documentation */}
      <details open={showDocs} onToggle={(e) => setShowDocs((e.target as HTMLDetailsElement).open)}>
        <summary style={{ cursor: "pointer", fontWeight: "bold", marginBottom: "8px" }}>
          📖 Available Parameters Reference
        </summary>
        <div className="parameter-docs" style={{
          maxHeight: "300px",
          overflow: "auto",
          border: "1px solid #ccc",
          padding: "12px",
          marginBottom: "12px",
          fontSize: "0.9em"
        }}>
          <table role="table" aria-label="Available configuration parameters">
            <thead>
              <tr>
                <th scope="col">Parameter</th>
                <th scope="col">Type</th>
                <th scope="col">Valid Values</th>
                <th scope="col">Description</th>
              </tr>
            </thead>
            <tbody>
              {KNOWN_PARAMETERS.map(param => (
                <tr key={param.name}>
                  <td><code>{param.name}</code></td>
                  <td>{param.type}</td>
                  <td>{param.validValues || "—"}</td>
                  <td>{param.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <label htmlFor="params-input" className="visually-hidden">
        Configuration parameters
      </label>
      <textarea
        id="params-input"
        aria-describedby="authoring-description"
        value={urlParams}
        onChange={(e) => {
          setUrlParams(e.target.value);
          setSaveStatus("idle");
        }}
        placeholder="season=fall&#10;startLocation=atlantic&#10;windArrows=true"
        rows={10}
        cols={50}
        style={{ width: "100%", fontFamily: "monospace" }}
      />

      <div className="button-row" style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
        <button onClick={handleValidate} aria-label="Validate parameters">
          Validate
        </button>
        <button
          onClick={handleSave}
          aria-label="Save configuration"
          style={{ fontWeight: saveStatus === "saved" ? "bold" : "normal" }}
        >
          {saveStatus === "saved" ? "✓ Saved" : "Save"}
        </button>
      </div>

      <p style={{ fontSize: "0.85em", color: "#666", marginTop: "8px" }}>
        <em>Note: Use LARA's built-in "Preview" button to test your configuration.</em>
      </p>

      {validationResult && (
        <div
          role={validationResult.type === "error" ? "alert" : "status"}
          aria-live="polite"
          className={`validation-result validation-${validationResult.type}`}
          style={{
            marginTop: "12px",
            padding: "12px",
            borderRadius: "4px",
            whiteSpace: "pre-wrap",
            fontFamily: "monospace",
            fontSize: "0.9em",
            backgroundColor: validationResult.type === "error" ? "#ffe6e6"
              : validationResult.type === "success" ? "#e6ffe6"
              : "#e6f3ff",
            border: `1px solid ${validationResult.type === "error" ? "#cc0000"
              : validationResult.type === "success" ? "#00cc00"
              : "#0066cc"}`
          }}
        >
          {validationResult.message}
        </div>
      )}
    </div>
  );
};
```

#### 5.4 URL Parameter Parsing

Create a utility to parse the flexible URL params format with comprehensive parameter documentation:

```typescript
// src/utils/parse-authored-params.ts

interface IParseResult {
  valid: boolean;
  params: Record<string, string>;
  errors: string[];
}

interface IParameterDoc {
  name: string;
  type: "string" | "boolean" | "number" | "array";
  validValues?: string;
  description: string;
}

/**
 * Comprehensive documentation of all available configuration parameters.
 * This is used both for validation and for the authoring interface documentation.
 */
export const KNOWN_PARAMETERS: IParameterDoc[] = [
  // Core simulation settings
  { name: "season", type: "string", validValues: "fall, winter, spring, summer", description: "Sets wind data patterns" },
  { name: "startLocation", type: "string", validValues: "atlantic, gulf", description: "Hurricane starting position" },

  // Map settings
  { name: "map", type: "string", validValues: "satellite, relief, street, population", description: "Base map type" },
  { name: "overlay", type: "string", validValues: "sst, precipitation, stormSurge", description: "Active map overlay" },
  { name: "availableOverlays", type: "array", validValues: "[sst,precipitation,stormSurge]", description: "Overlays available to user" },
  { name: "enablePopulationMap", type: "boolean", validValues: "true, false", description: "Enable population base map option" },
  { name: "navigation", type: "boolean", validValues: "true, false", description: "Allow map pan/zoom" },

  // Hurricane display
  { name: "windArrows", type: "boolean", validValues: "true, false", description: "Show wind direction arrows" },
  { name: "hurricaneImage", type: "boolean", validValues: "true, false", description: "Show hurricane satellite image" },
  { name: "categoryChangeMarkers", type: "boolean", validValues: "true, false", description: "Show category change markers on track" },
  { name: "markLandfalls", type: "boolean", validValues: "true, false", description: "Show clickable landfall markers" },

  // Interaction controls
  { name: "pressureSystemsLocked", type: "boolean", validValues: "true, false", description: "Prevent moving pressure systems" },
  { name: "lockSimulationWhileRunning", type: "boolean", validValues: "true, false", description: "Lock controls during simulation" },

  // UI visibility
  { name: "startLocationButton", type: "boolean", validValues: "true, false", description: "Show start location button" },
  { name: "seasonButton", type: "boolean", validValues: "true, false", description: "Show season button" },
  { name: "windArrowsToggle", type: "boolean", validValues: "true, false", description: "Show wind arrows toggle" },
  { name: "hurricaneImageToggle", type: "boolean", validValues: "true, false", description: "Show hurricane image toggle" },

  // Advanced settings (less commonly used)
  { name: "timestep", type: "number", validValues: "positive number", description: "Simulation time step" },
  { name: "deterministic", type: "boolean", validValues: "true, false", description: "Make simulation results reproducible" },
  { name: "seaSurfaceTempOpacity", type: "number", validValues: "0-1", description: "SST overlay opacity" },
  { name: "defaultSSTScale", type: "string", validValues: "default, rainbowCC", description: "Default SST color scale" },
  { name: "accessibleSSTScale", type: "string", validValues: "purple3, purpleCC", description: "Accessible SST color scale" },
];

// Build a map for quick lookup
const KNOWN_PARAM_MAP = new Map(KNOWN_PARAMETERS.map(p => [p.name, p]));

// Helper to find similar parameter names for suggestions
function findSimilarParams(unknown: string): string[] {
  const lower = unknown.toLowerCase();
  return KNOWN_PARAMETERS
    .filter(p => p.name.toLowerCase().includes(lower) || lower.includes(p.name.toLowerCase().slice(0, 4)))
    .map(p => p.name)
    .slice(0, 3);
}

export function parseAuthoredUrlParams(urlParams: string | undefined): IParseResult {
  if (!urlParams || !urlParams.trim()) {
    return { valid: true, params: {}, errors: [] };
  }

  const params: Record<string, string> = {};
  const errors: string[] = [];

  // Split by newlines first, then process each line
  const lines = urlParams.split(/\n/).map(line => line.trim()).filter(Boolean);

  for (const line of lines) {
    // Each line can be a query string (key=value&key2=value2) or a single key=value
    const pairs = line.split("&").map(p => p.trim()).filter(Boolean);

    for (const pair of pairs) {
      const eqIndex = pair.indexOf("=");
      if (eqIndex === -1) {
        errors.push(`Invalid parameter (no '='): "${pair}"`);
        continue;
      }

      const key = pair.substring(0, eqIndex).trim();
      const value = pair.substring(eqIndex + 1).trim();

      if (!key) {
        errors.push(`Empty key in: "${pair}"`);
        continue;
      }

      params[key] = value;
    }
  }

  return {
    valid: errors.length === 0,
    params,
    errors
  };
}

export function validateUrlParams(urlParams: string): IParseResult {
  const result = parseAuthoredUrlParams(urlParams);

  // Validate each parameter against known parameters
  for (const [key, value] of Object.entries(result.params)) {
    const paramDoc = KNOWN_PARAM_MAP.get(key);

    if (!paramDoc) {
      // Unknown parameter - suggest similar ones
      const similar = findSimilarParams(key);
      let errorMsg = `Unknown parameter: "${key}"`;
      if (similar.length > 0) {
        errorMsg += `. Did you mean: ${similar.join(", ")}?`;
      }
      result.errors.push(errorMsg);
      continue;
    }

    // Type-specific validation
    if (paramDoc.type === "boolean" && !["true", "false"].includes(value.toLowerCase())) {
      result.errors.push(`Parameter "${key}" expects true or false, got: "${value}"`);
    }

    if (paramDoc.type === "number" && isNaN(parseFloat(value))) {
      result.errors.push(`Parameter "${key}" expects a number, got: "${value}"`);
    }

    // Validate against known valid values (for string enums)
    if (paramDoc.type === "string" && paramDoc.validValues && !paramDoc.validValues.includes(",")) {
      // Skip if validValues is not an enumeration (e.g., "positive number")
    } else if (paramDoc.type === "string" && paramDoc.validValues) {
      const validOptions = paramDoc.validValues.split(",").map(v => v.trim());
      if (!validOptions.includes(value)) {
        result.errors.push(`Parameter "${key}" must be one of: ${paramDoc.validValues}. Got: "${value}"`);
      }
    }
  }

  result.valid = result.errors.length === 0;
  return result;
}
```

#### 5.5 Applying Authored State at Runtime

In runtime mode, the authored `urlParams` are parsed and applied to the config:

```typescript
// In LaraAppWrapper or config initialization
import { parseAuthoredUrlParams } from "../utils/parse-authored-params";

function applyAuthoredState(authoredState: IHurricaneAuthoredState | null) {
  if (!authoredState?.urlParams) {
    return;
  }

  const { params } = parseAuthoredUrlParams(authoredState.urlParams);

  // Apply each param to config (similar to how URL params are applied)
  for (const [key, value] of Object.entries(params)) {
    applyConfigParam(key, value);
  }
}

function applyConfigParam(key: string, value: string) {
  // Use the same logic as existing URL parameter handling
  // This ensures consistent behavior between URL params and authored params
  switch (key) {
    case "season":
      config.season = value as Season;
      break;
    case "startLocation":
      config.startLocation = value as StartLocation;
      break;
    case "windArrows":
      config.windArrows = value === "true";
      break;
    // ... handle other parameters
  }
}
```

#### 5.6 Configuration Priority

Configuration priority (highest to lowest):
1. Actual URL parameters (for debugging and overrides)
2. Authored state `urlParams` (from LARA)
3. Default config values

This means actual URL params can still override authored settings, which is useful for testing and debugging.

#### 5.7 Deprecation Strategy

When URL parameters are deprecated or renamed in future versions:

1. **Deprecated parameters will continue to work** with a console warning. This ensures existing authored configurations don't silently break.

2. **Auto-migration when possible**: If a parameter is renamed (e.g., `startLocation` → `hurricaneStartPosition`), the old name will be automatically mapped to the new name during parsing.

3. **Validation warnings**: The authoring interface will flag deprecated parameters with a warning (not an error), suggesting the updated parameter name.

4. **Removal timeline**: Parameters will be supported for at least 2 major versions after deprecation before removal. Removal will be documented in release notes.

Example handling in `parseAuthoredUrlParams`:

```typescript
const DEPRECATED_PARAMS: Record<string, string> = {
  // oldName: newName (or null if removed without replacement)
  // "oldParam": "newParam",
};

// In parsing logic:
if (DEPRECATED_PARAMS[key]) {
  console.warn(`Parameter "${key}" is deprecated. Use "${DEPRECATED_PARAMS[key]}" instead.`);
  key = DEPRECATED_PARAMS[key]; // Auto-migrate
}
```

#### 5.8 Integration in LaraAppWrapper

The authored state integration is part of the complete `LaraAppWrapper` component. The key additions for authored state support are:

1. **Hook usage**: Add `useAuthoredState<IHurricaneAuthoredState>()` to get authored state and setter
2. **Apply on mount**: In a `useEffect`, call `applyAuthoredState(authoredState)` for runtime/report modes
3. **Authoring mode branch**: When `mode === "authoring"`, render the `AuthoringInterface` instead of `AppComponent`

See section 3.5 for the complete `LaraAppWrapper` implementation. The authoring-specific additions are:

```typescript
// Add to LaraAppWrapper (see section 3.5 for full context)
const { authoredState, setAuthoredState } = useAuthoredState<IHurricaneAuthoredState>();

// Apply authored state once on mount (only in runtime/report mode)
// This useEffect must come BEFORE any conditional returns to comply with Rules of Hooks
useEffect(() => {
  if (stores.ui.mode !== "authoring" && authoredState) {
    applyAuthoredState(authoredState);
  }
}, []);

// In authoring mode, show the authoring interface instead of the app
if (stores.ui.mode === "authoring") {
  return (
    <AuthoringInterface
      authoredState={authoredState}
      setAuthoredState={setAuthoredState}
    />
  );
}
```

### 6. Supported Features Declaration

Declare supported features using `setSupportedFeatures`:

```typescript
import { setSupportedFeatures } from "@concord-consortium/lara-interactive-api";

setSupportedFeatures({
  interactiveState: true,
  authoredState: true
});
```

### 7. Event Logging

#### 7.1 Current Log Events

The application already logs these events:
- `FullscreenEnabled` / `FullscreenDisabled`
- `SimulationStopped` / `SimulationStarted` / `SimulationRestarted` / `SimulationReloaded`
- `ThermometerEnabled` / `ThermometerDisabled`
- `SeasonChanged` (with season parameter)
- `MapChanged` (with map type)
- `OverlayChanged` (with overlay type)
- `WindArrowsEnabled` / `WindArrowsDisabled`
- `HurricaneImageEnabled` / `HurricaneImageDisabled`
- `PressureSystemMoved`
- `StartLocationChanged`

#### 7.2 Enhanced Logging (Optional)

Update log calls to include structured data:

```typescript
log("SimulationStarted", {
  season: simulation.season,
  startLocation: simulation.startLocation,
  pressureSystemCount: simulation.pressureSystems.length
});

log("SimulationFinished", {
  duration: simulation.time,
  maxCategory: Math.max(...simulation.hurricaneTrack.map(t => t.category)),
  landfallCount: simulation.landfalls.length
});
```

### 8. Implementation Plan

#### Phase 1: Core Hooks Integration
1. Add `useInitMessage` hook to detect mode and get initial state
2. Create custom `useAutoHeight` hook for proper iframe sizing
3. Add `useInteractiveState` hook for state persistence
4. Add `useAuthoredState` hook for authoring support

#### Phase 2: State Management
1. Create `src/models/interactive-state.ts` with serialization/deserialization functions
2. Add type definitions to `src/types.ts`
3. Create unit tests for state serialization

#### Phase 3: Mode-Based Behavior
1. Implement mode detection in main App component
2. Add conditional rendering/disabling based on mode
3. Handle report mode (read-only display)

#### Phase 4: Integration & Testing
1. Test in Activity Player environment
2. Verify state persistence in student workflow
3. Test authoring workflow

### 9. Files to Create/Modify

#### New Files
- `src/models/interactive-state.ts` - State serialization logic (`setInteractiveState`, `getInteractiveState`, `migrateState`)
- `src/types/interactive-state.ts` - TypeScript interfaces (or add to existing types.ts)
- `src/hooks/use-auto-height.ts` - Custom auto-height hook (returns callback ref)
- `src/components/lara-app-wrapper.tsx` - LARA API wrapper component (section 3.5)
- `src/components/lara-app-wrapper.scss` - Container styles for iframe mode (explicit height)
- `src/components/loading-indicator.tsx` - Loading state component with spinner
- `src/components/authoring-interface.tsx` - Authoring mode UI component
- `src/components/authoring-interface.scss` - Styles for authoring interface
- `src/utils/parse-authored-params.ts` - URL parameter parsing and validation utility
- `src/utils/apply-authored-state.ts` - Apply authored state to config (section 5.5)

#### Modified Files
- `src/components/app.tsx` - Add LARA hooks integration
- `src/index.tsx` - Call `setSupportedFeatures`
- `src/models/stores.ts` - Add state restoration methods
- `src/models/simulation.ts` - Add setState method for restoration
- `src/models/ui.ts` - Add setState method for restoration
- `src/config.ts` - Support authored state integration

### 10. Testing Requirements

#### Unit Tests
- State serialization produces valid JSON
- State deserialization correctly restores all model properties
- Version migration handles older state formats
- `migrateState` handles missing version field (legacy state)
- `migrateState` returns null for unrecognizable state structure
- `migrateState` passes through current version state unchanged
- Invalid state is handled gracefully
- URL parameter parsing handles query string format
- URL parameter parsing handles newline-separated format
- URL parameter parsing handles combined format
- URL parameter validation detects unknown keys
- Empty `urlParams` string is handled as no-op
- Deprecated parameter auto-migration maps old names to new names
- Deprecated parameters trigger console warning but still work
- Partial state restoration (some fields missing) works correctly
- State with simulation running vs. paused restores correctly
- `inIframe()` can be mocked for testing both iframe and standalone modes
- Very large state (1000+ track points) serializes/deserializes within 100ms

#### Integration Tests
- Interactive state persists across page reloads (in LARA context)
- Authored state correctly configures initial simulation
- Auto-height reports correct values
- Auto-height signals ready to host immediately after initMessage
- Authored `urlParams` are applied to config at runtime
- State persists correctly when user navigates away mid-simulation
- Authored state sets initial config, interactive state overrides on restore
- Report mode with missing interactive state shows appropriate error/fallback
- Standalone mode (not in iframe) works without errors
- State restoration failure is handled gracefully (partial restore or fresh start)
- No "double-save" race condition: state is not saved before restore completes

#### Manual Testing
- Test in Activity Player environment
- Verify state persistence in student workflow
- Test authoring workflow in LARA
- Verify authoring interface validates and saves parameters correctly
- Verify correct behavior in report mode
- Test on slow network connections (throttle in dev tools)
- Test with browser dev tools simulating offline mode
- Test iframe resizing behavior when content changes
- Test with multiple browser tabs open to same activity
- Test state save during rapid simulation playback
- Verify report mode visual indicator is visible and clear

#### Accessibility Testing
- Authoring interface is keyboard navigable (Tab through all controls)
- Screen reader announces validation errors and save confirmation
- Loading indicator has appropriate ARIA attributes (`role="status"`, `aria-live="polite"`)
- Report mode disabled controls are announced as disabled by screen readers
- Focus management after mode transitions (e.g., after loading completes)

### 11. Error Handling

#### Technical Error Handling
- Invalid state should log warning and fall back to defaults
- Missing LARA context (standalone mode) should not break the application
- Version mismatches should attempt migration or use defaults
- All hooks should handle null/undefined gracefully
- Partial state restoration failure should not prevent app from loading

#### User-Facing Error Behavior

| Scenario | User Experience |
|----------|-----------------|
| State restoration fails completely | Show message: "We couldn't restore your previous work. Starting fresh." with option to retry |
| State restoration fails partially | Restore what's possible, show subtle message: "Some settings from your previous session couldn't be restored" |
| State save fails | Log error silently, retry on next change. If persistent, show subtle warning: "Having trouble saving your work" |
| Old state version | Migrate silently if possible. If not, show: "Your previous work was from an older version and couldn't be fully restored" |
| Report mode with missing state | Show message: "No submitted work found for this activity" |

#### Retry Mechanisms
- State save: Automatic retry with exponential backoff (500ms, 1s, 2s)
- State restore: Manual retry button shown to user on failure
- No retry for iframe detection (one-time check at startup)

### 12. Backwards Compatibility

- Application must continue to work standalone (outside LARA)
- URL parameters remain functional for direct linking
- Existing log events continue to work

## Appendix A: LARA Interactive API Reference

Key exports from `@concord-consortium/lara-interactive-api`:

```typescript
// Iframe detection
inIframe(): boolean

// Hooks (only use when inIframe() returns true)
useInitMessage<InteractiveState, AuthoredState, GlobalInteractiveState>(): IInitInteractive | null
useInteractiveState<InteractiveState>(): { interactiveState, setInteractiveState }
useAuthoredState<AuthoredState>(): { authoredState, setAuthoredState }

// Direct API functions
setSupportedFeatures(features: ISupportedFeatures): void
setHeight(height: number | string): void  // Used by custom useAutoHeight hook
log(action: string, data?: object): void  // Safe to call even when not in iframe (no-op)

// Types
type InitInteractiveMode = "runtime" | "authoring" | "report" | "reportItem"

interface ISupportedFeatures {
  aspectRatio?: number;
  authoredState?: boolean;
  interactiveState?: boolean;
}
```

## Appendix B: Example State JSON

### Interactive State (student work)

```json
{
  "version": 1,
  "simulation": {
    "season": "fall",
    "startLocation": "atlantic",
    "pressureSystems": [
      {
        "type": "high",
        "center": { "lat": 35, "lng": -40 },
        "strength": 15
      }
    ],
    "simulationStarted": true,
    "simulationFinished": false,
    "hurricaneTrack": [
      { "position": { "lat": 10.5, "lng": -20 }, "category": 1 },
      { "position": { "lat": 12.3, "lng": -25.4 }, "category": 2 }
    ],
    "landfalls": []
  },
  "ui": {
    "baseMap": "satellite",
    "overlay": "sst",
    "windArrows": true,
    "hurricaneImage": true,
    "accessibleSSTScale": false,
    "categoryChangeMarkers": true,
    "thermometerActive": false,
    "thermometerPositionSaved": null,
    "zoomedInView": false
  }
}
```

### Authored State (teacher configuration)

```json
{
  "version": 1,
  "urlParams": "season=fall&startLocation=atlantic&lockSimulationWhileRunning=true&availableOverlays=sst,precipitation"
}
```

## Appendix C: InitMessage Structure

When in runtime mode, `useInitMessage` returns:

```typescript
interface IRuntimeInitInteractive {
  version: 1;
  mode: "runtime";
  interactiveState: IHurricaneInteractiveState | null;
  authoredState: IHurricaneAuthoredState | null;
  hostFeatures: IHostFeatures;
  // ... additional fields
}
```

When in authoring mode:

```typescript
interface IAuthoringInitInteractive {
  version: 1;
  mode: "authoring";
  authoredState: IHurricaneAuthoredState | null;
  hostFeatures: IHostFeatures;
  // ... additional fields
}
```

When in report mode:

```typescript
interface IReportInitInteractive {
  version: 1;
  mode: "report";
  interactiveState: IHurricaneInteractiveState;
  authoredState: IHurricaneAuthoredState;
  // ... additional fields
}
```

---

## Appendix D: Spec Review

### Review Roles

The following roles were used to review this specification. Re-run reviews using these same roles when the spec is updated:

1. **React/TypeScript Developer** - Hook usage patterns, React rules compliance, TypeScript type definitions, component structure
2. **MobX Expert** - State management patterns, reaction usage, runInAction batching, observable/computed usage
3. **QA Engineer** - Testing requirements completeness, edge cases, error scenarios
4. **Curriculum Author/Teacher** - Authoring interface usability, whether URL params approach is practical for non-technical users
5. **Student Experience Reviewer** - State restoration UX, report mode behavior, what students see when returning to work

---

### Review: React/TypeScript Developer ✅

**Verified:**
- Correct use of conditional component rendering (`{isIframed ? <LaraAppWrapper stores={stores} /> : <AppComponent />}`) to avoid violating Rules of Hooks
- Proper use of `useRef` for one-time state restoration flag
- TypeScript interfaces are well-defined with clear structure
- `useEffect` hooks are correctly ordered before conditional returns
- Single canonical `LaraAppWrapper` implementation in section 3.5 with proper cross-references
- Consistent function naming (`migrateState`, `setInteractiveState`, `getInteractiveState`)
- State migration function handles legacy/unversioned state gracefully (section 3.1)
- Race condition prevention: saves are blocked until restore completes (section 3.5)
- Iframe ready signal documented to prevent layout shift (section 2.4)

**Resolved:**
- ✅ `LoadingIndicator` now injects `@keyframes spin` CSS rule dynamically
- ✅ `useEffect` dependency arrays include eslint-disable comments explaining stable references
- ✅ Two-component pattern (LaraAppWrapper + LaraAppContent) avoids mobx-react 5.x observer/hooks conflict
- ✅ Stores passed as prop instead of useStores hook (mobx-react 5.x doesn't export MobXProviderContext)
- ✅ useAutoHeight uses callback ref pattern to properly capture container element after render

---

### Review: MobX Expert ✅

**Verified:**
- Correct use of `runInAction` for batching multiple state updates in `setInteractiveState`
- Using `reaction` with delay for debounced state saving is appropriate
- Deep copying with `toJS()` in `getInteractiveState` avoids MobX proxy serialization issues
- Proper disposal of reaction in useEffect cleanup
- Good documentation of unconditional observable access requirement with prominent warning comment

**Resolved:**
- ✅ Observable verification completed against actual source files (section 3.6 item 7)
- ✅ All required SimulationModel properties have `@observable` decorator
- ✅ All required UIModel properties have `@observable` decorator
- ✅ Documented that `time` is not observable (acceptable - other observables change with time)
- ✅ Two-component pattern resolves mobx-react 5.x observer/hooks incompatibility (observer converts functional components to classes internally, breaking hooks)

---

### Review: QA Engineer ✅

**Verified:**
- Good coverage of unit test categories including edge cases
- Manual testing checklist includes key workflows
- Error handling section covers main failure scenarios with user-facing messages
- Retry mechanisms documented for state save/restore

---

### Review: Curriculum Author/Teacher ✅

**Verified:**
- URL parameters approach leverages existing, documented configuration system
- Validation button helps catch errors before saving with helpful suggestions
- Flexible input format (query string or newline-separated) is helpful
- Inline parameter documentation available in authoring interface via collapsible `<details>` section
- Deprecation strategy (section 5.7) ensures old configurations continue working

---

### Review: Student Experience Reviewer ✅

**Verified:**
- State restoration allows students to continue where they left off
- Report mode preserves the exact state for teacher review
- View-only controls (map selection, overlays) remain enabled in report mode
- Mid-simulation restoration restores to paused state for student orientation
- LoadingIndicator shows helpful "Loading your simulation..." message
- State application order ensures student work takes precedence over authored defaults

---

### Review Summary

| Role | Status | Notes |
|------|--------|-------|
| React/TypeScript Developer | ✅ Complete | All items resolved |
| MobX Expert | ✅ Complete | All items resolved |
| QA Engineer | ✅ Complete | All items resolved |
| Curriculum Author/Teacher | ✅ Complete | All items resolved |
| Student Experience Reviewer | ✅ Complete | All items resolved |

**Review Date**: January 2026

**Overall Assessment**: Spec is implementation-ready. All review feedback has been addressed and incorporated into the specification.
