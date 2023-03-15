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
import config from "../config";

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
    const oldMarkLandfalls = config.markLandfalls;
    config.markLandfalls = true;
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
    config.markLandfalls = oldMarkLandfalls;
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

  it("renders storm surge overlay in zoomed-in view", () => {
    const wrapper = mount(
      <Provider stores={stores}>
        <MapView />
      </Provider>
    );
    expect(wrapper.find({
      url: "https://tiles.arcgis.com/tiles/C8EMgrsFcRFL6LrL/arcgis/rest/services/Storm_Surge_HazardMaps_Category3" +
           "_v3/MapServer/tile/{z}/{y}/{x}"
    }).length).toEqual(0);

    stores.ui.zoomedInView = {
      landfallCategory: 3,
      stormSurgeAvailable: true
    };
    stores.ui.overlay = "stormSurge";
    wrapper.update();

    expect(wrapper.find({
      url: "https://tiles.arcgis.com/tiles/C8EMgrsFcRFL6LrL/arcgis/rest/services/Storm_Surge_HazardMaps_Category3" +
           "_v3/MapServer/tile/{z}/{y}/{x}"
    }).length).toBeGreaterThan(0);
  });
});
