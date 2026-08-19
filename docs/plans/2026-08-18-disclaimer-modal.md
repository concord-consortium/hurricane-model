# Liability Disclaimer Modal Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Show a blocking "This is a simulation and cannot be used to make a forecast." modal when Storm Explorer loads.

**Architecture:** Reuse the existing `Dialog` component (`src/components/dialog.tsx`), which already wraps MUI's `Dialog` and supplies the darkened backdrop, focus trap, scroll lock and top-right close button. Three changes to it, all of which apply app-wide: make `title` optional so the disclaimer can render without one, restyle its close button's hover/active to match the new "Got it" button, and stop backdrop clicks from closing it. A new `DisclaimerModal` component supplies the icon, message and button as `children`, and `IndexPage` mounts it.

**Tech Stack:** React 18 + TypeScript, MobX 6 (`mobx-react` `observer`), MUI 5 (`@mui/material`, `@mui/icons-material`), SCSS modules, Jest + React Testing Library, Cypress.

**Design doc:** `docs/plans/2026-08-18-disclaimer-modal-design.md`

---

## Background you need before starting

Read these first. They are short.

- `src/components/dialog.tsx` — the component being reused. 30 lines.
- `src/components/dialog.scss` — its styles.
- `src/components/common.scss` — shared SCSS variables. Note `$secondaryColor: #ff9900` (this is `rgb(255,153,0)`) and `$secondaryColorHover: #ffdaa3`. **Use the variables, never the literals.**
- `src/config.ts` — a plain object `DEFAULT_CONFIG` merged with URL params at module load and exported as the default. `getURLParam` at line 9 returns boolean `true` for a param written without `=value`, and the merge loop passes that through, so a bare `?someFlag` sets it. No parsing code is needed for a new boolean flag.
- `src/models/ui.ts` — `UIModel`. You need `isReportMode` (line ~84), a computed that is true in LARA's report views.
- `src/log.ts` — `log()` re-exported from `@concord-consortium/lara-interactive-api`. Events only actually fire when iframed in LARA; calling it outside LARA is harmless.
- `LOGGED-EVENTS.md` — every event must be documented here. There is a `## Dialogs` section at the end of the file.

**Two conventions that will bite you:**

1. SCSS modules. `import css from "./foo.scss"` then `className={css.someClass}`. Class names are camelCase in both the SCSS and the JS.
2. `@use "common" as *;` must be the first line of any SCSS file that references the shared variables or mixins.

**Testing conventions:** tests live next to source as `*.test.tsx`. To fake config, tests assign to the imported config object and restore it afterwards — see `src/components/map-view.test.tsx:51-56` for the exact pattern. To fake logging, `jest.spyOn(logModule, "log").mockImplementation(() => undefined)` at module scope — see `src/components/top-bar/top-bar.test.tsx:11`.

---

## Task 1: Add the `skipDisclaimer` config flag

**Files:**
- Modify: `src/config.ts`

**Step 1: Add the flag**

In `DEFAULT_CONFIG`, next to the existing `mode` entry (around line 78), add:

```ts
  skipDisclaimer: false,
```

Do not add a comment here. Teale trims comments they consider unnecessary and does not want them re-added; this one has already been trimmed twice.

The polarity matters. `getURLParam` (`src/config.ts:9`) returns boolean `true` for a param written with no `=value`, and the merge loop below passes that straight through, so a negative default makes `?skipDisclaimer` self-contained. A positive `disclaimer: true` flag would have required `?disclaimer=false`.

**Step 2: Register the parameter for LARA authoring**

`src/utils/parse-authored-params.ts` holds `KNOWN_PARAMETERS` (line 18), which drives both `validateUrlParams` and the parameter documentation table rendered in the authoring UI (`src/components/lara/authoring-interface.tsx:111`). A flag missing from that list still works — `handleSave` does not gate on validity — but an author who types it and clicks Validate gets `Unknown parameter: "skipDisclaimer"`, and it never appears in the docs table. Every other boolean flag is registered.

Add an entry alongside the other boolean flags such as `topBarVisible` (line 113):

