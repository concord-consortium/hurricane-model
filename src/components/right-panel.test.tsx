import * as React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createStores } from "../models/stores";
import { Provider } from "mobx-react";
import { RightPanel } from "./right-panel";
import config from "../config";

describe("Right Panel component", () => {
  let stores = createStores();
  beforeEach(() => {
    stores = createStores();
  });

  it("renders basic components", () => {
    const { container } = render(
      <Provider stores={stores}>
        <RightPanel />
      </Provider>
    );
    expect(container.querySelectorAll("ul")).toHaveLength(1);
    expect(container.querySelectorAll("li")).toHaveLength(2);
    // default is the base maps panel
    expect(screen.queryByTestId("base-panel")).toBeInTheDocument();
    // overlay panel is not rendered until the tab is clicked
    expect(screen.queryByTestId("overlay-panel")).not.toBeInTheDocument();
  });

  it("opens when a tab is clicked", async () => {
    const user = userEvent.setup();
    render(
      <Provider stores={stores}>
        <RightPanel />
      </Provider>
    );
    // right panel hidden by default
    expect(screen.getByTestId("right-panel")).not.toHaveClass("open");
    await user.click(screen.getByTestId("tab-base"));
    expect(screen.getByTestId("right-panel")).toHaveClass("open");
    // looking at base maps panel, no overlay panel rendered
    expect(screen.queryByTestId("base-panel")).toBeInTheDocument();
    expect(screen.queryByTestId("overlay-panel")).not.toBeInTheDocument();
  });

  it("remains open when a different tab is clicked", async () => {
    const user = userEvent.setup();
    render(
      <Provider stores={stores}>
        <RightPanel />
      </Provider>
    );
    expect(screen.getByTestId("right-panel")).not.toHaveClass("open");
    await user.click(screen.getByTestId("tab-base"));
    expect(screen.getByTestId("right-panel")).toHaveClass("open");
    await user.click(screen.getByTestId("tab-overlay"));
    expect(screen.getByTestId("right-panel")).toHaveClass("open");
  });

  it("closes when the same tab is clicked", async () => {
    const user = userEvent.setup();
    render(
      <Provider stores={stores}>
        <RightPanel />
      </Provider>
    );
    expect(screen.getByTestId("right-panel")).not.toHaveClass("open");
    await user.click(screen.getByTestId("tab-base"));
    expect(screen.getByTestId("right-panel")).toHaveClass("open");
    await user.click(screen.getByTestId("tab-base"));
    expect(screen.getByTestId("right-panel")).not.toHaveClass("open");
  });

  it("provides the population base map option when configured to do so", async () => {
    const user = userEvent.setup();
    const defaultValue = config.enablePopulationMap;

    config.enablePopulationMap = true;
    const { unmount } = render(
      <Provider stores={stores}>
        <RightPanel />
      </Provider>
    );
    await user.click(screen.getByTestId("tab-base"));
    expect(screen.queryByTestId("base-panel")).toBeInTheDocument();
    expect(screen.queryByTestId("map-button-population")).toBeInTheDocument();
    unmount();

    config.enablePopulationMap = false;
    render(
      <Provider stores={stores}>
        <RightPanel />
      </Provider>
    );
    await user.click(screen.getByTestId("tab-base"));
    expect(screen.queryByTestId("base-panel")).toBeInTheDocument();
    expect(screen.queryByTestId("map-button-population")).not.toBeInTheDocument();

    config.enablePopulationMap = defaultValue;
  });

  it("renders the overlay panel when the overlay tab is clicked", async () => {
    const user = userEvent.setup();
    render(
      <Provider stores={stores}>
        <RightPanel />
      </Provider>
    );
    expect(screen.getByTestId("right-panel")).not.toHaveClass("open");
    await user.click(screen.getByTestId("tab-overlay"));
    expect(screen.getByTestId("right-panel")).toHaveClass("open");
    // base maps panel now hidden, overlay is visible
    expect(screen.queryByTestId("base-panel")).not.toBeInTheDocument();
    expect(screen.queryByTestId("overlay-panel")).toBeInTheDocument();
  });

  it("respects config.availableOverlay options", async () => {
    const user = userEvent.setup();
    const defValue = config.availableOverlays;

    config.availableOverlays = ["sst", "precipitation", "stormSurge"];
    let result = render(
      <Provider stores={stores}>
        <RightPanel />
      </Provider>
    );
    expect(screen.queryByTestId("tab-overlay")).toBeInTheDocument();
    await user.click(screen.getByTestId("tab-overlay"));
    expect(screen.queryByTestId("map-button-sst")).toBeInTheDocument();
    expect(screen.queryByTestId("map-button-precipitation")).toBeInTheDocument();
    expect(screen.queryByTestId("map-button-stormSurge")).toBeInTheDocument();
    result.unmount();

    config.availableOverlays = ["sst", "stormSurge"];
    result = render(
      <Provider stores={stores}>
        <RightPanel />
      </Provider>
    );
    expect(screen.queryByTestId("tab-overlay")).toBeInTheDocument();
    await user.click(screen.getByTestId("tab-overlay"));
    expect(screen.queryByTestId("map-button-sst")).toBeInTheDocument();
    expect(screen.queryByTestId("map-button-precipitation")).not.toBeInTheDocument();
    expect(screen.queryByTestId("map-button-stormSurge")).toBeInTheDocument();
    result.unmount();

    config.availableOverlays = ["sst"];
    result = render(
      <Provider stores={stores}>
        <RightPanel />
      </Provider>
    );
    expect(screen.queryByTestId("tab-overlay")).toBeInTheDocument();
    await user.click(screen.getByTestId("tab-overlay"));
    expect(screen.queryByTestId("map-button-sst")).toBeInTheDocument();
    expect(screen.queryByTestId("map-button-precipitation")).not.toBeInTheDocument();
    expect(screen.queryByTestId("map-button-stormSurge")).not.toBeInTheDocument();
    result.unmount();

    config.availableOverlays = [];
    render(
      <Provider stores={stores}>
        <RightPanel />
      </Provider>
    );
    expect(screen.queryByTestId("tab-overlay")).not.toBeInTheDocument();

    config.availableOverlays = defValue;
  });
});
