import * as React from "react";
import { render, waitFor } from "@testing-library/react";
import { createStores } from "../../models/stores";
import * as interactiveStateModule from "../../models/interactive-state";
import * as cloudStorage from "../../utils/cloud-storage";
import config from "../../config";

// Stub heavy children so we only exercise the wrapper's own logic.
jest.mock("../app", () => ({ AppComponent: () => <div data-test="app-component" /> }));
jest.mock("./authoring-interface", () => ({ AuthoringInterface: () => <div /> }));
jest.mock("./loading-indicator", () => ({ LoadingIndicator: () => <div data-test="loading" /> }));
jest.mock("../../utils/apply-authored-state", () => ({ applyAuthoredState: jest.fn() }));
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
    jest.spyOn(interactiveStateModule, "setInteractiveState").mockImplementation(() => undefined);
    setHooks({ interactiveState: { version: 1, simulation: {}, ui: {} } });

    render(<LaraAppWrapper stores={createStores()} />);
    // give effects a tick
    await waitFor(() => expect(loadSpy).not.toHaveBeenCalled());
  });

  it("shows the error message when the seed load fails", async () => {
    config.modelId = "abc123";
    jest.spyOn(cloudStorage, "loadModelFromCloud").mockRejectedValue(new Error("404 Not Found"));
    setHooks({ interactiveState: undefined });

    const { findByText } = render(<LaraAppWrapper stores={createStores()} />);
    expect(await findByText(/404 Not Found/)).toBeInTheDocument();
  });
});
