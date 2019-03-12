import * as React from "react";
import { AppComponent } from "./app";
import { mount } from "enzyme";
import { createStores } from "../models/stores";
import { Provider } from "mobx-react";

import config from "../config";
import { Authoring } from "./authoring";
import { IndexPage } from "./index-page";

describe("App component", () => {
  let stores = createStores();
  beforeEach(() => {
    stores = createStores();
    config.authoring = false;
  });
  it("renders without crashing", () => {
    mount(
      <Provider stores={stores}>
        <AppComponent />
      </Provider>
    );
  });

  it("shows index page if authoring parameter is not passed in or is false", () => {
    const wrapper = mount(
      <Provider stores={stores}>
        <AppComponent />
      </Provider>
    );
    wrapper.update();
    expect(wrapper.find(IndexPage).length).toEqual(1);
  });

});

describe("App component in authoring mode", () => {
  let stores = createStores();
  beforeEach(() => {
    stores = createStores();
    config.authoring = true;
  });

  it("shows authoring page if authoring parameter is passed in or is true", () => {
    const wrapper = mount(
      <Provider stores={stores}>
        <AppComponent />
      </Provider>
    );
    expect(wrapper.find(Authoring).length).toEqual(1);
  });
});
