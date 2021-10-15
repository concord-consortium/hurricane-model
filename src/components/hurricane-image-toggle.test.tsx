import * as React from "react";
import { mount } from "enzyme";
import { createStores } from "../models/stores";
import { Provider } from "mobx-react";
import { HurricaneImageToggle } from "./hurricane-image-toggle";
import Switch from "@material-ui/core/Switch";

describe("HurricaneImageToggle component", () => {
  let stores = createStores();
  beforeEach(() => {
    stores = createStores();
  });

  it("renders basic components", () => {
    const wrapper = mount(
      <Provider stores={stores}>
        <HurricaneImageToggle />
      </Provider>
    );
    expect(wrapper.find(Switch).length).toEqual(1);
    expect(wrapper.text()).toEqual(expect.stringContaining("Hurricane Image"));
  });

  it("turns on or off the hurricane image", () => {
    const wrapper = mount(
      <Provider stores={stores}>
        <HurricaneImageToggle />
      </Provider>
    );
    const toggle = (wrapper.find(HurricaneImageToggle).instance() as any).wrappedInstance as HurricaneImageToggle;
    toggle.handleChange(null, true);
    expect(stores.ui.hurricaneImage).toEqual(true);
    toggle.handleChange(null, false);
    expect(stores.ui.hurricaneImage).toEqual(false);
  });
});
