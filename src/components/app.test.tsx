import * as React from "react";
import { AppComponent } from "./app";
import { render } from "@testing-library/react";
import { createStores } from "../models/stores";
import { Provider } from "mobx-react";

import config from "../config";

describe("App component", () => {
  let stores = createStores();
  beforeEach(() => {
    stores = createStores();
    config.authoring = false;
  });
  it("renders without crashing", () => {
    render(
      <Provider stores={stores}>
        <AppComponent />
      </Provider>
    );
  });

  it("shows index page if authoring parameter is not passed in or is false", () => {
    const { container } = render(
      <Provider stores={stores}>
        <AppComponent />
      </Provider>
    );
    expect(container.querySelector(".index")).toBeInTheDocument();
  });

});

describe("App component in authoring mode", () => {
  let stores = createStores();
  beforeEach(() => {
    stores = createStores();
    config.authoring = true;
  });

  it("shows authoring page if authoring parameter is passed in or is true", () => {
    const { container } = render(
      <Provider stores={stores}>
        <AppComponent />
      </Provider>
    );
    expect(container.querySelector(".authoring")).toBeInTheDocument();
  });
});
