# Storm-Mode Control Rearrangement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** In storm mode only: add a Settings tab to the right panel (holding the wind-arrows and hurricane-image toggles moved out of the bottom bar), replace the bottom-bar Storm Setup button with a left-edge tab that slides with the setup panel, and rename/reorder the remaining bottom-bar buttons.

**Architecture:** Extend `RightPanel`/`MapTab` with a third `"settings"` tab type gated on storm mode + config flags. Add a `LabeledSwitch` component (side labels, active side bold) for the settings controls. Render a "Storm Setup" tab inside `LeftPanel`'s container, positioned below the panel in z-order so the open panel covers it; it slides with the panel's existing transition. In `BottomBar`, remove the Storm Setup button and both toggles in storm mode, rename Reload→"Clear All" and Restart→"Restart/Edit" (which also opens the setup panel), and move Temp to the right of Start. Hurricane mode is untouched.

**Tech Stack:** React (class components + `mobx-react` `@inject`/`@observer` for existing files, functional for new leaf components), MobX stores via `BaseComponent.stores`, SCSS modules, MUI `Switch`/`Button`, Jest + React Testing Library.

**Design doc:** `docs/plans/2026-08-27-storm-mode-controls-design.md`

**Conventions (read first):**
- Config flags: `config.mode === "storm"`, `config.windArrowsToggle`, `config.hurricaneImageToggle`. Tests mutate `config` directly and restore in `afterEach` (see existing tests).
- All telemetry via `log()` from `src/log.ts`. Keep `LOGGED-EVENTS.md` in sync.
- Minimal comments — only non-obvious "why". Never use `!important` in CSS.
- Tests live next to source as `*.test.tsx`. Run single file: `npx jest src/components/...`
- PR #153 (`hurr-46-multiple-tracks`) will later make the setup panel open/close freely during runs. Don't add any "disabled while running" logic to the new Storm Setup tab, and don't rely on the panel auto-closing on start.

---

### Task 1: `LabeledSwitch` component

**Files:**
- Test: `src/components/right-panel/labeled-switch.test.tsx` (create)
- Create: `src/components/right-panel/labeled-switch.tsx`
- Create: `src/components/right-panel/labeled-switch.scss`

**Step 1: Write the failing test**

```tsx
import * as React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LabeledSwitch } from "./labeled-switch";

describe("LabeledSwitch component", () => {
  it("renders title, side labels, and bolds the active side", () => {
    const { rerender } = render(
      <LabeledSwitch
        title="Wind Direction and Speed" offLabel="Hide" onLabel="Show"
        checked={false} dataTest="wind-arrows-setting" onChange={() => undefined}
      />
    );
    expect(screen.getByText("Wind Direction and Speed")).toBeInTheDocument();
    expect(screen.getByText("Hide")).toHaveClass("active");
    expect(screen.getByText("Show")).not.toHaveClass("active");
    rerender(
      <LabeledSwitch
        title="Wind Direction and Speed" offLabel="Hide" onLabel="Show"
        checked={true} dataTest="wind-arrows-setting" onChange={() => undefined}
      />
    );
    expect(screen.getByText("Hide")).not.toHaveClass("active");
    expect(screen.getByText("Show")).toHaveClass("active");
  });

  it("calls onChange with the new value when toggled", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(
      <LabeledSwitch
        title="Hurricane Image" offLabel="Icon" onLabel="Image"
        checked={false} dataTest="hurricane-image-setting" onChange={onChange}
      />
    );
    await user.click(screen.getByRole("checkbox"));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
```

Note: SCSS modules are identity-mocked in Jest, so `css.active` === `"active"` — asserting `toHaveClass("active")` works.

**Step 2: Run test to verify it fails**

Run: `npx jest src/components/right-panel/labeled-switch.test.tsx`
Expected: FAIL — cannot find module `./labeled-switch`.

**Step 3: Write minimal implementation**

`src/components/right-panel/labeled-switch.tsx`:

