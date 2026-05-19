# Shrink map view when left panel opens — design

**Branch:** `hurr-11-storm-placement` (continuing the same feature branch)
**Date:** 2026-05-19

## Problem

The left panel ([src/components/left-panel/](../../src/components/left-panel/)) slides over the map from the left when `ui.leftPanelOpen === true`. The panel is a 257-px-wide overlay (`position: absolute`, `z-index: 1000`) animated via CSS `transition: left 0.8s`. While open, it covers part of the map, so any content the user was focused on may now be hidden behind the panel.

We want the visible-to-the-right-of-the-panel area to show the same map region the user was looking at before opening — i.e. the map zooms out (or pans) so the prior view fits in the unobstructed right portion. Closing the panel does the inverse: the area currently visible in the right portion expands to fill the now-full screen.

## Decisions (from brainstorming)

| Question | Decision |
|---|---|
| Panel mechanics | Overlay (CSS `position: absolute`), not a layout-pushing element. |
| Map response | Pan/zoom — *not* container resize. Use Leaflet's `flyToBounds` with `paddingTopLeft: [PANEL_WIDTH, 0]`. |
| Close behavior | Compute the bounds currently visible in the right-of-panel sub-rectangle; refit those to the full screen. Preserves any panning the user did while the panel was open. |
| Smooth transition | `flyToBounds(duration: PANEL_TRANSITION_SECONDS)` so Leaflet's animation runs alongside the CSS slide. |
| Constants | Live in [common.scss](../../src/components/common.scss) and are exported to JS via the css-modules `:export` directive. Single source of truth. |
| Initial mount sync | `fireImmediately: false` — do NOT pan/zoom on initial mount if `leftPanelOpen` is already `true`. |
| Tests | No new unit tests. Manual verification only — jsdom can't meaningfully animate Leaflet, and mocking the map ref would test mocks rather than behavior. |

## Architecture

Three files touched:

```
src/
  components/
    common.scss                   (edit) add $leftPanelWidth, $leftPanelTransitionSeconds, :export
    left-panel/left-panel.scss    (edit) consume the shared vars
    map-view.tsx                  (edit) wire MobX reaction that flies map on panel toggle
```

Data flow:

```
ui.leftPanelOpen flips
   → MobX reaction in MapView fires
   → if opening:  capture map.getBounds(); flyToBounds(bounds, paddingTopLeft:[W, 0], duration:T)
   → if closing:  compute right-of-panel sub-bounds via containerPointToLatLng;
                  flyToBounds(subBounds, paddingTopLeft:[0, 0], duration:T)
```

## SCSS changes

**`common.scss`** — add at the bottom:

```scss
$leftPanelWidth: 257px;
$leftPanelTransitionSeconds: 0.8s;

:export {
  leftPanelWidth: $leftPanelWidth;
  leftPanelTransitionSeconds: $leftPanelTransitionSeconds;
}
```

The `:export` values are emitted by css-loader's css-modules support as the module's default export. Values come out as strings (`"257px"`, `"0.8s"`); JS strips units with `parseInt`/`parseFloat`.

**`left-panel.scss`** —
- Remove the local `$leftPanelWidth: 257px;` declaration (now lives in common, imported via the existing `@use "../common" as *;`).
- Replace `transition: left 0.8s;` with `transition: left $leftPanelTransitionSeconds;`.
- All other `$leftPanelWidth` usages stay as-is.

## `map-view.tsx` changes

```ts
import commonStyles from "./common.scss";
import { reaction, IReactionDisposer } from "mobx";

const LEFT_PANEL_WIDTH_PX = parseInt(commonStyles.leftPanelWidth, 10);
const LEFT_PANEL_TRANSITION_SECONDS = parseFloat(commonStyles.leftPanelTransitionSeconds);

// inside the MapView class:

private leftPanelReactionDisposer?: IReactionDisposer;

public componentDidMount() {
  // existing setup if any...
  this.leftPanelReactionDisposer = reaction(
    () => this.stores.ui.leftPanelOpen,
    (open) => this.handleLeftPanelToggle(open)
  );
}

public componentWillUnmount() {
  this.leftPanelReactionDisposer?.();
  // existing teardown...
}

private handleLeftPanelToggle(open: boolean) {
  const map = this.mapRef.current;
  if (!map) return;
  const opts = {
    paddingTopLeft: [open ? LEFT_PANEL_WIDTH_PX : 0, 0] as [number, number],
    duration: LEFT_PANEL_TRANSITION_SECONDS,
  };
  if (open) {
    map.flyToBounds(map.getBounds(), opts);
  } else {
    const size = map.getSize();
    const topLeft = map.containerPointToLatLng([LEFT_PANEL_WIDTH_PX, 0]);
    const bottomRight = map.containerPointToLatLng([size.x, size.y]);
    if (isFinite(topLeft.lat) && isFinite(bottomRight.lng)) {
      map.flyToBounds(L.latLngBounds(topLeft, bottomRight), opts);
    }
  }
}
```

The `isFinite` guard handles the (unlikely) case where the map hasn't been laid out yet when a close fires. The `mapRef.current` null-check handles initial state.

## Edge cases / risks

- **Rapid toggling.** If the user toggles the panel multiple times within 800ms, each new `flyToBounds` cancels the previous one. Leaflet handles this cleanly.
- **`leftPanelOpen === true` on initial mount.** Possible if restored from interactive state. The `fireImmediately: false` default skips this — the map stays where it is, content under the panel is hidden until the user explicitly toggles. Acceptable for now.
- **Animation easing mismatch.** Leaflet's `flyToBounds` uses its own easing; the CSS panel uses `ease` (the default). They won't move in perfect lockstep but should look reasonable.
- **Constant drift.** If a future change updates `$leftPanelTransitionSeconds` in common.scss but doesn't propagate, JS gets the new value automatically. If someone deletes the `:export` block or renames a key, JS gets `undefined` and `parseInt(undefined)` returns `NaN`. Should detect quickly during manual testing — a flyToBounds with NaN duration would error or behave oddly.

## Non-goals

- Resizing the map container itself (the panel overlays, container stays full-width).
- Handling panel widths other than the current single hardcoded value.
- A "reset to original view" button or undo affordance.
- Unit testing the reaction (manual verification suffices for this animation behavior).
