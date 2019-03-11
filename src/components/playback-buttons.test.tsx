import * as React from "react";
import { mount } from "enzyme";
import { createStores } from "../models/stores";
import { Provider } from "mobx-react";
import { PlaybackButtons } from "./playback-buttons";
import Button from "@material-ui/core/Button";

describe("PlaybackButtons component", () => {
  let stores = createStores();
  beforeEach(() => {
    stores = createStores();
  });

  it("renders basic components", () => {
    const wrapper = mount(
      <Provider stores={stores}>
        <PlaybackButtons />
      </Provider>
    );
    expect(wrapper.find(Button).length).toEqual(2);
  });

  it("start button is disabled until model is ready", () => {
    const wrapper = mount(
      <Provider stores={stores}>
        <PlaybackButtons />
      </Provider>
    );
    const start = wrapper.find('[data-test="start-button"]').first();
    expect(start.prop("disabled")).toEqual(true);
  });

  describe("restart button", () => {
    it("resets both simulation and the view", () => {
      jest.spyOn(stores.simulation, "reset");
      jest.spyOn(stores.ui, "setNorthAtlanticView");
      const wrapper = mount(
        <Provider stores={stores}>
          <PlaybackButtons />
        </Provider>
      );
      wrapper.find('[data-test="restart-button"]').first().simulate("click");
      expect(stores.simulation.reset).toHaveBeenCalled();
      expect(stores.ui.setNorthAtlanticView).toHaveBeenCalled();
    });
  });
});
