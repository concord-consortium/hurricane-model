# Remote Model Sharing via `modelId` Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let a user save the current simulation state to the cloud and share it via a `?modelId=<id>` URL that restores that state on load.

**Architecture:** A new `cloud-storage` util uploads the existing `IHurricaneInteractiveState` (gzipped) to S3 through Concord's `token-service` and returns an id; a self-contained `ShareModelButton` (top of the existing Share dialog) drives the save and shows the id + link in its own result dialog; on startup, `?modelId=` is loaded and restored — always in standalone, and as a seed-only fallback in LARA (saved student work wins).

**Tech Stack:** TypeScript, React, MobX, `@concord-consortium/token-service`, `aws-sdk`, `pako`, Jest + Testing Library.

**Design doc:** [docs/plans/2026-06-27-remote-model-sharing-design.md](2026-06-27-remote-model-sharing-design.md)

## Reference facts (verified against the codebase / tectonic-explorer)

- Existing serialization lives in [src/models/interactive-state.ts](../../src/models/interactive-state.ts):
  `getInteractiveState(stores): IHurricaneInteractiveState`,
  `setInteractiveState(stores, state)`, and
  `migrateState(state: unknown): IHurricaneInteractiveState | null`. **Reuse these — do not invent a new format.**
- The URL-param loop at the bottom of [src/config.ts](../../src/config.ts) copies any `?key=` into `config[key]` for every key present in `DEFAULT_CONFIG`. So a `modelId: ""` default is all that's needed to read `?modelId=`.
- `log(eventName, params?)` from [src/log.ts](../../src/log.ts) takes plain string event names (e.g. existing `log("ShareDialogOpened")`).
- The shared `Dialog` component ([src/components/dialog.tsx](../../src/components/dialog.tsx)) takes `{ open, onClose, title, children }`.
- Stores in functional components come from `useStores()` ([src/stores-context.tsx](../../src/stores-context.tsx)); in class components from `this.stores` ([src/components/base.ts](../../src/components/base.ts)) when wrapped in mobx-react `<Provider stores={...}>`.
- On load, the browser transparently decompresses gzip (the object is uploaded with `ContentEncoding: "gzip"`), so loading is just `fetch(url).then(r => r.json())` — **no manual pako inflate on read.**

---

### Task 1: Add dependencies

**Files:**
- Modify: `package.json` (via npm)

**Step 1: Install runtime + types**

Run:
```bash
npm install @concord-consortium/token-service aws-sdk pako
npm install --save-dev @types/pako
```
Expected: packages added to `package.json`, no peer-dep errors that fail the install.

**Step 2: Verify the app still builds/lints**

Run: `npm run lint`
Expected: PASS (no new files yet, just deps).

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add token-service, aws-sdk, pako for model sharing"
```

---

### Task 2: Cloud-storage module

**Files:**
- Create: `src/utils/cloud-storage.ts`
- Test: `src/utils/cloud-storage.test.ts`

**Step 1: Write the failing test**

`src/utils/cloud-storage.test.ts`:
```ts
import { saveModelToCloud, loadModelFromCloud } from "./cloud-storage";
import type { IHurricaneInteractiveState } from "../types/interactive-state";

// --- token-service / aws-sdk / pako mocks ---
const uploadPromise = jest.fn().mockResolvedValue({});
const upload = jest.fn(() => ({ promise: uploadPromise }));
jest.mock("aws-sdk/clients/s3", () =>
  jest.fn().mockImplementation(() => ({ upload }))
);

const createResource = jest.fn().mockResolvedValue({
  id: "abc123", bucket: "models-bucket", region: "us-east-1"
});
const getReadWriteToken = jest.fn().mockReturnValue("rwtoken");
const getCredentials = jest.fn().mockResolvedValue({
  accessKeyId: "AK", secretAccessKey: "SK", sessionToken: "ST"
});
const getPublicS3Path = jest.fn().mockReturnValue("hurricane-models/abc123/model.json.gz");
jest.mock("@concord-consortium/token-service", () => ({
  TokenServiceClient: jest.fn().mockImplementation(() => ({
    createResource, getReadWriteToken, getCredentials, getPublicS3Path
  }))
}));

