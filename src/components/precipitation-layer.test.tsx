import * as React from "react";
import {PrecipitationLayer} from "./precipitation-layer";
import {mount} from "enzyme";
import CanvasLayer from "./react-leaflet-canvas-layer";
import {createStores} from "../models/stores";
import {Provider} from "mobx-react";
import {Map} from "react-leaflet";

// Mock webgl-heatmap as it won't work in JSDOM env (no webgl support).
jest.mock("../webgl-heatmap/webgl-heatmap");

describe("PrecipitationLayer component", () => {
  let stores = createStores();
  beforeEach(() => {
    stores = createStores();
  });

  it("renders CanvasLayer", () => {
    const wrapper = mount(
      <Provider stores={stores}>
        <Map center={[0, 0]} zoom={10}>
          <PrecipitationLayer/>
        </Map>
      </Provider>
    );
    expect(wrapper.find(CanvasLayer).length).toEqual(1);
  });

  it("creates WebGLHeatmap", () => {
    const wrapper = mount(
      <Provider stores={stores}>
        <Map center={[0, 0]} zoom={10}>
          <PrecipitationLayer/>
        </Map>
      </Provider>
    );
    const precipitationLayer =
      (wrapper.find(PrecipitationLayer).instance() as any).wrappedInstance as PrecipitationLayer;
    expect(precipitationLayer.webglHeatmap).not.toEqual(null);
  });

  it("ensures that all the precipitation points are added to heatmap", () => {
    const wrapper = mount(
      <Provider stores={stores}>
        <Map center={[0, 0]} zoom={4}>
          <PrecipitationLayer/>
        </Map>
      </Provider>
    );
    const precipitationLayer =
      (wrapper.find(PrecipitationLayer).instance() as any).wrappedInstance as PrecipitationLayer;
    expect(precipitationLayer.webglHeatmap).not.toEqual(null);
    expect(precipitationLayer.webglHeatmap.addPoint).not.toHaveBeenCalled();
    stores.simulation.addPrecipitation();
    const pointsCount = stores.simulation.precipitationPointsWithinBounds.length;
    expect(pointsCount).toBeGreaterThan(0);
    expect(precipitationLayer.webglHeatmap.addPoint).toHaveBeenCalledTimes(pointsCount);
  });
});
