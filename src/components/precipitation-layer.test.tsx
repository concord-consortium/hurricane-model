import * as React from "react";
import { PrecipitationLayer } from "./precipitation-layer";
import { render } from "@testing-library/react";
import { createStores } from "../models/stores";
import { Provider } from "mobx-react";
import { MapContainer } from "react-leaflet";
// Mock webgl-heatmap. The original is an old CoffeeScript module that defines its methods
// on `this` (not on the prototype), so jest.mock's auto-mock can't see them. Provide an
// explicit instance shape so tests can inspect addPoint calls.
jest.mock("../libs/webgl-heatmap", () => {
  const heatmapInstances: any[] = [];
  const Mock: any = jest.fn().mockImplementation(() => {
    const instance = {
      addPoint: jest.fn(),
      clear: jest.fn(),
      update: jest.fn(),
      display: jest.fn(),
      adjustSize: jest.fn()
    };
    heatmapInstances.push(instance);
    return instance;
  });
  Mock.instances = heatmapInstances;
  return { __esModule: true, default: Mock };
});
const MockedWebGLHeatmap = require("../libs/webgl-heatmap").default;

describe("PrecipitationLayer component", () => {
  let stores = createStores();
  beforeEach(() => {
    stores = createStores();
    MockedWebGLHeatmap.mockClear();
    MockedWebGLHeatmap.instances.length = 0;
  });

  it("renders without crashing", () => {
    render(
      <Provider stores={stores}>
        <MapContainer center={[0, 0]} zoom={10}>
          <PrecipitationLayer/>
        </MapContainer>
      </Provider>
    );
  });

  it("creates WebGLHeatmap", () => {
    render(
      <Provider stores={stores}>
        <MapContainer center={[0, 0]} zoom={10}>
          <PrecipitationLayer/>
        </MapContainer>
      </Provider>
    );
    expect(MockedWebGLHeatmap).toHaveBeenCalledTimes(1);
  });

  it("ensures that all the precipitation points are added to heatmap", () => {
    render(
      <Provider stores={stores}>
        <MapContainer center={[0, 0]} zoom={4}>
          <PrecipitationLayer/>
        </MapContainer>
      </Provider>
    );
    const heatmapInstance = MockedWebGLHeatmap.instances[0];
    expect(heatmapInstance.addPoint).not.toHaveBeenCalled();
    stores.simulation.addPrecipitation();
    const pointsCount = stores.simulation.precipitationPointsWithinBounds.length;
    expect(pointsCount).toBeGreaterThan(0);
    expect(heatmapInstance.addPoint).toHaveBeenCalledTimes(pointsCount);
  });
});
