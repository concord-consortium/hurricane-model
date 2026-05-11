import * as React from "react";
import { PixiWindLayer } from "./pixi-wind-layer";
import { render } from "@testing-library/react";
import { createStores } from "../models/stores";
import { Provider } from "mobx-react";
import { MapContainer } from "react-leaflet";
import * as Leaflet from "leaflet";
import * as PIXI from "pixi.js";

describe("PixiWindLayer component", () => {
  let stores = createStores();
  beforeEach(() => {
    stores = createStores();
    // Reset the mock's instance list between tests.
    (PIXI.Application as any).instances = [];
  });

  it("renders without crashing", () => {
    render(
      <Provider stores={stores}>
        <MapContainer center={[0, 0]} zoom={10}>
          <PixiWindLayer/>
        </MapContainer>
      </Provider>
    );
  });

  it("creates Pixi app and renders correct number of wind arrows", async () => {
    render(
      <Provider stores={stores}>
        <MapContainer center={[0, 0]} zoom={10}>
          <PixiWindLayer/>
        </MapContainer>
      </Provider>
    );
    // pixi v8's Application.init is async; flush microtasks before asserting on the app.
    await Promise.resolve();
    const app = (PIXI.Application as any).instances[0];
    expect(app).toBeDefined();
    expect(app.stage.children.length).toEqual(stores.simulation.windWithinBounds.length);
  });

  it("ensures that number of Pixi objects is always equal to number of wind arrows", async () => {
    render(
      <Provider stores={stores}>
        <MapContainer center={[0, 0]} zoom={4}>
          <PixiWindLayer/>
        </MapContainer>
      </Provider>
    );
    const arrowsCount = stores.simulation.windWithinBounds.length;
    await Promise.resolve();
    const app = (PIXI.Application as any).instances[0];
    expect(app).toBeDefined();
    expect(app.stage.children.length).toEqual(arrowsCount);

    const newBounds = {
      getWest: () => -40,
      getEast: () => 40,
      getNorth: () => 40,
      getSouth: () => -40,
    };
    stores.simulation.updateBounds((newBounds as any) as Leaflet.LatLngBounds);

    const newArrowsCount = stores.simulation.windWithinBounds.length;
    expect(newArrowsCount).toBeLessThan(arrowsCount);
    expect(app.stage.children.length).toEqual(newArrowsCount);
  });
});