jest.mock("pako", () => ({ gzip: jest.fn((s: string) => new Uint8Array([1, 2, 3])) }));

const sampleState = { version: 1, simulation: {}, ui: {} } as unknown as IHurricaneInteractiveState;

describe("cloud-storage", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("saveModelToCloud", () => {
    it("creates a hurricane-models resource and returns its id", async () => {
      const id = await saveModelToCloud(sampleState);
      expect(id).toBe("abc123");
      expect(createResource).toHaveBeenCalledWith(
        expect.objectContaining({ tool: "hurricane-models", type: "s3Folder" })
      );
      expect(upload).toHaveBeenCalledWith(expect.objectContaining({
        Bucket: "models-bucket",
        Key: "hurricane-models/abc123/model.json.gz",
        ContentEncoding: "gzip"
      }));
    });
  });

  describe("loadModelFromCloud", () => {
    it("fetches the gzip URL and returns migrated state", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true, json: async () => ({ version: 1, simulation: { season: "fall" }, ui: {} })
      }) as any;
      const state = await loadModelFromCloud("abc123");
      expect(global.fetch).toHaveBeenCalledWith(
        "https://models-resources.concord.org/hurricane-models/abc123/model.json.gz"
      );
      expect(state.version).toBe(1);
    });

    it("throws a descriptive error on a non-ok response", async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404, statusText: "Not Found" }) as any;
      await expect(loadModelFromCloud("missing")).rejects.toThrow(/missing.*404 Not Found/);
    });

    it("throws an incompatibility error when migrateState returns null", async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ version: 999 }) }) as any;
      await expect(loadModelFromCloud("abc123")).rejects.toThrow(/incompatible/i);
    });

    it("propagates the error when fetch rejects (network failure)", async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error("network down")) as any;
      await expect(loadModelFromCloud("abc123")).rejects.toThrow("network down");
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/utils/cloud-storage.test.ts`
Expected: FAIL — `Cannot find module './cloud-storage'`.

**Step 3: Write the implementation**

`src/utils/cloud-storage.ts`:
```ts
import { TokenServiceClient, S3Resource } from "@concord-consortium/token-service";
import pako from "pako";
import S3 from "aws-sdk/clients/s3";
import { IHurricaneInteractiveState } from "../types/interactive-state";
import { migrateState } from "../models/interactive-state";

const TOOL_NAME = "hurricane-models";
const FILENAME = "model.json.gz";

/**
 * Uploads the serialized interactive state to S3 via Concord's token-service.
 * Resolves to the resource id, which is used as the shareable `modelId`.
 */
export async function saveModelToCloud(state: IHurricaneInteractiveState): Promise<string> {
  const client = new TokenServiceClient({ env: "production" });
  const resource = await client.createResource({
    tool: TOOL_NAME,
    type: "s3Folder",
    name: FILENAME,
    description: "Created by Hurricane Explorer",
    accessRuleType: "readWriteToken"
  }) as S3Resource;

  const readWriteToken = client.getReadWriteToken(resource) || "";
  const credentials = await client.getCredentials(resource.id, readWriteToken);

  const { bucket, region } = resource;
  const { accessKeyId, secretAccessKey, sessionToken } = credentials;
  const s3 = new S3({ region, accessKeyId, secretAccessKey, sessionToken });
  const publicPath = client.getPublicS3Path(resource, FILENAME);

  const compressed = pako.gzip(JSON.stringify(state));
  const blob = new Blob([compressed], { type: "application/gzip" });

  await s3.upload({
    Bucket: bucket,
    Key: publicPath,
    Body: blob,
    ContentType: "application/json",
    ContentEncoding: "gzip",
    CacheControl: "public, max-age=31536000, immutable" // immutable, cache for a year
  }).promise();

  return resource.id;
}

/**
 * Loads a previously saved model by id. The browser decompresses the gzip
 * transparently (it was uploaded with ContentEncoding: gzip), so we just parse
 * JSON. Throws a descriptive Error on any failure so callers can surface the
 * message to the user (a network rejection from fetch propagates as-is).
 */
