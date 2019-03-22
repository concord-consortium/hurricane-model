import * as React from "react";
import { mount } from "enzyme";
import { createStores } from "../models/stores";
import { Provider } from "mobx-react";
import { MapButton } from "./map-button";

describe("MapButton component", () => {
  let stores = createStores();
  beforeEach(() => {
    stores = createStores();
  });

  it("renders basic components", () => {
    const wrapper = mount(
      <Provider stores={stores}>
        <MapButton mapType="geo" label="Street" value="street" />
      </Provider>
    );
    expect(wrapper.find(MapButton).length).toBe(1);
  });

  it("reacts to click and changes map layer", () => {
    jest.spyOn(stores.ui, "setMapTiles");
    const wrapper = mount(
      <Provider stores={stores}>
        <MapButton mapType="geo" label="Street" value="street" />
      </Provider>
    );
    const btn = (wrapper.find(MapButton).instance() as any).wrappedInstance as MapButton;
    expect(stores.ui.mapTile.mapType).toEqual("satellite");
    btn.handleMapSelect();
    expect(stores.ui.setMapTiles).toHaveBeenCalled();
    expect(stores.ui.mapTile.mapType).toEqual("street");
  });
});
