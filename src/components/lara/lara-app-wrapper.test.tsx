import * as React from "react";
import { render, waitFor } from "@testing-library/react";
import { createStores } from "../../models/stores";
import * as interactiveStateModule from "../../models/interactive-state";
import * as cloudStorage from "../../utils/cloud-storage";
import config from "../../config";

// Records config.mode as of each AppComponent render, so a test can assert the app
// never renders while config still holds pre-authored-state values.
const mockConfigModeAtAppRender: string[] = [];

// Stub heavy children so we only exercise the wrapper's own logic.
jest.mock("../app", () => ({
  AppComponent: () => {
    mockConfigModeAtAppRender.push(require("../../config").default.mode);
    return <div data-test="app-component" />;
  }
}));
jest.mock("./authoring-interface", () => ({ AuthoringInterface: () => <div /> }));
jest.mock("./loading-indicator", () => ({ LoadingIndicator: () => <div data-test="loading" /> }));
jest.mock("../../hooks/use-auto-height", () => ({ useAutoHeight: () => () => undefined }));

// Mock the LARA API hooks. Each test sets the return values.
jest.mock("@concord-consortium/lara-interactive-api", () => ({
  useInitMessage: jest.fn(),
  useInteractiveState: jest.fn(),
  useAuthoredState: jest.fn(),
  setSupportedFeatures: jest.fn(),
  inIframe: jest.fn(() => true),
}));
import { useInitMessage, useInteractiveState, useAuthoredState } from "@concord-consortium/lara-interactive-api";
import { LaraAppWrapper } from "./lara-app-wrapper";

const setHooks = ({ interactiveState }: { interactiveState: any }) => {
  (useInitMessage as jest.Mock).mockReturnValue({ mode: "runtime" });
  (useInteractiveState as jest.Mock).mockReturnValue({ interactiveState, setInteractiveState: jest.fn() });
  (useAuthoredState as jest.Mock).mockReturnValue({ authoredState: null, setAuthoredState: jest.fn() });
};

describe("LaraAppWrapper model seeding", () => {
  afterEach(() => { config.modelId = ""; jest.restoreAllMocks(); jest.clearAllMocks(); });

  it("seeds from config.modelId when there is no saved interactive state", async () => {
    config.modelId = "abc123";
    const migrated = { version: 1, simulation: {}, ui: {} } as any;
    const loadSpy = jest.spyOn(cloudStorage, "loadModelFromCloud").mockResolvedValue(migrated);
    const setSpy = jest.spyOn(interactiveStateModule, "setInteractiveState").mockImplementation(() => undefined);
    setHooks({ interactiveState: undefined });

    render(<LaraAppWrapper stores={createStores()} />);

    await waitFor(() => expect(loadSpy).toHaveBeenCalledWith("abc123"));
    await waitFor(() => expect(setSpy).toHaveBeenCalledWith(expect.anything(), migrated));
  });

  it("does NOT load the cloud model when saved interactive state exists", async () => {
    config.modelId = "abc123";
    const loadSpy = jest.spyOn(cloudStorage, "loadModelFromCloud");
    const setSpy = jest.spyOn(interactiveStateModule, "setInteractiveState").mockImplementation(() => undefined);
    setHooks({ interactiveState: { version: 1, simulation: {}, ui: {} } });

    render(<LaraAppWrapper stores={createStores()} />);
    // give effects a tick
    await waitFor(() => expect(loadSpy).not.toHaveBeenCalled());
    // The saved interactive state should be restored (migrateState upgrades version-1 state to version 2).
    expect(setSpy).toHaveBeenCalledWith(expect.anything(), {
      version: 2, runs: [{ id: "run-1", simulation: {} }], selectedRunId: "run-1", ui: {}
    });
  });

  it("shows the error message when the seed load fails", async () => {
    config.modelId = "abc123";
    jest.spyOn(cloudStorage, "loadModelFromCloud").mockRejectedValue(new Error("404 Not Found"));
    setHooks({ interactiveState: undefined });

    const { findByText } = render(<LaraAppWrapper stores={createStores()} />);
    expect(await findByText(/404 Not Found/)).toBeInTheDocument();
  });

  // Integration test guarding the effect-ordering invariant: the authored-state
  // effect must run (and set config.modelId via the REAL applyAuthoredState) before
  // the seed effect reads config.modelId. config.modelId is NOT set directly here.
  it("seeds from a modelId set by applyAuthoredState parsing authored urlParams", async () => {
    const loadSpy = jest.spyOn(cloudStorage, "loadModelFromCloud")
      .mockResolvedValue({ version: 1, simulation: {}, ui: {} } as any);
    jest.spyOn(interactiveStateModule, "setInteractiveState").mockImplementation(() => undefined);

    (useInitMessage as jest.Mock).mockReturnValue({ mode: "runtime" });
    (useInteractiveState as jest.Mock).mockReturnValue({ interactiveState: undefined, setInteractiveState: jest.fn() });
    (useAuthoredState as jest.Mock).mockReturnValue({
      authoredState: { version: 1, urlParams: "modelId=seed999" },
      setAuthoredState: jest.fn()
    });

    render(<LaraAppWrapper stores={createStores()} />);

    await waitFor(() => expect(loadSpy).toHaveBeenCalledWith("seed999"));
  });

  // config is a plain object, so a component that reads it at mount never re-renders
  // when applyAuthoredState mutates it afterwards. The app must not mount until then.
  it("does not render the app until authored state has been applied", async () => {
    const oldMode = config.mode;
    mockConfigModeAtAppRender.length = 0;
    jest.spyOn(interactiveStateModule, "setInteractiveState").mockImplementation(() => undefined);

    (useInitMessage as jest.Mock).mockReturnValue({ mode: "runtime" });
    (useInteractiveState as jest.Mock).mockReturnValue({ interactiveState: undefined, setInteractiveState: jest.fn() });
    (useAuthoredState as jest.Mock).mockReturnValue({
      authoredState: { version: 1, urlParams: "mode=storm" },
      setAuthoredState: jest.fn()
    });

    const { findByTestId } = render(<LaraAppWrapper stores={createStores()} />);
    await findByTestId("app-component");

    expect(mockConfigModeAtAppRender.length).toBeGreaterThan(0);
    expect(mockConfigModeAtAppRender).not.toContain(oldMode);
    expect(mockConfigModeAtAppRender.every(mode => mode === "storm")).toBe(true);

    config.mode = oldMode;
  });
});