```tsx
import Switch from "@mui/material/Switch";
import { clsx } from "clsx";
import * as React from "react";

import css from "./labeled-switch.scss";

interface IProps {
  title: string;
  offLabel: string;
  onLabel: string;
  checked: boolean;
  dataTest: string;
  onChange: (checked: boolean) => void;
}

export function LabeledSwitch({ title, offLabel, onLabel, checked, dataTest, onChange }: IProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, value: boolean) => onChange(value);
  return (
    <div className={css.labeledSwitch} data-test={dataTest}>
      <div className={css.title}>{title}</div>
      <div className={css.switchRow}>
        <span className={clsx(css.sideLabel, { [css.active]: !checked })}>{offLabel}</span>
        <Switch disableRipple={true} color="secondary" checked={checked} onChange={handleChange} />
        <span className={clsx(css.sideLabel, { [css.active]: checked })}>{onLabel}</span>
      </div>
    </div>
  );
}
```

`src/components/right-panel/labeled-switch.scss`:

```scss
@use "../common" as *;

.labeledSwitch {
  margin: 15px auto;
  text-align: center;

  .title {
    font-size: 14px;
    font-weight: bold;
    margin-bottom: 4px;
  }

  .switchRow {
    align-items: center;
    display: flex;
    justify-content: center;

    .sideLabel {
      font-size: 14px;

      &.active {
        font-weight: bold;
      }
    }
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx jest src/components/right-panel/labeled-switch.test.tsx`
Expected: PASS (2 tests).

**Step 5: Commit**

```bash
git add src/components/right-panel/labeled-switch.*
git commit -m "Add LabeledSwitch component for settings tab toggles"
```

---

### Task 2: `MapTab` settings variant

**Files:**
- Test: `src/components/right-panel/map-tab.test.tsx` (modify)
- Modify: `src/components/right-panel/map-tab.tsx`
- Modify: `src/components/right-panel/map-tab.scss`

The `MapType` union gains `"settings"` in Task 3; to keep this task compiling on its own, do the type change here.

**Step 1: Write the failing test** — add to the existing describe block in `map-tab.test.tsx`:

```tsx
  it("renders a text-only settings tab", () => {
    render(
      <Provider stores={stores}>
        <MapTab tabType="settings" active={true} />
      </Provider>
    );
    expect(screen.getByText("Settings")).toBeInTheDocument();
    // no map image for the settings tab
    expect(document.querySelector("[class*='mapTabImage']")).not.toBeInTheDocument();
  });
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/components/right-panel/map-tab.test.tsx`
Expected: FAIL — TS error: `"settings"` not assignable to `MapType`.

**Step 3: Implementation**

In `src/components/right-panel/right-panel.tsx` change only the type for now:

```ts
export type MapType = "base" | "overlay" | "settings";
```

Replace the body of `render()` in `map-tab.tsx`:

```tsx
  public render() {
    const { tabType, active } = this.props;
    const tabStyle = tabType === "base" ? css.geoMaps : tabType === "overlay" ? css.impactMaps : css.settings;
    const activeStyle = active ? css.active : "";
    const tabText = tabType === "base" ? "Base Maps" : tabType === "overlay" ? "Map Overlays" : "Settings";
    const tabImage = tabType === "base" ? baseMapTabImg : tabType === "overlay" ? overlayTabImg : undefined;
    return (
      <div className={`${css.mapTab} ${tabStyle}`} data-test="map-tab">
        <div className={`${css.mapTabBack} ${tabStyle} ${activeStyle}`}>
          {tabImage &&
            <div className={`${css.mapTabImage} ${tabStyle}`} style={{ backgroundImage: `url(${tabImage})` }}/>}
          <div className={`${css.mapTabContent} ${tabImage ? "" : css.noImage}`}>{tabText}</div>
        </div>
      </div>
    );
  }
```

In `map-tab.scss`, inside `.mapTabBack`, add alongside the `&.geoMaps` / `&.impactMaps` rules:

```scss
    &.settings {
      background-color: #fff;
      border-color: $secondaryColor;
      border-width: 2px;
      border-right: 0;
      cursor: pointer;
    }
```

