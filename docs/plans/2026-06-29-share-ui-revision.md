# Share UI Revision Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the "Share Model" button + result modal with automatic upload when the Share dialog opens, showing the `?modelId=` link (or "Saving model...") in a new field at the bottom of the existing Share dialog.

**Architecture:** `ShareDialogContent` becomes a functional component that uploads the current interactive state on mount (the MUI `Dialog` unmounts children on close, so mounting == the Share button being pressed). It tracks saving/modelId/error and renders a new bottom field with three states. The `ShareModelButton` component and its modal are deleted. Storage util, config, and standalone/LARA load logic are untouched.

**Tech Stack:** React (functional + hooks), MobX (`useStores`), Jest + Testing Library.

**Design doc:** [docs/plans/2026-06-29-share-ui-revision-design.md](2026-06-29-share-ui-revision-design.md)

## Reference facts
- `saveModelToCloud(state): Promise<string>` (`src/utils/cloud-storage.ts`) throws a descriptive Error on failure.
- `getInteractiveState(stores)` (`src/models/interactive-state.ts`) returns the serializable state.
- `useStores()` (`src/stores-context.tsx`) returns the MobX stores; requires a `StoresContext` provider (production provides it via `index.tsx`; `top-bar.test.tsx` already wraps with it via its `renderTopBar` helper).
- The repo's Testing Library `testIdAttribute` is `data-test` (see `src/setupTests.js`).
- Current `share-dialog-content.tsx` is a class component rendering `<ShareModelButton />`, a page-URL `<textarea id="page-url">`, an iframe `<textarea id="iframe-string">`, and `<Copyright/>`.

---

### Task 1: Auto-upload in ShareDialogContent + new field

**Files:**
- Modify (rewrite): `src/components/top-bar/share-dialog-content.tsx`
- Create: `src/components/top-bar/share-dialog-content.test.tsx`

**Step 1: Write the failing test**

`src/components/top-bar/share-dialog-content.test.tsx`:
```tsx
import * as React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { StoresContext } from "../../stores-context";
import { createStores } from "../../models/stores";
import { ShareDialogContent } from "./share-dialog-content";
import * as cloudStorage from "../../utils/cloud-storage";
import * as logModule from "../../log";

jest.spyOn(logModule, "log").mockImplementation(() => undefined);

const renderDialog = () =>
  render(
    <StoresContext value={createStores()}>
      <ShareDialogContent />
    </StoresContext>
  );

describe("ShareDialogContent", () => {
  beforeEach(() => jest.clearAllMocks());

  it("shows 'Saving model...' while the upload is in flight", async () => {
    let resolveSave: (id: string) => void = () => undefined;
    jest.spyOn(cloudStorage, "saveModelToCloud")
      .mockReturnValue(new Promise<string>((resolve) => { resolveSave = resolve; }));
    renderDialog();
    expect(screen.getByTestId("share-model-saving")).toBeInTheDocument();
    resolveSave("abc123");
    await waitFor(() => expect(screen.queryByTestId("share-model-saving")).not.toBeInTheDocument());
  });

  it("shows the labeled modelId link after a successful upload and logs ModelShared", async () => {
    jest.spyOn(cloudStorage, "saveModelToCloud").mockResolvedValue("abc123");
    renderDialog();
    await waitFor(() => expect(screen.getByTestId("share-model-url")).toBeInTheDocument());
    expect(screen.getByDisplayValue(/modelId=abc123/)).toBeInTheDocument();
    expect(screen.getByText(/To share this exact model state in email or IM, copy this link:/)).toBeInTheDocument();
    expect(logModule.log).toHaveBeenCalledWith("ModelShared", expect.objectContaining({ modelId: "abc123" }));
  });

  it("shows the actual error message when the upload fails", async () => {
    jest.spyOn(cloudStorage, "saveModelToCloud").mockRejectedValue(new Error("S3 upload failed"));
    renderDialog();
    await waitFor(() => expect(screen.getByText(/S3 upload failed/)).toBeInTheDocument());
  });

  it("still renders the page URL and iframe embed fields", async () => {
    jest.spyOn(cloudStorage, "saveModelToCloud").mockResolvedValue("abc123");
    const { container } = renderDialog();
    expect(container.querySelector("#page-url")).toBeInTheDocument();
    expect(container.querySelector("#iframe-string")).toBeInTheDocument();
    // Await the async save so its state update doesn't leak past the test (act warning).
    await waitFor(() => expect(screen.getByTestId("share-model-url")).toBeInTheDocument());
  });
});
```

**Step 2: Run to verify it fails**

Run: `npx jest src/components/top-bar/share-dialog-content.test.tsx`
Expected: FAIL — no `share-model-saving`/`share-model-url` elements (component still a class rendering the old button).

**Step 3: Rewrite the component**

