import * as React from "react";
import { mount } from "enzyme";
import { createStores } from "../models/stores";
import { Provider } from "mobx-react";
import { SeasonButton } from "./season-button";
import Select from "@material-ui/core/Select";
import * as css from "./season-button.scss";

describe("SeasonButton component", () => {
  let stores = createStores();
  beforeEach(() => {
    stores = createStores();
  });

  it("renders basic components", () => {
    const wrapper = mount(
      <Provider stores={stores}>
        <SeasonButton />
      </Provider>
    );
    expect(wrapper.find(Select).length).toEqual(1);
  });

  it("season button is disabled while model is running", () => {
    stores.simulation.simulationStarted = true;
    const wrapper = mount(
      <Provider stores={stores}>
        <SeasonButton />
      </Provider>
    );
    const seasonButton = wrapper.find('[data-test="season-button"]').first();
    expect(seasonButton.prop("disabled")).toEqual(true);
  });
});