and after the `.mapTabContent` rule add:

```scss
    .mapTabContent.noImage {
      top: 50%;
      transform: translateY(-50%);
      position: absolute;
      padding-top: 0;
      height: auto;
    }
```

**Step 4: Run tests**

Run: `npx jest src/components/right-panel/map-tab.test.tsx`
Expected: PASS (2 tests).

**Step 5: Commit**

```bash
git add src/components/right-panel/map-tab.* src/components/right-panel/right-panel.tsx
git commit -m "Add text-only settings variant to MapTab"
```

---

### Task 3: Settings tab in `RightPanel`

**Files:**
- Test: `src/components/right-panel/right-panel.test.tsx` (modify)
- Modify: `src/components/right-panel/right-panel.tsx`
- Modify: `src/components/right-panel/right-panel.scss`
- Modify: `LOGGED-EVENTS.md`

**Step 1: Write the failing tests** — add to `right-panel.test.tsx`. The existing suite mocks nothing; this needs the `log` spy pattern from `bottom-bar.test.tsx`. Add at top of file:

```tsx
import * as logModule from "../../log";

jest.spyOn(logModule, "log").mockImplementation(() => undefined);
```

New describe block:

```tsx
  describe("settings tab", () => {
    let originalMode: typeof config.mode;
    let originalWindArrows: boolean;
    let originalHurricaneImage: boolean;
    beforeEach(() => {
      originalMode = config.mode;
      originalWindArrows = config.windArrowsToggle;
      originalHurricaneImage = config.hurricaneImageToggle;
      config.mode = "storm";
      config.windArrowsToggle = true;
      config.hurricaneImageToggle = true;
    });
    afterEach(() => {
      config.mode = originalMode;
      config.windArrowsToggle = originalWindArrows;
      config.hurricaneImageToggle = originalHurricaneImage;
    });

    it("is not rendered in hurricane mode", () => {
      config.mode = "hurricane";
      renderPanel();
      expect(screen.queryByTestId("tab-settings")).not.toBeInTheDocument();
    });

    it("is not rendered when both toggles are disabled", () => {
      config.windArrowsToggle = false;
      config.hurricaneImageToggle = false;
      renderPanel();
      expect(screen.queryByTestId("tab-settings")).not.toBeInTheDocument();
    });

    it("opens the settings panel and shows controls per config flags", async () => {
      const user = userEvent.setup();
      const { unmount } = renderPanel();
      await user.click(screen.getByTestId("tab-settings"));
      expect(screen.getByTestId("right-panel")).toHaveClass("open");
      expect(screen.getByTestId("settings-panel")).toBeInTheDocument();
      expect(screen.getByTestId("wind-arrows-setting")).toBeInTheDocument();
      expect(screen.getByTestId("hurricane-image-setting")).toBeInTheDocument();
      unmount();

      config.hurricaneImageToggle = false;
      renderPanel();
      await user.click(screen.getByTestId("tab-settings"));
      expect(screen.getByTestId("wind-arrows-setting")).toBeInTheDocument();
      expect(screen.queryByTestId("hurricane-image-setting")).not.toBeInTheDocument();
    });

    it("toggles update the ui store and log", async () => {
      const user = userEvent.setup();
      renderPanel();
      await user.click(screen.getByTestId("tab-settings"));
      (logModule.log as jest.Mock).mockClear();

      const windSwitch = screen.getByTestId("wind-arrows-setting").querySelector("input") as HTMLInputElement;
      await user.click(windSwitch);
      expect(stores.ui.windArrows).toBe(false);
      expect(logModule.log).toHaveBeenCalledWith("WindArrowsHidden");

      const imageSwitch = screen.getByTestId("hurricane-image-setting").querySelector("input") as HTMLInputElement;
      await user.click(imageSwitch);
      expect(stores.ui.hurricaneImage).toBe(false);
      expect(logModule.log).toHaveBeenCalledWith("HurricaneImageHidden");
    });
  });
```

Note: check the `ui` store defaults for `windArrows` / `hurricaneImage` (both default `true` — verify in `src/models/ui.ts`) and adjust the assertions if not.

