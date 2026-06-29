import { render, waitFor } from "@testing-library/react";
import { Provider } from "mobx-react";
import * as React from "react";

jest.mock("@concord-consortium/lara-interactive-api", () => ({
  inIframe: jest.fn(() => false),
}));
import { inIframe } from "@concord-consortium/lara-interactive-api";

import * as interactiveState from "../models/interactive-state";
import { createStores, IStores } from "../models/stores";
import { StoresContext } from "../stores-context";
import * as cloudStorage from "../utils/cloud-storage";
import { AppComponent } from "./app";

import config from "../config";

const renderApp = (_stores?: IStores) => {
  const stores = _stores ?? createStores();
  return render(
    <Provider stores={stores}>
      <StoresContext value={stores}>
        <AppComponent />
      </StoresContext>
    </Provider>
  );
}

describe("App component", () => {
  it("shows index page if authoring parameter is not passed in or is false", () => {
    config.authoring = false;
    const { container } = renderApp();
    expect(container.querySelector(".index")).toBeInTheDocument();
  });
});

describe("App component in authoring mode", () => {
  it("shows authoring page if authoring parameter is passed in or is true", () => {
    config.authoring = true;
    const { container } = renderApp();
    expect(container.querySelector(".authoring")).toBeInTheDocument();
  });
});

describe("AppComponent model loading", () => {
  afterEach(() => { config.modelId = ""; config.authoring = false; jest.restoreAllMocks(); });

  it("loads and restores a cloud model when config.modelId is set", async () => {
    config.modelId = "abc123";
    const migrated = { version: 1, simulation: {}, ui: {} } as any;
    const loadSpy = jest.spyOn(cloudStorage, "loadModelFromCloud").mockResolvedValue(migrated);
    const setSpy = jest.spyOn(interactiveState, "setInteractiveState").mockImplementation(() => undefined);
    const stores = createStores();

    renderApp(stores);

    await waitFor(() => expect(loadSpy).toHaveBeenCalledWith("abc123"));
    await waitFor(() => expect(setSpy).toHaveBeenCalledWith(stores, migrated));
  });

  it("does not load when config.modelId is empty", () => {
    config.modelId = "";
    const loadSpy = jest.spyOn(cloudStorage, "loadModelFromCloud");
    renderApp();
    expect(loadSpy).not.toHaveBeenCalled();
  });

  it("shows the actual error message when loading fails", async () => {
    config.modelId = "abc123";
    jest.spyOn(cloudStorage, "loadModelFromCloud")
      .mockRejectedValue(new Error("Model \"abc123\" could not be loaded (404 Not Found)."));
    const { findByText } = renderApp();
    expect(await findByText(/404 Not Found/)).toBeInTheDocument();
  });

  it("does not load a cloud model when iframed (LARA handles loading)", () => {
    (inIframe as jest.Mock).mockReturnValueOnce(true);
    config.modelId = "abc123";
    const loadSpy = jest.spyOn(cloudStorage, "loadModelFromCloud");
    renderApp();
    expect(loadSpy).not.toHaveBeenCalled();
  });
});
