import * as React from "react";
import { mount } from "enzyme";
import { createStores } from "../models/stores";
import { Provider } from "mobx-react";
import { MapButton } from "./map-button";
import { mapTypes } from "./right-panel";
import * as css from "./map-button.scss";

describe("MapButton component", () => {
  let stores = createStores();
  beforeEach(() => {
    stores = createStores();
  });

  it("renders basic components", () => {
    const wrapper = mount(
      <Provider stores={stores}>
        <MapButton mapType={mapTypes.geo} label={"map label"} />
      </Provider>
    );
    expect(wrapper.find('[data-test="map-button"]').length).toBeGreaterThan(0);
  });
});
