import * as React from "react";
import { mount } from "enzyme";
import { createStores } from "../models/stores";
import { Provider } from "mobx-react";
import { WindArrowsToggle } from "./wind-arrows-toggle";
import Switch from "@material-ui/core/Switch";

describe("WindArrowsToggle component", () => {
  let stores = createStores();
  beforeEach(() => {
    stores = createStores();
  });

  it("renders basic components", () => {
    const wrapper = mount(
      <Provider stores={stores}>
        <WindArrowsToggle />
      </Provider>
    );
    expect(wrapper.find(Switch).length).toEqual(1);
    expect(wrapper.text()).toEqual(expect.stringContaining("Wind Direction and Speed"));
  });

  it("turns on or off the wind arrows", () => {
    const wrapper = mount(
      <Provider stores={stores}>
        <WindArrowsToggle />
      </Provider>
    );
    const toggle = (wrapper.find(WindArrowsToggle).instance() as any).wrappedInstance as WindArrowsToggle;
    toggle.handleChange(null, true);
    expect(stores.ui.windArrows).toEqual(true);
    toggle.handleChange(null, false);
    expect(stores.ui.windArrows).toEqual(false);
  });
});
