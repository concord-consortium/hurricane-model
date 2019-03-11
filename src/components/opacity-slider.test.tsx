import * as React from "react";
import { mount } from "enzyme";
import { createStores } from "../models/stores";
import { Provider } from "mobx-react";
import { OpacitySlider } from "./opacity-slider";
import Slider from "@material-ui/lab/Slider";

describe("OpacitySlider component", () => {
  let stores = createStores();
  beforeEach(() => {
    stores = createStores();
  });

  it("renders basic components", () => {
    const wrapper = mount(
      <Provider stores={stores}>
        <OpacitySlider property="windArrows" />
      </Provider>
    );
    expect(wrapper.find(Slider).length).toEqual(1);
    expect(wrapper.text()).toEqual(expect.stringContaining("Wind Direction and Speed"));
  });

  it("adjusts layer opacity when user drags the slider", () => {
    let wrapper = mount(
      <Provider stores={stores}>
        <OpacitySlider property="windArrows" />
      </Provider>
    );
    let slider = (wrapper.find(OpacitySlider).instance() as any).wrappedInstance as OpacitySlider;
    slider.handleChange(null, 1);
    expect(stores.ui.layerOpacity.windArrows).toEqual(1);
    slider.handleChange(null, 0.25);
    expect(stores.ui.layerOpacity.windArrows).toEqual(0.25);

    wrapper = mount(
      <Provider stores={stores}>
        <OpacitySlider property="seaSurfaceTemp" />
      </Provider>
    );
    slider = (wrapper.find(OpacitySlider).instance() as any).wrappedInstance as OpacitySlider;
    slider.handleChange(null, 1);
    expect(stores.ui.layerOpacity.seaSurfaceTemp).toEqual(1);
    slider.handleChange(null, 0.25);
    expect(stores.ui.layerOpacity.seaSurfaceTemp).toEqual(0.25);
  });
});