**Step 2: Run tests to verify they fail**

Run: `npx jest src/components/right-panel/right-panel.test.tsx`
Expected: FAIL — `tab-settings` not found.

**Step 3: Implementation** in `right-panel.tsx`:

Add imports:

```tsx
import { LabeledSwitch } from "./labeled-switch";
```

Add a visibility helper next to `overlayTabVisible`:

```tsx
const settingsTabVisible = () => {
  return config.mode === "storm" && (config.windArrowsToggle || config.hurricaneImageToggle);
};
```

In `render()`, after the overlay `<li>`, add:

```tsx
            {
              settingsTabVisible() &&
              <li>
                <div
                  id="settings"
                  data-test="tab-settings"
                  className={css.rightPanelTab}
                  onClick={this.handleToggleDrawer}
                >
                  <MapTab tabType="settings" active={selectedTab === "settings" || !open} />
                </div>
              </li>
            }
```

After the overlay tab-content block, add:

```tsx
          {
            selectedTab === "settings" &&
            <div className={`${css.tabContentBack} ${css.settings}`} data-test="settings-panel">
              <div className={css.tabContent}>
                <div className={css.drawerTitle}>Settings</div>
                {
                  config.windArrowsToggle &&
                  <LabeledSwitch
                    title="Wind Direction and Speed" offLabel="Hide" onLabel="Show"
                    checked={this.stores.ui.windArrows} dataTest="wind-arrows-setting"
                    onChange={this.handleWindArrowsChange}
                  />
                }
                {
                  config.windArrowsToggle && config.hurricaneImageToggle &&
                  <hr className={css.divider} />
                }
                {
                  config.hurricaneImageToggle &&
                  <LabeledSwitch
                    title="Hurricane Image" offLabel="Icon" onLabel="Image"
                    checked={this.stores.ui.hurricaneImage} dataTest="hurricane-image-setting"
                    onChange={this.handleHurricaneImageChange}
                  />
                }
              </div>
            </div>
          }
```

Add handlers (same behavior/log events as the bottom-bar toggles):

```tsx
  public handleWindArrowsChange = (checked: boolean) => {
    this.stores.ui.setWindArrows(checked);
    log(checked ? "WindArrowsShown" : "WindArrowsHidden");
  }

  public handleHurricaneImageChange = (checked: boolean) => {
    this.stores.ui.setHurricaneImage(checked);
    log(checked ? "HurricaneImageShown" : "HurricaneImageHidden");
  }
```

In `right-panel.scss`, inside `.tabContentBack`, alongside `&.geoMaps` / `&.impactMaps`:

```scss
      &.settings {
        background-color: $secondaryColorHover;
      }
```

and inside `.tabContent` (sibling of `.drawerTitle`):

```scss
        .divider {
          border: 0;
          border-top: 2px solid $secondaryColor;
          margin: 15px 10px;
        }
```

In `LOGGED-EVENTS.md`, update the `MapTabOpened` / `MapTabClosed` rows:

```
| `MapTabOpened` | `{ type }` | User opens a tab in the right panel (base, overlay, settings) |
| `MapTabClosed` | `{ type }` | User closes a tab in the right panel (base, overlay, settings) |
```

**Step 4: Run tests**

Run: `npx jest src/components/right-panel/`
Expected: PASS (all right-panel, map-tab, labeled-switch tests).

**Step 5: Commit**

```bash
git add src/components/right-panel/ LOGGED-EVENTS.md
git commit -m "Add settings tab with wind arrows and hurricane image toggles to right panel"
```

---

### Task 4: Storm Setup tab on `LeftPanel`

