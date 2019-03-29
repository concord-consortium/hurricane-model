import * as React from "react";
import { mount } from "enzyme";
import { Marker } from "react-leaflet";
import { createStores } from "../models/stores";
import { Provider } from "mobx-react";
import { Map } from "react-leaflet";
import { LeafletCustomMarker } from "./leaflet-custom-marker";
import { HurricaneMarker, HurricaneIcon } from "./hurricane-marker";

describe("HurricaneMarker component", () => {
  let stores = createStores();
  beforeEach(() => {
    stores = createStores();
  });

  it("renders Leaflet Marker", () => {
    const wrapper = mount(
      <Provider stores={stores}>
        <Map center={[0, 0]} zoom={10}>
          <HurricaneMarker/>
        </Map>
      </Provider>
    );
    expect(wrapper.find(LeafletCustomMarker).length).toEqual(1);
    expect(wrapper.find(Marker).length).toEqual(1);
  });
});

describe("HurricaneIcon component", () => {
  let stores = createStores();
  beforeEach(() => {
    stores = createStores();
  });

  it("renders hurricane category", () => {
    const wrapper = mount(
      <Provider stores={stores}>
        <Map center={[0, 0]} zoom={10}>
          <HurricaneIcon />
        </Map>
      </Provider>
    );
    const category = wrapper.find('[data-test="hurricane-category"]');
    expect(category.length).toEqual(1);
    stores.simulation.hurricane.strength = 20;
    expect(category.text()).toEqual("TS"); // tropical storm
    stores.simulation.hurricane.strength = 54;
    expect(category.text()).toEqual(stores.simulation.hurricane.category.toString());
    stores.simulation.hurricane.strength = 100;
    expect(category.text()).toEqual("5");
  });
});
