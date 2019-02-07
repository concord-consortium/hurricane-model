import * as React from "react";
import { mount } from "enzyme";
import { createStores } from "../models/stores";
import { Provider } from "mobx-react";
import { BottomBar } from "./bottom-bar";
import Button from "@material-ui/core/Button";
import Select from "@material-ui/core/Select";

describe("BottomBar component", () => {
  let stores = createStores();
  beforeEach(() => {
    stores = createStores();
  });

  it("renders basic components", () => {
    const wrapper = mount(
      <Provider stores={stores}>
        <BottomBar />
      </Provider>
    );
    expect(wrapper.find(Button).length).toEqual(2);
    expect(wrapper.text()).toEqual(expect.stringContaining("Season"));
    expect(wrapper.find(Select).length).toEqual(1);
  });

  it("start button is disabled until model is ready", () => {
    const wrapper = mount(
      <Provider stores={stores}>
        <BottomBar />
      </Provider>
    );
    const start = wrapper.find('[data-test="start-button"]').first();
    expect(start.prop("disabled")).toEqual(true);
  });
});
