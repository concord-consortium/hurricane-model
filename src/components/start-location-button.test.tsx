import * as React from "react";
import { Provider } from "mobx-react";
import { mount } from "enzyme";
import Select from "@material-ui/core/Select";
import { createStores } from "../models/stores";
import { StartLocationButton } from "./start-location-button";

describe("StartLocationButton component", () => {
  const stores = createStores();
  const wrapper = () => mount(
    <Provider stores={stores}>
      <StartLocationButton />
    </Provider>
  );

  it("renders basic components", () => {
    expect(wrapper().find(Select).length).toEqual(1);
  });

  it("start location button is disabled while model is running", () => {
    stores.simulation.simulationStarted = true;
    const button = wrapper().find('[data-test="start-location-button"]').first();
    expect(button.prop("disabled")).toEqual(true);
  });
});