```ts
  {
    name: "skipDisclaimer",
    type: "boolean",
    validValues: "true, false",
    description: "Suppress the load-time liability disclaimer modal"
  },
```

The bare-switch form survives this path too: `parse-authored-params.ts:216-220` maps an `=`-less param to `"true"`.

**Step 3: Verify it typechecks**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors. (If the repo has no such script, `npm run lint` also surfaces TS parse errors.)

**Step 4: Commit**

```bash
git add src/config.ts src/utils/parse-authored-params.ts
git commit -m "Add skipDisclaimer config flag"
```

---

## Task 2: Make `Dialog`'s title optional

**Files:**
- Modify: `src/components/dialog.tsx`
- Test: `src/components/dialog.test.tsx`

**Step 1: Write the failing test**

Add to `src/components/dialog.test.tsx`, inside the existing `describe`:

```tsx
  it("renders without a title and omits aria-labelledby", () => {
    render(<Dialog open={true} onClose={jest.fn()}><p>Body text</p></Dialog>);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).not.toHaveAttribute("aria-labelledby");
    expect(screen.getByText("Body text")).toBeInTheDocument();
  });
```

**Step 2: Run it and watch it fail**

Run: `npx jest src/components/dialog.test.tsx`
Expected: FAIL. TypeScript rejects the missing required `title` prop, so the suite fails to compile.

**Step 3: Make title optional**

In `src/components/dialog.tsx`, change the interface:

```ts
  title?: string;
```

and change the two places that consume it. The `aria-labelledby` attribute:

```tsx
      aria-labelledby={title ? titleId : undefined}
```

and the title element, which becomes conditional:

```tsx
        { title && <div id={titleId} className={css.title}>{ title }</div> }
```

Leave `useId()` where it is — hooks cannot be called conditionally.

**Step 3b: Give title-less dialogs a way to be named**

Making `title` optional without offering a substitute label means the first consumer — `DisclaimerModal` in Task 6 — would ship a `role="dialog"` element that screen readers announce as an unnamed dialog, which fails WCAG 4.1.2. Add a sibling prop:

```ts
  ariaLabel?: string;
```

and set it on the same slot as the label id, so exactly one of the two is ever present:

```tsx
      slotProps={{ paper: {
        "aria-labelledby": title ? titleId : undefined,
        "aria-label": title ? undefined : ariaLabel
      } }}
```

Test that an untitled dialog given `ariaLabel` is actually named:

```tsx
  it("names an untitled dialog from ariaLabel", () => {
    render(<Dialog open={true} onClose={jest.fn()} ariaLabel="Disclaimer" />);
    expect(screen.getByRole("dialog")).toHaveAccessibleName("Disclaimer");
  });
```

**Step 4: Run the test and watch it pass**

Run: `npx jest src/components/dialog.test.tsx`
Expected: PASS, 2 tests.

**Step 5: Confirm the existing callers still work**

Run: `npx jest src/components/top-bar`
Expected: PASS. The About and Share dialogs still pass a title, so nothing there changes.

**Step 6: Commit**

```bash
git add src/components/dialog.tsx src/components/dialog.test.tsx
git commit -m "Make Dialog title optional"
```

---

## Task 3: Stop dialogs closing on a backdrop click

This applies to every dialog in the app — About and Share as well as the disclaimer. A dialog should close because the user chose to close it, not because they clicked slightly wide of it.

Escape still closes. That is an established expectation for modals and, unlike a stray click, it is unambiguously deliberate.

**Files:**
- Modify: `src/components/dialog.tsx`
- Test: `src/components/dialog.test.tsx`

**Step 1: Write the failing tests**

Add to `src/components/dialog.test.tsx`, inside the existing `describe`. You will need `userEvent`, so add this import at the top of the file if it is not already there:

```tsx
import userEvent from "@testing-library/user-event";
```

Then the tests:

