import * as React from "react";
import { mount } from "enzyme";
import { Marker } from "react-leaflet";
import { createStores } from "../models/stores";
import { Provider } from "mobx-react";
import { Map } from "react-leaflet";
import { PressureSystemMarker } from "./pressure-system-marker";
import {LatLng, LeafletMouseEvent} from "leaflet";

describe("PressureSystemMarker component", () => {
  let stores = createStores();
  beforeEach(() => {
    stores = createStores();
  });

  it("renders Leaflet Marker", () => {
    const wrapper = mount(
      <Provider stores={stores}>
        <Map center={[0, 0]} zoom={10}>
          <PressureSystemMarker model={stores.simulation.pressureSystems[0]}/>
        </Map>
      </Provider>
    );
    expect(wrapper.find(Marker).length).toEqual(1);
  });

  it("updates pressure center position when dragged", () => {
    const model = stores.simulation.pressureSystems[0];
    const wrapper = mount(
      <Provider stores={stores}>
        <Map center={[0, 0]} zoom={10}>
          <PressureSystemMarker model={model}/>
        </Map>
      </Provider>
    );
    const marker = (wrapper.find(PressureSystemMarker).instance() as any).wrappedInstance as PressureSystemMarker;
    marker.handlePressureSysDrag({latlng: {lat: 20, lng: 30} as LatLng} as LeafletMouseEvent);
    expect(model.center).toEqual({lat: 20, lng: 30});

    marker.handlePressureSysDrag({latlng: {lat: 0, lng: 30} as LatLng} as LeafletMouseEvent);
    // Limit lat to 10, don't let users drag the pressure system to southern hemisphere.
    expect(model.center).toEqual({lat: 15, lng: 30});
  });
});
