import * as React from "react";
import { AppComponent } from "./app";
import { mount } from "enzyme";
import { createStores } from "../models/stores";
import { Provider } from "mobx-react";

describe("App component", () => {
  const stores = createStores();
  it("renders without crashing", () => {
    mount(
      <Provider stores={stores}>
        <AppComponent />
      </Provider>
    );
  });
});