```tsx
  it("does not close when the backdrop is clicked", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    const { baseElement } = render(
      <Dialog open={true} onClose={onClose} title="Test Dialog" />
    );
    // The backdrop renders in a portal, so query baseElement rather than container.
    const backdrop = baseElement.querySelector(".MuiBackdrop-root");
    expect(backdrop).toBeInTheDocument();
    await user.click(backdrop!);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes when escape is pressed", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    render(<Dialog open={true} onClose={onClose} title="Test Dialog" />);
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });

  it("closes when the close button is clicked", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    render(<Dialog open={true} onClose={onClose} title="Test Dialog" />);
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalled();
  });
```

The last two are not strictly new behavior, but without them a later refactor could silently break every way of closing a dialog and still pass.

**Step 2: Run them and watch the first one fail**

Run: `npx jest src/components/dialog.test.tsx`
Expected: the backdrop test FAILS with `expect(jest.fn()).not.toHaveBeenCalled()` — MUI currently calls `onClose` for backdrop clicks. The escape and close-button tests should already PASS.

**Step 3: Filter the close reason**

In `src/components/dialog.tsx`, add a handler above the `return` and pass it to `MuiDialog` in place of `onClose`:

```tsx
  const handleClose: NonNullable<DialogProps["onClose"]> = (_event, reason) => {
    if (reason !== "escapeKeyDown") return;
    onClose();
  };
```

with `import MuiDialog, { DialogProps } from "@mui/material/Dialog";`.

Two things here are deliberate and were arrived at the hard way:

**Use MUI's exported type**, not a hand-copied `reason` union. MUI declares `onClose` with a bivariance hack, so a narrowed union compiles silently and drifts from MUI without warning.

**The guard is an allow-list, not a deny-list.** `if (reason === "backdropClick") return;` looks equivalent today, since MUI emits exactly two reasons. It is not: a reason added in a later MUI version would fall through and dismiss the dialog, and no test would notice. The allow-list's opposite failure — MUI renaming `escapeKeyDown` — is caught immediately by the escape test below. Nobody can be trapped either way, because the close button's `onClick={onClose}` never goes through MUI at all.

```tsx
    <MuiDialog
      onClose={handleClose}
```

Leave the close button's own `onClick={onClose}` alone — it does not go through MUI.

**Step 3b: Pin the policy itself**

The tests above cannot tell an allow-list from a deny-list — both make all of them pass, because MUI only ever emits the two reasons they exercise. Add `src/components/dialog-close-policy.test.tsx`, which mocks `@mui/material/Dialog` down to a prop-capture stub, grabs the `onClose` this component hands MUI, and invokes it directly with a reason MUI does not emit today. It needs its own file because `jest.mock` hoists file-wide and would break the real-DOM tests above.

Verify it earns its place: flip the guard to `if (reason === "backdropClick") return;` and confirm this file fails, then flip it back.

**Step 4: Run the tests and watch them pass**

Run: `npx jest src/components/dialog.test.tsx src/components/dialog-close-policy.test.tsx`
Expected: PASS, 9 tests (7 + 2).

**Step 5: Confirm the other dialogs still close**

Run: `npx jest src/components/top-bar`
Expected: PASS, 8 tests.

**Step 6: Commit**

```bash
git add src/components/dialog.tsx src/components/dialog.test.tsx
git commit -m "Stop dialogs closing on backdrop clicks"
```

---

## Task 4: Add the shared button-fill mixin

**Files:**
- Modify: `src/components/common.scss`

**Step 1: Add the mixin**

Append to `src/components/common.scss`, **above** the `:export` block at the bottom (the `:export` block must stay last, it is parsed by the CSS-modules loader):

```scss
// Active recolors the border rather than removing it so the button keeps its size.
@mixin dialogButtonFill {
  &:hover {
    background-color: $secondaryColorHover;
  }
  &:active {
    background-color: $secondaryColor;
    border-color: transparent;
  }
}
```

**Step 2: Verify the build still compiles the SCSS**

Run: `npx jest src/components/dialog.test.tsx`
Expected: PASS. (Jest maps SCSS through a mock, so this only proves nothing broke. The real check is Task 4.)

**Step 3: Commit**

