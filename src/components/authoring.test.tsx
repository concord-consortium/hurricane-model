import * as React from "react";
import { Authoring } from "./authoring";
import Form, { ISubmitEvent } from "react-jsonschema-form";
import { mount } from "enzyme";
import { createStores } from "../models/stores";
import { Provider } from "mobx-react";

describe("App component", () => {
  let stores = createStores();
  beforeEach(() => {
    stores = createStores();
  });
  it("renders without crashing", () => {
    mount(
      <Provider stores={stores}>
        <Authoring />
      </Provider>
    );
  });

  it("shows a form", () => {
    const wrapper = mount(
      <Provider stores={stores}>
        <Authoring />
      </Provider>
    );
    expect(wrapper.find(Form).length).toEqual(1);

  });

  it("shows configuration options", () => {
    const wrapper = mount(
      <Provider stores={stores}>
        <Authoring />
      </Provider>
    );

    expect(wrapper.find("div.form-group").length).toBeGreaterThan(5);
  });
});
