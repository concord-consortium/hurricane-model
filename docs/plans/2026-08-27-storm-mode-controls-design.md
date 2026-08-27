# Storm-mode control rearrangement — design

Storm mode only. Hurricane mode keeps its current layout and behavior.

## 1. Settings tab (right panel)

- Generalize `RightPanel`'s tab type to `"base" | "overlay" | "settings"`.
- The Settings tab renders below Map Overlays, only in storm mode and only when
  `config.windArrowsToggle` or `config.hurricaneImageToggle` is on.
- Styled per mockup: white tab, orange border, text-only (`MapTab` gains an
  imageless variant).
- Tab content: "Settings" title, Wind Direction and Speed toggle, orange
  divider, Hurricane Image toggle — each control shown per its config flag.
- Opens/closes/logs like the other tabs (`MapTabOpened`/`MapTabClosed` with
  `type: "settings"`); LOGGED-EVENTS.md updated.

## 2. Labeled toggles

- New reusable `LabeledSwitch` component with side labels, active side bold:
  - Wind Direction and Speed: "Hide / Show"
  - Hurricane Image: "Icon / Image"
- Same UI-store setters and log events as the existing bottom-bar toggles,
  which remain untouched for hurricane mode.

## 3. Storm Setup tab (left)

- Rendered inside `LeftPanel`'s existing container (container size unchanged),
  vertically centered, `z-index` below the panel.
- Closed: tab at `left: 0` (screen edge). Open: tab slides — same transition
  timing as the panel — to right-aligned within the container, where the open
  panel covers it. No fade.
- Click toggles the panel; never disabled (matches PR #153 behavior where the
  panel opens/closes freely during a run).
- Styled per mockup: white, orange border, rounded right corners.

## 4. Bottom bar (storm mode only)

- Storm Setup button removed (replaced by the left tab).
- Wind arrows and hurricane image toggle groups removed (moved to Settings tab).
- Reload renamed "Clear All"; Restart renamed "Restart/Edit".
- Restart/Edit restarts the simulation and then opens the setup panel.
- Temp button moves from left of Clear All to right of Start.
- Hurricane mode: order, labels, and behavior unchanged (conditionals on
  the existing `isStormMode`).

## Compatibility with PR #153

Based on master, but written to merge cleanly with PR #153
(hurr-46-multiple-tracks): no reliance on the storm setup button being
disabled while running, no auto-close-on-start assumptions.

## Testing

Jest tests for: Settings tab visibility per mode/flags, labeled toggle
behavior and logging, Storm Setup tab presence and positioning classes,
bottom-bar storm-mode renames/order, Restart/Edit opening the panel.