```bash
git add src/components/common.scss
git commit -m "Add dialogButtonFill mixin for shared button hover/active"
```

---

## Task 5: Restyle the shared close button

This intentionally changes the About and Share dialogs' close buttons too. That was the explicit decision: one close-button treatment across the app.

**Files:**
- Modify: `src/components/dialog.scss`

**Step 1: Update `.closeButton`**

Replace the `.closeButton` rule in `src/components/dialog.scss` with:

```scss
.closeButton {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 4px;
  background: none;
  border: none;
  border-radius: 4px;
  color: $charcoalMedium;
  cursor: pointer;
  display: inline-flex;
  &:hover {
    color: $charcoal;
  }
  @include dialogButtonFill;
  &:focus-visible {
    outline: 2px solid $charcoal;
    outline-offset: 2px;
  }
}
```

Note `padding` went from `0` to `4px` so the hover fill has room around the icon.

**Step 2: Verify it compiles and looks right**

Run: `npm start`, open the app, click **About** in the top bar, and hover the X.
Expected: pale orange (`#ffdaa3`) rounded square behind the X on hover; solid orange (`#ff9900`) with no visible border while the mouse is held down.

Stop the dev server when done.

**Step 3: Commit**

```bash
git add src/components/dialog.scss
git commit -m "Give dialog close button a filled hover and active state"
```

---

## Task 6: Build the DisclaimerModal component

**Files:**
- Create: `src/components/disclaimer-modal.tsx`
- Create: `src/components/disclaimer-modal.scss`
- Test: `src/components/disclaimer-modal.test.tsx`

**Step 1: Write the failing tests**

Create `src/components/disclaimer-modal.test.tsx`:

```tsx
import * as React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "mobx-react";

import config from "../config";
import * as logModule from "../log";
import { createStores, IStores } from "../models/stores";
import { StoresContext } from "../stores-context";
import { DisclaimerModal } from "./disclaimer-modal";

const logSpy = jest.spyOn(logModule, "log").mockImplementation(() => undefined);

const MESSAGE = "This is a simulation and cannot be used to make a forecast.";

describe("DisclaimerModal component", () => {
  let stores: IStores;
  let oldMode: string;
  let oldSkipDisclaimer: boolean;

  beforeEach(() => {
    stores = createStores();
    oldMode = config.mode;
    oldSkipDisclaimer = config.skipDisclaimer;
    config.mode = "storm";
    config.skipDisclaimer = false;
    logSpy.mockClear();
  });

  afterEach(() => {
    config.mode = oldMode;
    config.skipDisclaimer = oldSkipDisclaimer;
  });

  const renderModal = () => render(
    <Provider stores={stores}>
      <StoresContext value={stores}>
        <DisclaimerModal />
      </StoresContext>
    </Provider>
  );

  it("shows the disclaimer in storm mode", () => {
    renderModal();
    expect(screen.getByText(MESSAGE)).toBeInTheDocument();
  });

  it("does not show when skipDisclaimer is set", () => {
    config.skipDisclaimer = true;
    renderModal();
    expect(screen.queryByText(MESSAGE)).not.toBeInTheDocument();
  });

  it("does not show in hurricane mode", () => {
    config.mode = "hurricane";
    renderModal();
    expect(screen.queryByText(MESSAGE)).not.toBeInTheDocument();
  });

  it("does not show in report mode", () => {
    stores.ui.setMode("report");
    renderModal();
    expect(screen.queryByText(MESSAGE)).not.toBeInTheDocument();
  });

  it("closes and logs when Got it is clicked", async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(screen.getByRole("button", { name: "Got it" }));
    expect(screen.queryByText(MESSAGE)).not.toBeInTheDocument();
    expect(logSpy).toHaveBeenCalledWith("DisclaimerDismissed", { source: "gotIt" });
  });

  it("closes and logs when the close button is clicked", async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByText(MESSAGE)).not.toBeInTheDocument();
    expect(logSpy).toHaveBeenCalledWith("DisclaimerDismissed", { source: "close" });
  });

  it("stays open when the backdrop is clicked", async () => {
    const user = userEvent.setup();
    const { baseElement } = renderModal();
    await user.click(baseElement.querySelector(".MuiBackdrop-root")!);
    expect(screen.getByText(MESSAGE)).toBeInTheDocument();
    expect(logSpy).not.toHaveBeenCalled();
  });
});
```

