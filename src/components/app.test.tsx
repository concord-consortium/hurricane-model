import * as React from "react";
import { AppComponent } from "./app";
import { render } from "@testing-library/react";
import { createStores } from "../models/stores";
import { Provider } from "mobx-react";
import { StoresContext } from "../stores-context";

import config from "../config";

describe("App component", () => {
  it("shows index page if authoring parameter is not passed in or is false", () => {
    const stores = createStores();
    config.authoring = false;
    const { container } = render(
      <Provider stores={stores}>
        <StoresContext value={stores}>
          <AppComponent />
        </StoresContext>
      </Provider>
    );
    expect(container.querySelector(".index")).toBeInTheDocument();
  });
});

describe("App component in authoring mode", () => {
  it("shows authoring page if authoring parameter is passed in or is true", () => {
    const stores = createStores();
    config.authoring = true;
    const { container } = render(
      <Provider stores={stores}>
        <StoresContext value={stores}>
          <AppComponent />
        </StoresContext>
      </Provider>
    );
    expect(container.querySelector(".authoring")).toBeInTheDocument();
  });
});
