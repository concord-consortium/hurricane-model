import * as React from "react";
import { mount } from "enzyme";
import { createStores } from "../models/stores";
import { Provider } from "mobx-react";
import { SeasonButton } from "./season-button";
import Select from "@material-ui/core/Select";

describe("SeasonButton component", () => {
  const stores = createStores();
  const wrapper = () => mount(
    <Provider stores={stores}>
      <SeasonButton />
    </Provider>
  );

  it("renders basic components", () => {
    expect(wrapper().find(Select).length).toEqual(1);
  });

  it("season button is disabled while model is running", () => {
    stores.simulation.simulationStarted = true;
    const button = wrapper().find('[data-test="season-button"]').first();
    expect(button.prop("disabled")).toEqual(true);
  });
});
