import * as React from "react";
import {PixiWindLayer} from "./pixi-wind-layer";
import {mount} from "enzyme";
import * as CanvasLayer from "react-leaflet-canvas-layer";
import {createStores} from "../models/stores";
import {Provider} from "mobx-react";
import {Map} from "react-leaflet";
import * as Leaflet from "leaflet";

describe("PixiWindLayer component", () => {
  let stores = createStores();
  beforeEach(() => {
    stores = createStores();
  });

  it("renders CanvasLayer", () => {
    const wrapper = mount(
      <Provider stores={stores}>
        <Map center={[0, 0]} zoom={10}>
          <PixiWindLayer/>
        </Map>
      </Provider>
    );
    expect(wrapper.find(CanvasLayer).length).toEqual(1);
  });

  it("creates Pixi app and renders correct number of wind arrows", () => {
    const wrapper = mount(
      <Provider stores={stores}>
        <Map center={[0, 0]} zoom={10}>
          <PixiWindLayer/>
        </Map>
      </Provider>
    );
    const canvasLayer = wrapper.find(CanvasLayer);
    expect(canvasLayer.length).toEqual(1);

    const windLayer = (wrapper.find(PixiWindLayer).instance() as any).wrappedInstance as PixiWindLayer;
    expect(windLayer.pixiApp).not.toEqual(null);
    expect(windLayer.pixiApp!.stage.children.length).toEqual(stores.simulation.windIncBounds.length);
  });

  it("ensures that number of Pixi objects is always equal to number of wind arrows", () => {
    const wrapper = mount(
      <Provider stores={stores}>
        <Map center={[0, 0]} zoom={10}>
          <PixiWindLayer/>
        </Map>
      </Provider>
    );
    const arrowsCount = stores.simulation.windIncBounds.length;

    const windLayer = (wrapper.find(PixiWindLayer).instance() as any).wrappedInstance as PixiWindLayer;
    expect(windLayer.pixiApp).not.toEqual(null);
    expect(windLayer.pixiApp!.stage.children.length).toEqual(arrowsCount);

    const newBounds = {
      getWest: () => -10,
      getEast: () => 10,
      getNorth: () => 10,
      getSouth: () => -10,
    };
    stores.simulation.updateBounds((newBounds as any) as Leaflet.LatLngBounds);

    const newArrowsCount = stores.simulation.windIncBounds.length;
    expect(newArrowsCount).toBeLessThan(arrowsCount);
    expect(windLayer.pixiApp!.stage.children.length).toEqual(newArrowsCount);
  });
});
