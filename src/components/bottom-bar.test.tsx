import * as React from "react";
import { mount } from "enzyme";
import { createStores } from "../models/stores";
import { Provider } from "mobx-react";
import { BottomBar } from "./bottom-bar";
import { SeasonButton } from "./season-button";
import { WindArrowsToggle } from "./wind-arrows-toggle";
import { HurricaneImageToggle } from "./hurricane-image-toggle";
import Button from "@material-ui/core/Button";
import * as logModule from "../log";

jest.spyOn(logModule, "log").mockImplementation(() => undefined);

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

    it("logs SimulationEnded with reason SimulationRestarted before restarting", () => {
      (logModule.log as jest.Mock).mockClear();
      const wrapper = mount(
        <Provider stores={stores}>
          <BottomBar />
        </Provider>
      );
      wrapper.find('[data-test="restart-button"]').first().simulate("click");
      const endedCall = (logModule.log as jest.Mock).mock.calls.find(
        (c: any[]) => c[0] === "SimulationEnded"
      );
      expect(endedCall).toBeDefined();
      expect(endedCall[1].reason).toBe("SimulationRestarted");
      expect(endedCall[1].outcome).toBeDefined();
      expect(endedCall[1].outcome).toHaveProperty("trackPointCount");
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

    it("logs SimulationEnded with reason SimulationReloaded before resetting", () => {
      (logModule.log as jest.Mock).mockClear();
      const wrapper = mount(
        <Provider stores={stores}>
          <BottomBar />
        </Provider>
      );
      wrapper.find('[data-test="reload-button"]').first().simulate("click");
      const endedCall = (logModule.log as jest.Mock).mock.calls.find(
        (c: any[]) => c[0] === "SimulationEnded"
      );
      expect(endedCall).toBeDefined();
      expect(endedCall[1].reason).toBe("SimulationReloaded");
      expect(endedCall[1].outcome).toBeDefined();
    });
  });

  describe("stop button logging", () => {
    it("logs SimulationStopped with outcome data", () => {
      (logModule.log as jest.Mock).mockClear();
      const wrapper = mount(
        <Provider stores={stores}>
          <BottomBar />
        </Provider>
      );
      const bottomBar = wrapper.find(BottomBar).childAt(0).instance() as BottomBar;
      // Start the simulation first so we can stop it
      bottomBar.handleStartStop();
      (logModule.log as jest.Mock).mockClear();
      // Now stop it
      bottomBar.handleStartStop();
      const stoppedCall = (logModule.log as jest.Mock).mock.calls.find(
        (c: any[]) => c[0] === "SimulationStopped"
      );
      expect(stoppedCall).toBeDefined();
      expect(stoppedCall[1]).toHaveProperty("outcome");
      expect(stoppedCall[1].outcome).toHaveProperty("trackPointCount");
    });
  });

  describe("start button logging", () => {
    it("logs SimulationStarted with full parameters before starting", () => {
      (logModule.log as jest.Mock).mockClear();
      const wrapper = mount(
        <Provider stores={stores}>
          <BottomBar />
        </Provider>
      );
      const bottomBar = wrapper.find(BottomBar).childAt(0).instance() as BottomBar;
      bottomBar.handleStartStop();
      const startedCall = (logModule.log as jest.Mock).mock.calls.find(
        (c: any[]) => c[0] === "SimulationStarted"
      );
      expect(startedCall).toBeDefined();
      const params = startedCall[1];
      expect(params).toHaveProperty("startLocation");
      expect(params).toHaveProperty("season");
      expect(params).toHaveProperty("windArrows");
      expect(params).toHaveProperty("hurricaneImage");
      expect(params).toHaveProperty("baseMap");
      expect(params).toHaveProperty("overlay");
      expect(params).toHaveProperty("pressureSystems");
      expect(Array.isArray(params.pressureSystems)).toBe(true);
      expect(params).toHaveProperty("hurricane");
      expect(params.hurricane).toHaveProperty("strength");
      expect(params.hurricane).toHaveProperty("center");
      expect(params).toHaveProperty("deterministic");
      expect(params).toHaveProperty("timestep");
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

    it("is enabled when simulation is started", () => {
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
      expect(start.prop("disabled")).toEqual(false);
    });
  });
});
