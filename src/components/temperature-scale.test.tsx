import * as React from "react";
import { mount } from "enzyme";
import { createStores } from "../models/stores";
import { Provider } from "mobx-react";
import { TemperatureScale } from "./temperature-scale";

describe("Temperature Scale component", () => {
  let stores = createStores();
  beforeEach(() => {
    stores = createStores();
    stores.ui.layerOpacity.seaTemp = 0.5;
  });

  it("renders basic components", () => {
    const wrapper = mount(
      <Provider stores={stores}>
        <TemperatureScale />
      </Provider>
    );
    expect(wrapper.find(TemperatureScale).length).toEqual(1);
  });

  it("Does not show the color gradient on first load", () => {
    const wrapper = mount(
      <Provider stores={stores}>
        <TemperatureScale />
      </Provider>
    );
    const colorGradient = wrapper.find('[data-test="sea-temp-color-gradient"]').first();
    expect(colorGradient.length).toEqual(0);
  });

  it("Shows the color gradient on clicking the corner icon", () => {
    stores.simulation.simulationStarted = true;
    const wrapper = mount(
      <Provider stores={stores}>
        <TemperatureScale />
      </Provider>
    );
    const toggleIcon = wrapper.find('[data-test="key-toggle-visible"]').first();
    toggleIcon.simulate("click");
    const colorGradient = wrapper.find('[data-test="sea-temp-color-gradient"]').first();
    expect(colorGradient.length).toEqual(1);
  });
});