export async function loadModelFromCloud(modelId: string): Promise<IHurricaneInteractiveState> {
  const url = `https://models-resources.concord.org/${TOOL_NAME}/${modelId}/${FILENAME}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Model "${modelId}" could not be loaded (${response.status} ${response.statusText}).`);
  }
  const data = await response.json();
  const migrated = migrateState(data);
  if (!migrated) {
    throw new Error(`Model "${modelId}" is incompatible with this version of Hurricane Explorer.`);
  }
  return migrated;
}
```

**Step 4: Run test to verify it passes**

Run: `npx jest src/utils/cloud-storage.test.ts`
Expected: PASS (5 tests).

**Step 5: Commit**

```bash
git add src/utils/cloud-storage.ts src/utils/cloud-storage.test.ts
git commit -m "feat: add cloud-storage util for saving/loading model state to S3"
```

---

### Task 3: Add `modelId` to config

**Files:**
- Modify: `src/config.ts` (inside `DEFAULT_CONFIG`)

**Step 1: Add the default**

In `DEFAULT_CONFIG` (near the developer-tools / top of config object — placement doesn't matter functionally), add:
```ts
  // Identifier of a model saved to the cloud (hurricane-models S3 tool).
  // When set via ?modelId=..., the saved state is loaded on startup.
  modelId: "",
```

**Step 2: Verify the param is read**

Run:
```bash
npx jest -t "config" 2>/dev/null; npm run lint
```
Expected: lint PASS. (No dedicated config test exists; the URL-param loop already handles any DEFAULT_CONFIG key, so no new test is required here — it's exercised end-to-end in Tasks 6–7.)

**Step 3: Commit**

```bash
git add src/config.ts
git commit -m "feat: add modelId config param"
```

---

### Task 4: `ShareModelButton` component

A self-contained functional component: button + its own result dialog + save/error state. Decoupled from the Share dialog so it can be relocated later.

**Files:**
- Create: `src/components/top-bar/share-model-button.tsx`
- Test: `src/components/top-bar/share-model-button.test.tsx`

**Step 1: Write the failing test**

`src/components/top-bar/share-model-button.test.tsx`:
```ts
import * as React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StoresContext } from "../../stores-context";
import { createStores } from "../../models/stores";
import { ShareModelButton } from "./share-model-button";
import * as cloudStorage from "../../utils/cloud-storage";
import * as logModule from "../../log";

jest.spyOn(logModule, "log").mockImplementation(() => undefined);

const renderButton = () => {
  const stores = createStores();
  return render(
    <StoresContext value={stores}>
      <ShareModelButton />
    </StoresContext>
  );
};