**Files:**
- Test: `src/components/left-panel/left-panel.test.tsx` (create — note: PR #153 also creates this file; expect a merge conflict here, keep both suites when merging)
- Modify: `src/components/left-panel/left-panel.tsx`
- Modify: `src/components/left-panel/left-panel.scss`

**Step 1: Write the failing test**

```tsx
import * as React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "mobx-react";
import { createStores } from "../../models/stores";
import { StoresContext } from "../../stores-context";
import { LeftPanel } from "./left-panel";

describe("LeftPanel component", () => {
  let stores = createStores();
  const renderPanel = (open: boolean, toggleOpen = () => undefined) => render(
    <StoresContext value={stores}>
      <Provider stores={stores}>
        <LeftPanel open={open} toggleOpen={toggleOpen} />
      </Provider>
    </StoresContext>
  );

  beforeEach(() => {
    stores = createStores();
  });

  describe("storm setup tab", () => {
    it("toggles the panel when clicked", async () => {
      const user = userEvent.setup();
      const toggleOpen = jest.fn();
      renderPanel(false, toggleOpen);
      await user.click(screen.getByTestId("storm-setup-tab"));
      expect(toggleOpen).toHaveBeenCalled();
    });

    it("slides behind the panel and leaves the tab order when the panel is open", () => {
      const { unmount } = renderPanel(false);
      const tab = screen.getByTestId("storm-setup-tab");
      expect(tab).not.toHaveClass("open");
      expect(tab).not.toHaveAttribute("tabindex", "-1");
      unmount();

      renderPanel(true);
      const openTab = screen.getByTestId("storm-setup-tab");
      expect(openTab).toHaveClass("open");
      expect(openTab).toHaveAttribute("tabindex", "-1");
    });
  });
});
```

Note: master's `LeftPanel` doesn't read stores, but wrap with providers anyway so this file survives the PR #153 merge (its `LeftPanel` uses `useStores`). Check `src/stores-context.tsx` for the correct provider usage — `right-panel.test.tsx` uses `<StoresContext value={stores}>`; copy that pattern.

**Step 2: Run test to verify it fails**

Run: `npx jest src/components/left-panel/left-panel.test.tsx`
Expected: FAIL — `storm-setup-tab` not found.

**Step 3: Implementation**

In `left-panel.tsx`, insert the tab as the first child of `.leftPanelContainer` (before the panel div, so the later-positioned panel stacks above and covers it when open):

```tsx
      <button
        type="button"
        className={clsx(css.stormSetupTab, { [css.open]: open })}
        data-test="storm-setup-tab"
        onClick={toggleOpen}
        tabIndex={open ? -1 : 0}
        aria-hidden={open}
      >
        Storm Setup
      </button>
```

In `left-panel.scss`, add at the top level of `.leftPanelContainer` (sibling of `.leftPanel`):

```scss
  .stormSetupTab {
    background-color: #fff;
    border: 2px solid $secondaryColor;
    border-left: 0;
    border-radius: 9px;
    border-bottom-left-radius: 0;
    border-top-left-radius: 0;
    color: $charcoal;
    cursor: pointer;
    font-family: inherit;
    font-size: 14px;
    font-weight: bold;
    left: 0;
    padding: 8px 10px;
    pointer-events: all;
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    transition: $leftPanelTransition;
    width: 76px;

    &.open {
      left: calc(#{$leftPanelContainerWidth} - 76px);
    }
  }
```

(`$leftPanelContainerWidth` is already defined at the top of this file; it is itself a `calc()`, and nested `calc()` is valid CSS.)

**Step 4: Run tests**

Run: `npx jest src/components/left-panel/left-panel.test.tsx`
Expected: PASS (2 tests).

**Step 5: Visual check**

Run: `npm start`, open `http://localhost:8080/?mode=storm`.
Verify: tab sits at the screen's left edge, vertically centered; clicking it opens the panel and the tab slides right and disappears behind the panel with the same timing; closing reverses it. Compare against the mockup (white tab, orange border, right-rounded corners) and tweak padding/width if needed.

**Step 6: Commit**

```bash
git add src/components/left-panel/
git commit -m "Add storm setup tab to left panel"
```

---

### Task 5: Bottom bar storm-mode changes

**Files:**
- Test: `src/components/bottom-bar/bottom-bar.test.tsx` (modify)
- Modify: `src/components/bottom-bar/bottom-bar.tsx`
- Modify: `src/components/bottom-bar/bottom-bar.scss` (remove `.stormSetupButton` block)
- Modify: `src/components/index-page.tsx`

**Step 1: Write the failing tests.** In `bottom-bar.test.tsx`, replace the whole `describe("storm setup button", ...)` block (the button is gone) with:

```tsx
  describe("storm mode", () => {
    let originalMode: string;
    beforeEach(() => {
      originalMode = config.mode;
      config.mode = "storm";
    });
    afterEach(() => {
      config.mode = originalMode;
    });

    const renderBar = () => render(
      <Provider stores={stores}>
        <BottomBar toggleLeftPanelOpen={toggleLeftPanelOpen} />
      </Provider>
    );

    it("does not render the storm setup button or the toggles", () => {
      renderBar();
      expect(screen.queryByTestId("storm-setup-button")).not.toBeInTheDocument();
      expect(screen.queryByText("Wind Direction and Speed")).not.toBeInTheDocument();
      expect(screen.queryByText("Hurricane Image")).not.toBeInTheDocument();
    });

    it("renames Reload to Clear All and Restart to Restart/Edit", () => {
      renderBar();
      expect(screen.getByTestId("reload-button")).toHaveTextContent("Clear All");
      expect(screen.getByTestId("restart-button")).toHaveTextContent("Restart/Edit");
    });

    it("places the temp button after the start button", () => {
      renderBar();
      const startButton = screen.getByTestId("start-button");
      const tempButton = screen.getByTestId("temp-button");
      expect(startButton.compareDocumentPosition(tempButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it("Restart/Edit restarts the simulation and opens the setup panel", async () => {
      const user = userEvent.setup();
      jest.spyOn(stores.simulation, "restart");
      jest.spyOn(stores.ui, "setLeftPanelOpen");
      renderBar();
      await user.click(screen.getByTestId("restart-button"));
      expect(stores.simulation.restart).toHaveBeenCalled();
      expect(stores.ui.setLeftPanelOpen).toHaveBeenCalledWith(true);
    });
  });

  describe("hurricane mode", () => {
    it("keeps the original button labels and order", () => {
      render(
        <Provider stores={stores}>
          <BottomBar toggleLeftPanelOpen={toggleLeftPanelOpen} />
        </Provider>
      );
      expect(screen.getByTestId("reload-button")).toHaveTextContent("Reload");
      expect(screen.getByTestId("restart-button")).toHaveTextContent(/^\s*Restart\s*$/);
      const startButton = screen.getByTestId("start-button");
      const tempButton = screen.getByTestId("temp-button");
      expect(tempButton.compareDocumentPosition(startButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(screen.getByText("Wind Direction and Speed")).toBeInTheDocument();
      expect(screen.getByText("Hurricane Image")).toBeInTheDocument();
    });
  });
```

Notes:
- `restart-button` text in hurricane mode is asserted with a regex because "Restart/Edit" also contains "Restart".
- Default config has `windArrowsToggle` / `hurricaneImageToggle` on — verify in `src/config.ts`; if not, set them in the hurricane-mode test.
- Keep the `toggleLeftPanelOpen` prop and its uses as-is (PR #153 still uses it; removing it would create needless conflicts).

**Step 2: Run tests to verify they fail**

Run: `npx jest src/components/bottom-bar/bottom-bar.test.tsx`
Expected: FAIL — storm-mode describe block fails (button still rendered, old labels, old order).

**Step 3: Implementation** in `bottom-bar.tsx`:

1. Delete the storm setup `<Button>` widget group (the `isStormMode && ...` block) and the now-unused `toggleLeftPanel` method and `SetupIcon` import. Delete the `.stormSetupButton` rule from `bottom-bar.scss`. Keep the `IProps.toggleLeftPanelOpen` prop (still passed by `index-page.tsx`; PR #153 reintroduces a caller). If `npm run lint` flags the unused prop, leave it — interface members aren't flagged.
2. Wrap the two toggle widget groups:

```tsx
          {
            !isStormMode &&
            <div className={`${css.widgetGroup} hoverable`}>
              {
                config.windArrowsToggle &&
                <WindArrowsToggle />
              }
            </div>
          }
          {
            !isStormMode &&
            <div className={`${css.widgetGroup} hoverable`}>
              {
                config.hurricaneImageToggle &&
                <HurricaneImageToggle />
              }
            </div>
          }
```

3. Extract the temp button so it can render in two positions. Above `return`:

```tsx
    const tempButton = (
      <div className={`${css.widgetGroup} ${tempButtonDisabled ? "" : "hoverable"}`}>
        <IconButton
          disabled={tempButtonDisabled}
          active={thermometerActive}
          buttonText="Temp"
          dataTest="temp-button"
          icon={<ThermometerIcon />} highlightIcon={<ThermometerHoverIcon />}
          onClick={this.handleThermometerToggle}
        />
      </div>
    );
```

Replace the inline temp widget group with `{ !isStormMode && tempButton }`, and add `{ isStormMode && tempButton }` immediately after the start/stop widget group (before `<HurricaneScale />`).

4. Rename labels:

```tsx
              <span><ReloadIcon/> {isStormMode ? "Clear All" : "Reload"}</span>
...
              <span><RestartIcon/> {isStormMode ? "Restart/Edit" : "Restart"}</span>
```

5. `handleRestart` opens the setup panel in storm mode:

```tsx
  public handleRestart = () => {
    log("SimulationEnded", {
      reason: "SimulationRestarted",
      outcome: this.stores.simulation.getOutcomeData()
    });
    this.restart();
    log("SimulationRestarted");
    if (config.mode === "storm") {
      this.stores.ui.setSetupMode(undefined);
      this.stores.ui.setLeftPanelOpen(true);
    }
  }
```

6. Make the confirm dialog follow the rename (title and confirm button):

```tsx
          title={isStormMode ? "Clear All" : "Reload Model"}
```

The `isStormMode` local lives in `render()`; for the dialog (also in `render()`) it's in scope. The confirm button label:

```tsx
              {isStormMode ? "Clear All" : "Reload"}
```

Also update the dialog body copy to be neutral: keep the existing sentence but replace "reload the model" with "clear the model" in storm mode:

```tsx
          <p id="reload-confirm-message">
            {isStormMode
              ? "Are you sure you want to clear everything? You will lose all of your current settings."
              : "Are you sure you want to reload the model? You will lose all of your current settings."}
          </p>
```

**Step 4: Run tests**

Run: `npx jest src/components/bottom-bar/bottom-bar.test.tsx`
Expected: PASS — including all pre-existing tests (they run in hurricane mode by default and must be unaffected).

**Step 5: Commit**

```bash
git add src/components/bottom-bar/ src/components/index-page.tsx
git commit -m "Rework bottom bar for storm mode: remove setup button and toggles, rename and reorder buttons"
```

(`index-page.tsx` only changes if something was needed; if untouched, drop it from the add.)

---

### Task 6: Full verification

**Step 1: Run the full test suite**

Run: `npm test`
Expected: all suites pass. (If Jest hangs at startup, the fix is `brew reinstall watchman`.)

**Step 2: Lint**

Run: `npm run lint`
Expected: clean.

**Step 3: Manual check — storm mode**

`npm start` → `http://localhost:8080/?mode=storm`:
- Right side: Base Maps, Map Overlays, Settings tabs; Settings opens with the two labeled toggles and orange divider; toggles work.
- Left edge: Storm Setup tab, vertically centered; opens/closes the panel, slides with it, hidden when open.
- Bottom bar: no Storm Setup button, no toggles; Clear All / Restart\/Edit / Start / Temp order; Restart/Edit restarts and opens the panel; Clear All shows the renamed confirm dialog.

**Step 4: Manual check — hurricane mode**

`http://localhost:8080/`:
- No Settings tab, no left tab; bottom bar exactly as before (Start Location, Season, toggles, Temp, Reload, Restart, Start).

**Step 5: Commit any fixups, then wrap up**

Use superpowers:finishing-a-development-branch.
