import * as React from "react";
import { IndexPage } from "./index-page";
import { mount } from "enzyme";
import { createStores } from "../models/stores";
import { Provider } from "mobx-react";
import CircularProgress from "@material-ui/core/CircularProgress";
import { PNG } from "pngjs";

describe("IndexPage component", () => {
  let stores = createStores();
  beforeEach(() => {
    stores = createStores();
  });
  it("renders without crashing", () => {
    mount(
      <Provider stores={stores}>
        <IndexPage />
      </Provider>
    );
  });

  it("shows loading icon", () => {
    const wrapper = mount(
      <Provider stores={stores}>
        <IndexPage />
      </Provider>
    );
    expect(wrapper.find(CircularProgress).length).toEqual(1);
    stores.simulation.seaSurfaceTempData = new PNG();
    wrapper.update();
    expect(wrapper.find(CircularProgress).length).toEqual(0);
  });
});
