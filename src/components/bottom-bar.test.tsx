import * as React from "react";
import { mount } from "enzyme";
import { createStores } from "../models/stores";
import { Provider } from "mobx-react";
import { BottomBar } from "./bottom-bar";
import { SeasonButton } from "./season-button";
import { WindArrowsToggle } from "./wind-arrows-toggle";
import { HurricaneImageToggle } from "./hurricane-image-toggle";
import Button from "@material-ui/core/Button";

describe("BottomBar component", () => {
  let stores = createStores();
  beforeEach(() => {
    stores = createStores();
  });

  it("renders basic components", () => {
    const wrapper = mount(
      <Provider stores={stores}>
        <BottomBar />
      </Provider>
    );
    expect(wrapper.find(SeasonButton).length).toEqual(1);
    expect(wrapper.find(WindArrowsToggle).length).toEqual(1);
    expect(wrapper.find(HurricaneImageToggle).length).toEqual(1);
    expect(wrapper.find(Button).length).toEqual(4);
  });

  it("start button is disabled until model is ready", () => {
    const wrapper = mount(
      <Provider stores={stores}>
        <BottomBar />
      </Provider>
    );
    const start = wrapper.find('[data-test="start-button"]').first();
    expect(start.prop("disabled")).toEqual(true);
  });

  describe("restart button", () => {
    it("restarts simulation and sets view to the default North Atlantic area", () => {
      jest.spyOn(stores.simulation, "restart");
      jest.spyOn(stores.ui, "setNorthAtlanticView");
      const wrapper = mount(
        <Provider stores={stores}>
          <BottomBar />
        </Provider>
      );
      wrapper.find('[data-test="restart-button"]').first().simulate("click");
      expect(stores.simulation.restart).toHaveBeenCalled();
      expect(stores.ui.setNorthAtlanticView).toHaveBeenCalled();
    });
  });

  describe("reload button", () => {
    it("resets simulation and resets view", () => {
      jest.spyOn(stores.simulation, "reset");
      jest.spyOn(stores.ui, "reset");
      const wrapper = mount(
        <Provider stores={stores}>
          <BottomBar />
        </Provider>
      );
      wrapper.find('[data-test="reload-button"]').first().simulate("click");
      expect(stores.simulation.reset).toHaveBeenCalled();
      expect(stores.ui.reset).toHaveBeenCalled();
    });
  });

  describe("thermometer button", () => {
    it("is disabled when overlay is different from SST", () => {
      const wrapper = mount(
        <Provider stores={stores}>
          <BottomBar />
        </Provider>
      );
      let start = wrapper.find('[data-test="temp-button"]').first();
      expect(start.prop("disabled")).toEqual(false);
      stores.ui.setOverlay("stormSurge");
      wrapper.update();
      start = wrapper.find('[data-test="temp-button"]').first();
      expect(start.prop("disabled")).toEqual(true);
    });

    it("is disabled when simulation is started", () => {
      const wrapper = mount(
        <Provider stores={stores}>
          <BottomBar />
        </Provider>
      );
      let start = wrapper.find('[data-test="temp-button"]').first();
      expect(start.prop("disabled")).toEqual(false);
      stores.simulation.start();
      wrapper.update();
      start = wrapper.find('[data-test="temp-button"]').first();
      expect(start.prop("disabled")).toEqual(true);
    });
  });
});