Note `queryByText` returns null when absent, `getByText` throws. Use `queryBy*` for every "should not exist" assertion.

The backdrop test duplicates coverage in `dialog.test.tsx` on purpose. Task 3 proves the shared component swallows backdrop clicks; this proves the disclaimer actually benefits, which is the requirement that matters.

**Step 2: Run the tests and watch them fail**

Run: `npx jest src/components/disclaimer-modal.test.tsx`
Expected: FAIL — `Cannot find module './disclaimer-modal'`.

**Step 3: Write the styles**

Create `src/components/disclaimer-modal.scss`:

```scss
@use "common" as *;

.disclaimer {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  // Right padding clears the absolutely positioned close button.
  padding: 16px 32px 8px;
  max-width: 420px;

  .icon {
    color: $secondaryColor;
    font-size: 48px;
  }

  .message {
    margin: 16px 0 24px;
    font-size: 16px;
    line-height: 1.4;
    color: $charcoal;
  }

  .gotItButton {
    padding: 6px 20px;
    font-family: inherit;
    font-size: 14px;
    color: $charcoal;
    background: none;
    border: 1px solid $charcoalMedium;
    border-radius: 4px;
    cursor: pointer;
    @include dialogButtonFill;
    &:focus-visible {
      outline: 2px solid $charcoal;
      outline-offset: 2px;
    }
  }
}
```

**Step 4: Write the component**

Create `src/components/disclaimer-modal.tsx`:

```tsx
import WarningIcon from "@mui/icons-material/Warning";
import { observer } from "mobx-react";
import React, { useId, useState } from "react";

import config from "../config";
import { log } from "../log";
import { useStores } from "../stores-context";
import { Dialog } from "./dialog";

import css from "./disclaimer-modal.scss";

type DismissSource = "gotIt" | "close";

export const DisclaimerModal = observer(function DisclaimerModal() {
  const { ui } = useStores();
  const [dismissed, setDismissed] = useState(false);
  const messageId = useId();

  // Derived, not initial state: LaraAppWrapper sets ui.mode after the first render.
  const open = !dismissed && !config.skipDisclaimer && config.mode === "storm" && !ui.isReportMode;

  const dismiss = (source: DismissSource) => {
    setDismissed(true);
    log("DisclaimerDismissed", { source });
  };

  return (
    <Dialog
      open={open}
      onClose={() => dismiss("close")}
      ariaLabel="Disclaimer"
      ariaDescribedBy={messageId}
    >
      <div className={css.disclaimer}>
        <WarningIcon className={css.icon} />
        <div id={messageId} className={css.message}>
          This is a simulation and cannot be used to make a forecast.
        </div>
        <button
          type="button"
          className={css.gotItButton}
          onClick={() => dismiss("gotIt")}
        >
          Got it
        </button>
      </div>
    </Dialog>
  );
});
```

`onClose` fires for the close button and for escape, both logged as `"close"`. Backdrop clicks never reach it — Task 3 filters them out inside `Dialog`.

**Step 5: Run the tests and watch them pass**

Run: `npx jest src/components/disclaimer-modal.test.tsx`
Expected: PASS, 7 tests.

If the "does not show in report mode" test fails, check that you used `ui.isReportMode` and not `ui.readOnly` — the latter does not exist.

The `ariaLabel="Disclaimer"` is not decoration. The modal has no visible title, and `Dialog` only emits `aria-labelledby` when a `title` is passed, so without it a screen reader announces an unnamed dialog.

**Step 6: Commit**

```bash
git add src/components/disclaimer-modal.tsx src/components/disclaimer-modal.scss src/components/disclaimer-modal.test.tsx
git commit -m "Add disclaimer modal component"
```

---

## Task 7: Mount the modal in IndexPage

**Files:**
- Modify: `src/components/index-page.tsx`

