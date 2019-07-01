import * as React from "react";
import { mount } from "enzyme";
import { createStores } from "../models/stores";
import { Provider } from "mobx-react";
import { TopBar } from "./top-bar";

describe("TopBar component", () => {
  let stores = createStores();
  beforeEach(() => {
    stores = createStores();
  });

  describe("Reload button", () => {
    it("reloads the model using window.location.reload", () => {
      const wrapper = mount(
        <Provider stores={stores}>
          <TopBar />
        </Provider>
      );
      const topBar = (wrapper.find(TopBar).instance() as any).wrappedInstance as TopBar;
      window.location.reload = jest.fn();
      topBar.handleReload();
      expect(window.location.reload).toHaveBeenCalled();
    });
  });
});
