import * as React from "react";
import { mount } from "enzyme";
import { createStores } from "../models/stores";
import { Provider } from "mobx-react";
import { SeasonButton } from "./season-button";
import Button from "@material-ui/core/Button";

describe("SeasonButton component", () => {
  let stores = createStores();
  beforeEach(() => {
    stores = createStores();
  });

  it("renders basic components", () => {
    const wrapper = mount(
      <Provider stores={stores}>
        <SeasonButton />
      </Provider>
    );
    expect(wrapper.find(Button).length).toEqual(1);
  });

  it("switches season on click", () => {
    const wrapper = mount(
      <Provider stores={stores}>
        <SeasonButton />
      </Provider>
    );
    expect(stores.simulation.season).toEqual("fall");
    wrapper.find(Button).simulate("click");
    expect(stores.simulation.season).toEqual("winter");
    expect(wrapper.text()).toEqual(expect.stringContaining("winter"));
    wrapper.find(Button).simulate("click");
    expect(stores.simulation.season).toEqual("spring");
    expect(wrapper.text()).toEqual(expect.stringContaining("spring"));
    wrapper.find(Button).simulate("click");
    expect(stores.simulation.season).toEqual("summer");
    expect(wrapper.text()).toEqual(expect.stringContaining("summer"));
    wrapper.find(Button).simulate("click");
    expect(stores.simulation.season).toEqual("fall");
    expect(wrapper.text()).toEqual(expect.stringContaining("fall"));
  });
});