**Step 1: Import the component**

Add to the imports in `src/components/index-page.tsx`, keeping alphabetical order within the local-component group:

```tsx
import { DisclaimerModal } from "./disclaimer-modal";
```

**Step 2: Render it**

Inside the `content` fragment in `render()`, add `<DisclaimerModal />` as the last element, after the `config.benchmark` block. MUI renders it in a portal, so its position in the tree does not affect layout.

**Step 3: Verify the existing page tests still pass**

Run: `npx jest src/components/index-page.test.tsx`
Expected: PASS. Those tests do not set `mode=storm`, so the modal stays closed and nothing changes.

**Step 4: Verify in the browser**

Run: `npm start`, open `http://localhost:8080/?mode=storm`.
Expected: darkened page, centered modal, warning icon, the message, a "Got it" button, an X top right. Both buttons close it. Hovering either shows the pale orange fill; holding either shows solid orange with no border. Clicking the darkened area outside the modal does nothing.

Inspect the warning icon in devtools and confirm its computed `font-size` is `48px`, not `24px`. If it is `24px`, MUI's emotion class is winning and the `.icon` rule has been un-nested out of `.disclaimer` — put it back rather than reaching for `!important`.

Then open `http://localhost:8080/?mode=storm&skipDisclaimer` — no modal, and note there is no `=` after the param. And `http://localhost:8080/` — no modal, because that is hurricane mode.

Stop the dev server.

**Step 5: Commit**

```bash
git add src/components/index-page.tsx
git commit -m "Show disclaimer modal on Storm Explorer load"
```

---

## Task 8: Document the log event

**Files:**
- Modify: `LOGGED-EVENTS.md`

**Step 1: Add the row**

In the `## Dialogs` table at the end of `LOGGED-EVENTS.md`, add:

```
| `DisclaimerDismissed` | `{ source }` | User dismisses the load-time disclaimer modal (`source` is `"gotIt"` for the Got it button, or `"close"` for the close button or escape key) |
```

**Step 2: Commit**

```bash
git add LOGGED-EVENTS.md
git commit -m "Document DisclaimerDismissed event"
```

---

## Task 9: Keep the Cypress specs unblocked

Only `storm.cy.js` visits with `mode=storm`, so it is the only spec the modal blocks. The others load hurricane mode and never see it.

**Files:**
- Modify: `cypress/e2e/integration/storm.cy.js:11`

**Step 1: Add the param**

Change:

```js
    cy.visit("/?mode=storm");
```

to:

```js
    cy.visit("/?mode=storm&skipDisclaimer");
```

**Step 2: Run the spec**

Run: `npm run test:cypress`
Expected: PASS, same as before the change.

**Step 3: Commit**

```bash
git add cypress/e2e/integration/storm.cy.js
git commit -m "Skip disclaimer modal in storm Cypress spec"
```

---

## Task 10: Full verification

**Step 1: Lint**

Run: `npm run lint`
Expected: no errors.

**Step 2: Unused-symbol check**

Run: `npm run lint:unused`
Expected: exactly one error, pre-existing and identical on `master`:

```
src/components/bottom-bar/select-button.tsx(65,7): error TS6133: 'OptionalCheck' is declared but its value is never read.
```

Do not fix it — it is outside this work. Any *other* error is yours.

**Step 3: Full Jest suite**

Run: `npm test`
Expected: all suites pass.

**Step 4: Production build**

Run: `npm run build`
Expected: succeeds. This runs `lint:build`, where stray `console.log` calls become errors — remove any you added while debugging.

**Step 5: Full Cypress suite**

Run: `npm run test:cypress`
Expected: all specs pass.

Do not claim the work is done until every one of these five has actually been run and passed. @superpowers:verification-before-completion

---

## Out of scope

- Persisting dismissal across reloads. The modal shows on every load by design.
- Blocking the escape key. Task 3 stops backdrop clicks only. Escape still closes every dialog, which is the standard modal expectation.
- A bespoke warning icon. MUI's `WarningIcon` is a deliberate placeholder.
