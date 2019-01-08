import * as React from "react";
import { MapView } from "./map-view";
import { mount } from "enzyme";
import { Map } from "react-leaflet";
import { createStores } from "../models/stores";
import {Provider} from "mobx-react";

describe("MapView component", () => {
  const stores = createStores();
  it("renders (React) Leaflet map", () => {
    const wrapper = mount(
      <Provider stores={stores}>
        <MapView />
      </Provider>
    );
    expect(wrapper.find(Map).length).toEqual(1);
  });
});
