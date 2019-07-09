import * as React from "react";
import { mount } from "enzyme";
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
    const wrapper = mount(
      <Provider stores={stores}>
        <MapButton mapType="base" label="Street" value="street" />
      </Provider>
    );
    expect(wrapper.find(MapButton).length).toBe(1);
  });

  it("reacts to click and changes map layer", () => {
    jest.spyOn(stores.ui, "setMapTiles");
    const wrapper = mount(
      <Provider stores={stores}>
        <MapButton mapType="base" label="Street" value="street" />
      </Provider>
    );
    const btn = (wrapper.find(MapButton).instance() as any).wrappedInstance as MapButton;
    expect(stores.ui.baseMap).toEqual("satellite");
    btn.handleMapSelect();
    expect(stores.ui.setMapTiles).toHaveBeenCalled();
    expect(stores.ui.baseMap).toEqual("street");
  });

  it("reacts to click and changes map overlay", () => {
    jest.spyOn(stores.ui, "setOverlay");
    const wrapper = mount(
      <Provider stores={stores}>
        <MapButton mapType="overlay" label="Precipitation" value="precipitation" />
      </Provider>
    );
    const btn = (wrapper.find(MapButton).instance() as any).wrappedInstance as MapButton;
    expect(stores.ui.overlay).toEqual(config.overlay);
    btn.handleMapSelect();
    expect(stores.ui.setOverlay).toHaveBeenCalled();
    expect(stores.ui.overlay).toEqual("precipitation");
  });
});
