import * as React from "react";
import { mount } from "enzyme";
import { createStores } from "../models/stores";
import { Provider } from "mobx-react";
import { MapTab } from "./map-tab";
import * as css from "./map-tab.scss";

describe("MapTab component", () => {
  let stores = createStores();
  beforeEach(() => {
    stores = createStores();
  });

  it("renders basic components", () => {
    const wrapper = mount(
      <Provider stores={stores}>
        <MapTab />
      </Provider>
    );
    expect(wrapper.find('[data-test="map-tab"]').length).toEqual(1);
  });
});
