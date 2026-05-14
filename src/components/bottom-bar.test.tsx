import * as React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createStores } from "../models/stores";
import { Provider } from "mobx-react";
import { BottomBar } from "./bottom-bar";
import { PNG } from "pngjs";
import * as logModule from "../log";

jest.spyOn(logModule, "log").mockImplementation(() => undefined);

describe("BottomBar component", () => {
  let stores = createStores();
  beforeEach(() => {
    stores = createStores();
  });

  it("renders basic components", () => {
    render(
      <Provider stores={stores}>
        <BottomBar />
      </Provider>
    );
    expect(screen.getByTestId("season-container")).toBeInTheDocument();
    expect(screen.getByTestId("reload-button")).toBeInTheDocument();
    expect(screen.getByTestId("restart-button")).toBeInTheDocument();
    expect(screen.getByTestId("start-button")).toBeInTheDocument();
    expect(screen.getByTestId("temp-button")).toBeInTheDocument();
  });

  it("start button is disabled until model is ready", () => {
    render(
      <Provider stores={stores}>
        <BottomBar />
      </Provider>
    );
    expect(screen.getByTestId("start-button")).toBeDisabled();
  });

  describe("restart button", () => {
    it("restarts simulation and sets view to the default North Atlantic area", async () => {
      const user = userEvent.setup();
      jest.spyOn(stores.simulation, "restart");
      jest.spyOn(stores.ui, "setNorthAtlanticView");
      render(
        <Provider stores={stores}>
          <BottomBar />
        </Provider>
      );
      await user.click(screen.getByTestId("restart-button"));
      expect(stores.simulation.restart).toHaveBeenCalled();
      expect(stores.ui.setNorthAtlanticView).toHaveBeenCalled();
    });

    it("logs SimulationEnded with reason SimulationRestarted before restarting", async () => {
      const user = userEvent.setup();
      (logModule.log as jest.Mock).mockClear();
      render(
        <Provider stores={stores}>
          <BottomBar />
        </Provider>
      );
      await user.click(screen.getByTestId("restart-button"));
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
    it("opens the confirmation dialog without resetting", async () => {
      const user = userEvent.setup();
      jest.spyOn(stores.simulation, "reset");
      jest.spyOn(stores.ui, "reset");
      (logModule.log as jest.Mock).mockClear();
      render(
        <Provider stores={stores}>
          <BottomBar />
        </Provider>
      );
      await user.click(screen.getByTestId("reload-button"));
      expect(screen.getByTestId("reload-confirm-button")).toBeInTheDocument();
      expect(screen.getByTestId("reload-cancel-button")).toBeInTheDocument();
      expect(stores.simulation.reset).not.toHaveBeenCalled();
      expect(stores.ui.reset).not.toHaveBeenCalled();
      const endedCall = (logModule.log as jest.Mock).mock.calls.find(
        (c: any[]) => c[0] === "SimulationEnded"
      );
      expect(endedCall).toBeUndefined();

      await user.click(screen.getByTestId("reload-cancel-button"));
      expect(stores.simulation.reset).not.toHaveBeenCalled();
      expect(stores.ui.reset).not.toHaveBeenCalled();
    });

    it("resets simulation and resets view when Reload is confirmed", async () => {
      const user = userEvent.setup();
      jest.spyOn(stores.simulation, "reset");
      jest.spyOn(stores.ui, "reset");
      render(
        <Provider stores={stores}>
          <BottomBar />
        </Provider>
      );
      await user.click(screen.getByTestId("reload-button"));
      await user.click(screen.getByTestId("reload-confirm-button"));
      expect(stores.simulation.reset).toHaveBeenCalled();
      expect(stores.ui.reset).toHaveBeenCalled();
    });

    it("logs SimulationEnded with reason SimulationReloaded when Reload is confirmed", async () => {
      const user = userEvent.setup();
      (logModule.log as jest.Mock).mockClear();
      render(
        <Provider stores={stores}>
          <BottomBar />
        </Provider>
      );
      await user.click(screen.getByTestId("reload-button"));
      await user.click(screen.getByTestId("reload-confirm-button"));
      const endedCall = (logModule.log as jest.Mock).mock.calls.find(
        (c: any[]) => c[0] === "SimulationEnded"
      );
      expect(endedCall).toBeDefined();
      expect(endedCall[1].reason).toBe("SimulationReloaded");
      expect(endedCall[1].outcome).toBeDefined();
    });
  });

  describe("stop button logging", () => {
    it("logs SimulationStopped with outcome data", async () => {
      const user = userEvent.setup();
      (logModule.log as jest.Mock).mockClear();
      // Make the simulation "ready" so the start button isn't disabled. Stub `start`
      // so it just toggles simulationRunning without ticking — the synchronous tick
      // would otherwise crash on uninitialized PNG data, and we're only testing the
      // log call here, not the simulation step.
      stores.simulation.seaSurfaceTempData = new PNG();
      jest.spyOn(stores.simulation, "start").mockImplementation(function(this: any) {
        this.simulationRunning = true;
        this.simulationStarted = true;
      });
      jest.spyOn(stores.simulation, "stop").mockImplementation(function(this: any) {
        this.simulationRunning = false;
      });
      render(
        <Provider stores={stores}>
          <BottomBar />
        </Provider>
      );
      // Click start
      await user.click(screen.getByTestId("start-button"));
      (logModule.log as jest.Mock).mockClear();
      // Click again — now it's stop
      await user.click(screen.getByTestId("start-button"));
      const stoppedCall = (logModule.log as jest.Mock).mock.calls.find(
        (c: any[]) => c[0] === "SimulationStopped"
      );
      expect(stoppedCall).toBeDefined();
      expect(stoppedCall[1]).toHaveProperty("outcome");
      expect(stoppedCall[1].outcome).toHaveProperty("trackPointCount");
    });
  });

  describe("start button logging", () => {
    it("logs SimulationStarted with full parameters before starting", async () => {
      const user = userEvent.setup();
      (logModule.log as jest.Mock).mockClear();
      stores.simulation.seaSurfaceTempData = new PNG();
      // Stub start to avoid tick crashing on uninitialized PNG data.
      jest.spyOn(stores.simulation, "start").mockImplementation(function(this: any) {
        this.simulationRunning = true;
        this.simulationStarted = true;
      });
      render(
        <Provider stores={stores}>
          <BottomBar />
        </Provider>
      );
      await user.click(screen.getByTestId("start-button"));
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
      const { rerender } = render(
        <Provider stores={stores}>
          <BottomBar />
        </Provider>
      );
      expect(screen.getByTestId("temp-button")).not.toBeDisabled();
      stores.ui.setOverlay("stormSurge");
      rerender(
        <Provider stores={stores}>
          <BottomBar />
        </Provider>
      );
      expect(screen.getByTestId("temp-button")).toBeDisabled();
    });

    it("is enabled when simulation is started", () => {
      const { rerender } = render(
        <Provider stores={stores}>
          <BottomBar />
        </Provider>
      );
      expect(screen.getByTestId("temp-button")).not.toBeDisabled();
      stores.simulation.start();
      rerender(
        <Provider stores={stores}>
          <BottomBar />
        </Provider>
      );
      expect(screen.getByTestId("temp-button")).not.toBeDisabled();
    });
  });
});