describe("ShareModelButton", () => {
  beforeEach(() => jest.clearAllMocks());

  it("saves the model and shows the id and link in a dialog", async () => {
    jest.spyOn(cloudStorage, "saveModelToCloud").mockResolvedValue("abc123");
    const user = userEvent.setup();
    renderButton();

    await user.click(screen.getByTestId("share-model-button"));

    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    expect(screen.getByDisplayValue("abc123")).toBeInTheDocument();
    expect(screen.getByDisplayValue(/modelId=abc123/)).toBeInTheDocument();
    expect(logModule.log).toHaveBeenCalledWith("ModelShared", expect.objectContaining({ modelId: "abc123" }));
  });

  it("shows the actual error message when saving fails", async () => {
    jest.spyOn(cloudStorage, "saveModelToCloud").mockRejectedValue(new Error("S3 upload failed"));
    const user = userEvent.setup();
    renderButton();

    await user.click(screen.getByTestId("share-model-button"));

    await waitFor(() => expect(screen.getByText(/S3 upload failed/)).toBeInTheDocument());
    // Button is usable again after failure
    expect(screen.getByTestId("share-model-button")).not.toBeDisabled();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/components/top-bar/share-model-button.test.tsx`
Expected: FAIL — cannot find module `./share-model-button`.

**Step 3: Write the implementation**

`src/components/top-bar/share-model-button.tsx`:
```tsx
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
```

**Step 4: Run test to verify it passes**

Run: `npx jest src/components/top-bar/share-model-button.test.tsx`
Expected: PASS (2 tests).

**Step 5: Commit**

```bash
git add src/components/top-bar/share-model-button.tsx src/components/top-bar/share-model-button.test.tsx
git commit -m "feat: add self-contained ShareModelButton with result dialog"
```

---

### Task 5: Place the button at the top of the Share dialog

**Files:**
- Modify: `src/components/top-bar/share-dialog-content.tsx`
- Modify: `src/components/top-bar/top-bar.test.tsx` (add a presence test)

**Step 1: Write the failing test**

`ShareModelButton` reads stores via `useStores()` from `StoresContext`, so any test
that opens the share dialog must provide `StoresContext` in addition to the mobx-react
`<Provider>` (the production tree provides both — see [src/index.tsx](../../src/index.tsx)).

First, add the import to `top-bar.test.tsx`:
```ts
import { StoresContext } from "../../stores-context";
```

Then update the existing renders that open the **share** dialog (the "opens share dialog"
test, plus the new one below) to wrap with both providers. `ShareModelButton` only mounts
once the dialog opens, so the reload/about tests don't strictly need it — but wrapping them
too is harmless and keeps the file consistent. A small helper avoids repetition:
```ts
  const renderTopBar = () =>
    render(
      <Provider stores={stores}>
        <StoresContext value={stores}>
          <TopBar />
        </StoresContext>
      </Provider>
    );
```
Use `renderTopBar()` in place of the inline `render(<Provider…>)` calls, and add the new test
inside `describe("Share button", ...)`:
```ts
    it("shows the Share Model button in the share dialog", async () => {
      const user = userEvent.setup();
      renderTopBar();
      await user.click(screen.getByTestId("share"));
      expect(screen.getByTestId("share-model-button")).toBeInTheDocument();
    });
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/components/top-bar/top-bar.test.tsx -t "Share Model button"`
Expected: FAIL — `share-model-button` not in document.

**Step 3: Add the button to the dialog**

In `share-dialog-content.tsx`, import and render the button at the top, leaving the rest untouched:
```tsx
import * as React from "react";
import { Copyright } from "./copyright";
import { ShareModelButton } from "./share-model-button";

// ...getURL / getIframeString unchanged...

export class ShareDialogContent extends React.Component {
  public render() {
    return (
      <div>
        <ShareModelButton />
        <p>
          Paste this link in email or IM.
          <textarea id="page-url" style={{ width: "100%" }} value={getURL()} readOnly={true} />
        </p>
        {/* ...rest unchanged... */}
        <Copyright/>
      </div>
    );
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `npx jest src/components/top-bar/top-bar.test.tsx`
Expected: PASS (all TopBar tests, including the new one).

**Step 5: Commit**

```bash
git add src/components/top-bar/share-dialog-content.tsx src/components/top-bar/top-bar.test.tsx
git commit -m "feat: render ShareModelButton at top of share dialog"
```

---

### Task 6: Load `modelId` on startup (standalone)

In standalone (non-iframed) mode, if `config.modelId` is set, load the cloud model and restore it. modelId is the only state source standalone, so it always wins.

**Files:**
- Modify: `src/components/app.tsx`
- Test: `src/components/app.test.tsx`

**Step 1: Write the failing test**

`src/components/app.test.tsx`:
```ts
import * as React from "react";
import { render, waitFor } from "@testing-library/react";
import { Provider } from "mobx-react";
import { createStores } from "../models/stores";
import { AppComponent } from "./app";
import * as cloudStorage from "../utils/cloud-storage";
import * as interactiveState from "../models/interactive-state";
import config from "../config";

describe("AppComponent model loading", () => {
  afterEach(() => { config.modelId = ""; jest.restoreAllMocks(); });

  it("loads and restores a cloud model when config.modelId is set", async () => {
    config.modelId = "abc123";
    const migrated = { version: 1, simulation: {}, ui: {} } as any;
    const loadSpy = jest.spyOn(cloudStorage, "loadModelFromCloud").mockResolvedValue(migrated);
    const setSpy = jest.spyOn(interactiveState, "setInteractiveState").mockImplementation(() => undefined);
    const stores = createStores();

    render(<Provider stores={stores}><AppComponent /></Provider>);

    await waitFor(() => expect(loadSpy).toHaveBeenCalledWith("abc123"));
    await waitFor(() => expect(setSpy).toHaveBeenCalledWith(stores, migrated));
  });

  it("does not load when config.modelId is empty", () => {
    config.modelId = "";
    const loadSpy = jest.spyOn(cloudStorage, "loadModelFromCloud");
    const stores = createStores();
    render(<Provider stores={stores}><AppComponent /></Provider>);
    expect(loadSpy).not.toHaveBeenCalled();
  });

  it("shows the actual error message when loading fails", async () => {
    config.modelId = "abc123";
    jest.spyOn(cloudStorage, "loadModelFromCloud")
      .mockRejectedValue(new Error("Model \"abc123\" could not be loaded (404 Not Found)."));
    const stores = createStores();
    const { findByText } = render(<Provider stores={stores}><AppComponent /></Provider>);
    expect(await findByText(/404 Not Found/)).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/components/app.test.tsx`
Expected: FAIL — `loadModelFromCloud` not called (no load logic yet).

**Step 3: Implement load-on-mount**

In `app.tsx`, add a `componentDidMount` and a `modelLoading` state. `this.stores` is available via the mobx-react `<Provider>`.
```tsx
import * as React from "react";
import { BaseComponent, IBaseProps } from "./base";
import { Authoring } from "./authoring/authoring";
import { IndexPage } from "./index-page";
import { loadModelFromCloud } from "../utils/cloud-storage";
import { setInteractiveState } from "../models/interactive-state";
import config from "../config";
import css from "./app.scss";

interface IProps extends IBaseProps {}
interface IState { modelLoading: boolean; modelLoadError: string | null; }

export class AppComponent extends BaseComponent<IProps, IState> {
  constructor(props: IProps) {
    super(props);
    this.state = { modelLoading: false, modelLoadError: null };
  }

  public async componentDidMount() {
    if (config.modelId) {
      this.setState({ modelLoading: true });
      try {
        const state = await loadModelFromCloud(config.modelId);
        setInteractiveState(this.stores, state);
        this.setState({ modelLoading: false });
      } catch (e) {
        this.setState({
          modelLoading: false,
          modelLoadError: e instanceof Error ? e.message : String(e)
        });
      }
    }
  }

  public render() {
    return (
      <div className={css.app}>
        {this.state.modelLoadError &&
          <div className={css.modelLoadError}>Couldn&apos;t load the shared model: {this.state.modelLoadError}</div>}
        {
          config.authoring ?
          <Authoring /> : <IndexPage />
        }
      </div>
    );
  }
}
```
(The `modelLoading` flag is available for a spinner if desired; a minimal implementation may just guard rendering. The non-blocking error banner showing the actual message is the required behavior. Add a `.modelLoadError` rule to `app.scss` for styling.)

**Step 4: Run test to verify it passes**

Run: `npx jest src/components/app.test.tsx`
Expected: PASS (3 tests).

**Step 5: Commit**

```bash
git add src/components/app.tsx src/components/app.test.tsx
git commit -m "feat: load and restore cloud model from modelId on standalone startup"
```

---

### Task 7: LARA fallback load (seed-only when no saved work)

In LARA, a saved student `interactiveState` must win. Only when there is no saved work do we load `config.modelId` as the initial seed.

**Files:**
- Modify: `src/components/lara/lara-app-wrapper.tsx` (the restore `useEffect` near line 113–125)
- Test: `src/components/lara/lara-app-wrapper.test.tsx` (extend if present; otherwise add a focused test)

**Step 1: Write the failing test**

Add tests asserting:
- when `interactiveState` is empty/undefined and `config.modelId` is set, `loadModelFromCloud` is called and its result passed to `setInteractiveState`;
- when `interactiveState` exists, `loadModelFromCloud` is NOT called;
- when the seed load fails (mock `loadModelFromCloud` to reject with a message), the error message is rendered in the banner.

Mock `cloud-storage` and `interactive-state` the same way as Task 6. (Mirror the existing test structure in the wrapper's test file; if no test file exists, create `lara-app-wrapper.test.tsx` with a minimal harness that provides a fake `interactiveState` via the `lara-interactive-api` mock already used in the repo.)

**Step 2: Run test to verify it fails**

Run: `npx jest src/components/lara/lara-app-wrapper.test.tsx`
Expected: FAIL — modelId fallback not wired.

**Step 3: Implement the fallback**

Add a `modelLoadError` state near the top of the component:
```tsx
  const [modelLoadError, setModelLoadError] = useState<string | null>(null);
```
In the restore effect, after the existing `interactiveState` branch, add an `else if (config.modelId)` fallback that loads and restores once (guard with the existing `hasRestoredState` ref). Because `loadModelFromCloud` now throws, catch the error and surface its message; mark restored in `finally` so a failed seed-load doesn't block the save reaction:
```tsx
  useEffect(() => {
    if (hasRestoredState.current) return;

    if (interactiveState) {
      const migratedState = migrateState(interactiveState);
      if (migratedState) {
        setInteractiveState(stores, migratedState);
      }
      hasRestoredState.current = true;
    } else if (config.modelId) {
      // No saved student work — seed from the shared model.
      loadModelFromCloud(config.modelId)
        .then((state) => {
          if (!hasRestoredState.current) {
            setInteractiveState(stores, state);
          }
        })
        .catch((e) => {
          setModelLoadError(e instanceof Error ? e.message : String(e));
        })
        .finally(() => {
          // Mark restored so a failed seed-load doesn't block the save reaction.
          hasRestoredState.current = true;
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stores is stable
  }, [interactiveState]);
```
Render a non-blocking banner in the wrapper's returned JSX when `modelLoadError` is set, e.g.:
```tsx
  {modelLoadError &&
    <div className="model-load-error">Couldn&apos;t load the shared model: {modelLoadError}</div>}
```
Add the imports: `import { loadModelFromCloud } from "../../utils/cloud-storage";`,
`import config from "../../config";` (if not already imported), and ensure `useState` is
imported from `react`.

Note: `interactiveState` from LARA may be `undefined` until the init message resolves. Preserve existing behavior — only treat a genuinely empty/absent interactiveState as "no saved work". Verify against the current dependency/guard logic before finalizing; do not regress the existing restore path.

**Step 4: Run tests to verify they pass**

Run: `npx jest src/components/lara/lara-app-wrapper.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/lara/lara-app-wrapper.tsx src/components/lara/lara-app-wrapper.test.tsx
git commit -m "feat: seed from modelId in LARA when no saved interactive state"
```

---

### Task 8: Document the new log event

**Files:**
- Modify: `LOGGED-EVENTS.md`

**Step 1: Add the `ModelShared` event**

Add an entry matching the file's existing format, documenting `ModelShared` — parameters: `{ modelId }`; trigger: user clicks the Share Model button and the upload succeeds.

**Step 2: Commit**

```bash
git add LOGGED-EVENTS.md
git commit -m "docs: document ModelShared log event"
```

---

### Task 9: Full verification

**Step 1: Lint + unit tests + unused-locals**

Run:
```bash
npm run lint
npm test
npm run lint:unused
```
Expected: all PASS. If Jest complains that `aws-sdk`, `@concord-consortium/token-service`, or `pako` ship ESM that isn't transformed, add the offending package name to `transformIgnorePatterns` in `package.json` (per CLAUDE.md). The unit tests mock these modules, so this should not arise — only adjust if a real error appears.

**Step 2: Manual smoke (optional, requires token-service access)**

- `npm start`, open the app, click Share → Share Model. Confirm a model code + `?modelId=` link appear.
- Open the generated link in a fresh tab. Confirm the saved state is restored.
- Use the `/verify` skill or `/run` skill to drive this if desired.

**Step 3: Final commit (if any verification fixups were needed)**

```bash
git add -A
git commit -m "chore: verification fixups for model sharing"
```

---

## Notes / risks

- **token-service tool registration:** `hurricane-models` must be registered in Concord's production token-service for `createResource`/`getCredentials` to succeed. If saving fails in production with an auth/tool error, that registration is the cause — coordinate with Concord infra. (Unit tests mock this, so they pass regardless.)
- **aws-sdk size:** `aws-sdk/clients/s3` is imported via its per-client path (as in tectonic) to limit bundle bloat. Confirm the production build size is acceptable; consider `@aws-sdk/client-s3` (v3, modular) only if v2 bloat is a problem — but v2 matches the reference exactly and is the safe default here.
- **Out of scope:** no config flag to hide the button, no Firebase, no new serialization format/version, no backend service.
