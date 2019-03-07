import { LandfallRectangle } from "./landfall-rectangle";
import { createStores } from "../models/stores";
import { Map, Rectangle } from "react-leaflet";
import { mount } from "enzyme";
import { Provider } from "mobx-react";
import * as React from "react";

describe("Landfall rectangle", () => {
  let stores = createStores();
  beforeEach(() => {
    stores = createStores();
  });

  it("renders rectangle", () => {
    const wrapper = mount(
      <Provider stores={stores}>
        <Map center={[0, 0]} zoom={10}>
          <LandfallRectangle position={{lat: 10, lng: 10}} category={3} />
        </Map>
      </Provider>
    );
    expect(wrapper.find(Rectangle).length).toEqual(1);
  });

  it("rectangle is drawn around center", () => {
    const lat = 10;
    const lng = 10;
    const wrapper = mount(
      <Provider stores={stores}>
        <Map center={[0, 0]} zoom={10}>
          <LandfallRectangle position={{lat, lng}} category={3} />
        </Map>
      </Provider>
    );
    const rect = (wrapper.find(LandfallRectangle).instance() as any).wrappedInstance as LandfallRectangle;
    const bounds = rect.getBounds();
    expect(lat).toBeGreaterThan(bounds[0][0]);
    expect(lat).toBeLessThan(bounds[1][0]);
    expect(lng).toBeGreaterThan(bounds[0][1]);
    expect(lng).toBeLessThan(bounds[1][1]);
  });

  it("reacts to click and sets zoomed in view", () => {
    jest.spyOn(stores.ui, "setZoomedInView");
    const wrapper = mount(
      <Provider stores={stores}>
        <Map center={[0, 0]} zoom={10}>
          <LandfallRectangle position={{lat: 10, lng: 10}} category={3} />
        </Map>
      </Provider>
    );
    const rect = (wrapper.find(LandfallRectangle).instance() as any).wrappedInstance as LandfallRectangle;
    rect.handleClick();
    expect(stores.ui.setZoomedInView).toHaveBeenCalled();
  });
});
