import * as React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "mobx-react";
import config from "../../config";
import * as logModule from "../../log";
import { createStores } from "../../models/stores";
import { StoresContext } from "../../stores-context";
import { RightPanel } from "./right-panel";

jest.spyOn(logModule, "log").mockImplementation(() => undefined);

describe("Right Panel component", () => {
  let stores = createStores();
  const renderPanel = () => render(
    <StoresContext value={stores}>
      <Provider stores={stores}>
        <RightPanel />
      </Provider>
    </StoresContext>
  );

  beforeEach(() => {
    stores = createStores();
  });

  it("renders basic components", () => {
    const { container } = renderPanel();
    expect(container.querySelectorAll("ul")).toHaveLength(1);
    expect(container.querySelectorAll("li")).toHaveLength(2);
    // default is the base maps panel
    expect(screen.queryByTestId("base-panel")).toBeInTheDocument();
    // overlay panel is not rendered until the tab is clicked
    expect(screen.queryByTestId("overlay-panel")).not.toBeInTheDocument();
  });

  it("opens when a tab is clicked", async () => {
    const user = userEvent.setup();
    renderPanel();
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
    renderPanel();
    expect(screen.getByTestId("right-panel")).not.toHaveClass("open");
    await user.click(screen.getByTestId("tab-base"));
    expect(screen.getByTestId("right-panel")).toHaveClass("open");
    await user.click(screen.getByTestId("tab-overlay"));
    expect(screen.getByTestId("right-panel")).toHaveClass("open");
  });

  it("closes when the same tab is clicked", async () => {
    const user = userEvent.setup();
    renderPanel();
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
    const { unmount } = renderPanel();
    await user.click(screen.getByTestId("tab-base"));
    expect(screen.queryByTestId("base-panel")).toBeInTheDocument();
    expect(screen.queryByTestId("map-button-population")).toBeInTheDocument();
    unmount();

    config.enablePopulationMap = false;
    renderPanel();
    await user.click(screen.getByTestId("tab-base"));
    expect(screen.queryByTestId("base-panel")).toBeInTheDocument();
    expect(screen.queryByTestId("map-button-population")).not.toBeInTheDocument();

    config.enablePopulationMap = defaultValue;
  });

  it("renders the overlay panel when the overlay tab is clicked", async () => {
    const user = userEvent.setup();
    renderPanel();
    expect(screen.getByTestId("right-panel")).not.toHaveClass("open");
    await user.click(screen.getByTestId("tab-overlay"));
    expect(screen.getByTestId("right-panel")).toHaveClass("open");
    // base maps panel now hidden, overlay is visible
    expect(screen.queryByTestId("base-panel")).not.toBeInTheDocument();
    expect(screen.queryByTestId("overlay-panel")).toBeInTheDocument();
  });

  it("respects config.availableOverlays options", async () => {
    const user = userEvent.setup();
    const defValue = config.availableOverlays;

    config.availableOverlays = ["sst", "precipitation", "stormSurge"];
    let result = renderPanel();
    expect(screen.queryByTestId("tab-overlay")).toBeInTheDocument();
    await user.click(screen.getByTestId("tab-overlay"));
    expect(screen.queryByTestId("map-button-sst")).toBeInTheDocument();
    expect(screen.queryByTestId("map-button-precipitation")).toBeInTheDocument();
    expect(screen.queryByTestId("map-button-stormSurge")).toBeInTheDocument();
    result.unmount();

    config.availableOverlays = ["sst", "stormSurge"];
    result = renderPanel();
    expect(screen.queryByTestId("tab-overlay")).toBeInTheDocument();
    await user.click(screen.getByTestId("tab-overlay"));
    expect(screen.queryByTestId("map-button-sst")).toBeInTheDocument();
    expect(screen.queryByTestId("map-button-precipitation")).not.toBeInTheDocument();
    expect(screen.queryByTestId("map-button-stormSurge")).toBeInTheDocument();
    result.unmount();

    config.availableOverlays = ["sst"];
    result = renderPanel();
    expect(screen.queryByTestId("tab-overlay")).toBeInTheDocument();
    await user.click(screen.getByTestId("tab-overlay"));
    expect(screen.queryByTestId("map-button-sst")).toBeInTheDocument();
    expect(screen.queryByTestId("map-button-precipitation")).not.toBeInTheDocument();
    expect(screen.queryByTestId("map-button-stormSurge")).not.toBeInTheDocument();
    result.unmount();

    config.availableOverlays = [];
    renderPanel();
    expect(screen.queryByTestId("tab-overlay")).not.toBeInTheDocument();

    config.availableOverlays = defValue;
  });

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

      // windArrows defaults to true, so clicking hides the arrows
      const windSwitch = screen.getByTestId("wind-arrows-setting").querySelector("input") as HTMLInputElement;
      await user.click(windSwitch);
      expect(stores.ui.windArrows).toBe(false);
      expect(logModule.log).toHaveBeenCalledWith("WindArrowsHidden");

      // hurricaneImage defaults to false, so clicking shows the image
      const imageSwitch = screen.getByTestId("hurricane-image-setting").querySelector("input") as HTMLInputElement;
      await user.click(imageSwitch);
      expect(stores.ui.hurricaneImage).toBe(true);
      expect(logModule.log).toHaveBeenCalledWith("HurricaneImageShown");
    });
  });
});
