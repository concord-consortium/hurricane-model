import * as React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createStores } from "../models/stores";
import { Provider } from "mobx-react";
import { MapButton } from "./map-button";
import config from "../config";

describe("MapButton component", () => {
  let stores = createStores();
  beforeEach(() => {
    stores = createStores();
  });

  it("renders basic components", () => {
    render(
      <Provider stores={stores}>
        <MapButton mapType="base" label="Street" value="street" />
      </Provider>
    );
    expect(screen.getByTestId("map-button-street")).toBeInTheDocument();
  });

  it("reacts to click and changes map layer", async () => {
    const user = userEvent.setup();
    jest.spyOn(stores.ui, "setMapTiles");
    render(
      <Provider stores={stores}>
        <MapButton mapType="base" label="Street" value="street" />
      </Provider>
    );
    expect(stores.ui.baseMap).toEqual("satellite");
    await user.click(screen.getByTestId("map-button-street"));
    expect(stores.ui.setMapTiles).toHaveBeenCalled();
    expect(stores.ui.baseMap).toEqual("street");
  });

  it("reacts to click and changes map overlay", async () => {
    const user = userEvent.setup();
    jest.spyOn(stores.ui, "setOverlay");
    render(
      <Provider stores={stores}>
        <MapButton mapType="overlay" label="Precipitation" value="precipitation" />
      </Provider>
    );
    expect(stores.ui.overlay).toEqual(config.overlay);
    await user.click(screen.getByTestId("map-button-precipitation"));
    expect(stores.ui.setOverlay).toHaveBeenCalled();
    expect(stores.ui.overlay).toEqual("precipitation");
  });
});
