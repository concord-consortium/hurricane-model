import * as React from "react";
import { MapView } from "./map-view";
import { mount } from "enzyme";
import { Map } from "react-leaflet";
import { HurricaneMarker } from "./hurricane-marker";
import { PressureSystemMarker } from "./pressure-system-marker";
import { PixiWindLayer } from "./pixi-wind-layer";
import { ImageOverlay } from "react-leaflet";
import { HurricaneTrack } from "./hurricane-track";
import { LandfallRectangle } from "./landfall-rectangle";
import { createStores } from "../models/stores";
import { Provider } from "mobx-react";

describe("MapView component", () => {
  let stores = createStores();
  beforeEach(() => {
    stores = createStores();
  });

  it("renders (React) Leaflet map and basic components (hurricane, pressure systems, sst, wind layers, etc.)", () => {
    const wrapper = mount(
      <Provider stores={stores}>
        <MapView />
      </Provider>
    );
    expect(wrapper.find(Map).length).toEqual(1);
    expect(wrapper.find(PixiWindLayer).length).toEqual(1);
    expect(wrapper.find(ImageOverlay).length).toEqual(1);
    expect(wrapper.find(HurricaneMarker).length).toEqual(1);
    expect(wrapper.find(PressureSystemMarker).length).toEqual(4);
    expect(wrapper.find(HurricaneTrack).length).toEqual(1);
    expect(wrapper.find(LandfallRectangle).length).toEqual(0);
  });

  it("handles landfall rectangles correctly", () => {
    stores.simulation.simulationFinished = false;
    stores.simulation.landfalls = [{ position: {lat: 10, lng: 10}, category: 3 }];
    const wrapper = mount(
      <Provider stores={stores}>
        <MapView />
      </Provider>
    );
    expect(wrapper.find(LandfallRectangle).length).toEqual(0);
    // Show landfall rectangle only after simulation has finished.
    stores.simulation.simulationFinished = true;
    wrapper.update();
    expect(wrapper.find(LandfallRectangle).length).toEqual(1);
  });

  it("doesn't render hurricane if it's not active", () => {
    const wrapper = mount(
      <Provider stores={stores}>
        <MapView />
      </Provider>
    );
    expect(wrapper.find(HurricaneMarker).length).toEqual(1);
    stores.simulation.hurricane.setStrength(0);
    wrapper.update();
    expect(wrapper.find(HurricaneMarker).length).toEqual(0);
  });
});
