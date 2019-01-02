import * as React from "react";
import { MapView } from "./map-view";
import { shallow } from "enzyme";
import { Map } from "react-leaflet";

describe("MapView component", () => {
  it("renders (React) Leaflet map", () => {
    const wrapper = shallow(<MapView />);
    expect(wrapper.find(Map).length).toEqual(1);
  });
});