`src/components/top-bar/share-dialog-content.tsx`:
```tsx
import * as React from "react";
import { useEffect, useState } from "react";
import {Copyright} from "./copyright";
import { useStores } from "../../stores-context";
import { getInteractiveState } from "../../models/interactive-state";
import { saveModelToCloud } from "../../utils/cloud-storage";
import { log } from "../../log";

const getURL = () => {
  return window.location.href;
};

const getIframeString = () => {
  return `<iframe width='1000px' height='800px' frameborder='no' scrolling='no' ` +
         `allowfullscreen='true' src='${getURL()}'></iframe>`;
};

const buildModelUrl = (modelId: string) =>
  window.location.href.split("?")[0] + "?modelId=" + modelId;

export const ShareDialogContent: React.FC = () => {
  const stores = useStores();
  const [saving, setSaving] = useState(true);
  const [modelId, setModelId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Upload the current model when the dialog opens (the component mounts fresh
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
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setSaving(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- upload once on mount; stores is stable
  }, []);

  return (
    <div>
      <p>
        Paste this link in email or IM.
        <textarea id="page-url" style={{ width: "100%" }} value={getURL()} readOnly={true} />
      </p>
      <p>
        Paste HTML to embed in website or blog.
        <textarea id="iframe-string" style={{ width: "100%" }} value={getIframeString()} readOnly={true} />
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
              style={{ width: "100%" }}
              value={buildModelUrl(modelId)}
              readOnly={true}
            />
          </>}
      </p>
      <Copyright/>
    </div>
  );
};
```

**Step 4: Run to verify it passes**

Run: `npx jest src/components/top-bar/share-dialog-content.test.tsx`
Expected: PASS (4 tests).

**Step 5: Commit**

```bash
git add src/components/top-bar/share-dialog-content.tsx src/components/top-bar/share-dialog-content.test.tsx
git commit -m "feat: auto-upload model on share dialog open, show modelId link field"
```

---

### Task 2: Remove ShareModelButton and fix top-bar test

At this point `share-dialog-content.tsx` no longer imports `ShareModelButton`, so the component and its test are dead. Also, opening the Share dialog now mounts `ShareDialogContent`, which calls `saveModelToCloud` — `top-bar.test.tsx` must mock it so the "opens share dialog" test doesn't hit the network.

**Files:**
- Delete: `src/components/top-bar/share-model-button.tsx`
- Delete: `src/components/top-bar/share-model-button.test.tsx`
- Modify: `src/components/top-bar/top-bar.test.tsx`

**Step 1: Delete the button files**

```bash
git rm src/components/top-bar/share-model-button.tsx src/components/top-bar/share-model-button.test.tsx
```

**Step 2: Update `top-bar.test.tsx`**

- Add a mock so opening the dialog is inert. Near the top of the file (with the other imports/mocks):
  ```ts
  import * as cloudStorage from "../../utils/cloud-storage";
  jest.spyOn(cloudStorage, "saveModelToCloud").mockResolvedValue("test-model-id");
  ```
- Remove the now-obsolete test `it("shows the Share Model button in the share dialog", ...)` (the button no longer exists). Keep the `it("opens share dialog", ...)` test and the `renderTopBar` helper (it still needs `StoresContext` because `ShareDialogContent` now calls `useStores()`).

**Step 3: Run the affected tests**

Run: `npx jest src/components/top-bar/top-bar.test.tsx`
Expected: PASS. The "opens share dialog" test still asserts the dialog appears; `saveModelToCloud` is mocked so no network call occurs. If a React `act()` warning appears from the async save state update, wrap the assertion in `await waitFor(...)` or await a microtask after clicking share.

**Step 4: Verify no dangling references**

Run: `grep -rn "ShareModelButton\|share-model-button" src/`
Expected: no matches.

**Step 5: Commit**

```bash
git add -A
git commit -m "refactor: remove ShareModelButton in favor of auto-share on dialog open"
```

---

### Task 3: Update LOGGED-EVENTS.md

**Files:**
- Modify: `LOGGED-EVENTS.md`

**Step 1: Update the ModelShared trigger**

Change the `ModelShared` row's "When" text from the click-based wording to reflect the new trigger:
```
| `ModelShared` | `{ modelId }` | The Share dialog is opened and the simulation state is successfully saved to the cloud (`modelId` is the shareable id) |
```

**Step 2: Commit**

```bash
git add LOGGED-EVENTS.md
git commit -m "docs: update ModelShared trigger for auto-share on dialog open"
```

---

### Task 4: Full verification

**Step 1: Lint, tests, unused-locals**

Run:
```bash
npm run lint
npm test
npm run lint:unused
```
Expected: lint 0 errors; full test suite passes; `lint:unused` shows only the pre-existing `select-button.tsx` `OptionalCheck` error (unrelated to this change — do not fix here).

**Step 2: Commit any fixups if needed**

```bash
git add -A
git commit -m "chore: verification fixups for share UI revision"
```

## Notes
- No change to `cloud-storage.ts`, `config.modelId`, `app.tsx`, or `lara-app-wrapper.tsx`.
- Exact user-facing strings: `Saving model...` and `To share this exact model state in email or IM, copy this link:`.
