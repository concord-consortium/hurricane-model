import * as React from "react";
import { Authoring } from "./authoring";
import { render } from "@testing-library/react";
import { createStores } from "../models/stores";
import { Provider } from "mobx-react";

describe("App component", () => {
  let stores = createStores();
  beforeEach(() => {
    stores = createStores();
  });
  it("renders without crashing", () => {
    render(
      <Provider stores={stores}>
        <Authoring />
      </Provider>
    );
  });

  it("shows a form", () => {
    const { container } = render(
      <Provider stores={stores}>
        <Authoring />
      </Provider>
    );
    expect(container.querySelectorAll("form")).toHaveLength(1);
  });

  it("shows configuration options", () => {
    const { container } = render(
      <Provider stores={stores}>
        <Authoring />
      </Provider>
    );
    expect(container.querySelectorAll("div.form-group").length).toBeGreaterThan(5);
  });
});
