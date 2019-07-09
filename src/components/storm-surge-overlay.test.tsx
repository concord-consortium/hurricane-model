import * as React from "react";
import { Provider } from "mobx-react";
import { Map } from "react-leaflet";
import { mount } from "enzyme";
import { createStores } from "../models/stores";
import { StormSurgeOverlay, baseUrlUSA, PuertoRicoBounds, baseUrlPuertoRico } from "./storm-surge-overlay";
import TilelayerMask from "./react-leaflet-tilelayer-mask";

describe("StormSurgeOverlay component", () => {
  let stores = createStores();
  beforeEach(() => {
    stores = createStores();
  });

  it("renders TilelayerMask", () => {
    stores.simulation.landfalls.push({
      category: 3,
      position: {lat: 28, lng: -83}
    });
    const wrapper = mount(
      <Provider stores={stores}>
        <Map center={[0, 0]} zoom={10}>
          <StormSurgeOverlay />
        </Map>
      </Provider>
    );
    expect(wrapper.find(TilelayerMask).length).toEqual(1);
  });

  it("uses USA storm surge tiles and top-right mask by default", () => {
    stores.simulation.landfalls.push({
      category: 3,
      position: {lat: 28, lng: -83}
    });
    const wrapper = mount(
      <Provider stores={stores}>
        <Map center={[0, 0]} zoom={10}>
          <StormSurgeOverlay />
        </Map>
      </Provider>
    );
    expect(wrapper.find(TilelayerMask).prop("url")).toEqual(baseUrlUSA.replace("{category}", "3"));
    expect(wrapper.find(TilelayerMask).prop("maskUrl")).not.toEqual(undefined);
  });

  it("uses Puerto Rico storm surge tiles when landfall happened around it", () => {
    stores.simulation.landfalls.push({
      category: 2,
      position: {
        lat: PuertoRicoBounds.getSouthWest().lat + 0.01,
        lng: PuertoRicoBounds.getSouthWest().lng + 0.01,
      }
    });
    const wrapper = mount(
      <Provider stores={stores}>
        <Map center={[0, 0]} zoom={10}>
          <StormSurgeOverlay />
        </Map>
      </Provider>
    );
    expect(wrapper.find(TilelayerMask).prop("url")).toEqual(baseUrlPuertoRico.replace("{category}", "2"));
    expect(wrapper.find(TilelayerMask).prop("maskUrl")).toEqual(undefined);
  });
});
