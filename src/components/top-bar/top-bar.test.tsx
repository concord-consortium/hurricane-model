import * as React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "mobx-react";
import { createStores } from "../../models/stores";
import { StoresContext } from "../../stores-context";
import { TopBar } from "./top-bar";
import * as logModule from "../../log";
import * as cloudStorage from "../../utils/cloud-storage";

jest.spyOn(logModule, "log").mockImplementation(() => undefined);
jest.spyOn(cloudStorage, "saveModelToCloud").mockResolvedValue("test-model-id");

describe("TopBar component", () => {
  let stores = createStores();
  beforeEach(() => {
    stores = createStores();
  });

  const renderTopBar = () => render(
    <Provider stores={stores}>
      <StoresContext value={stores}>
        <TopBar />
      </StoresContext>
    </Provider>
  );

  describe("Reload button", () => {
    it("reloads the model using window.location.reload", async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      // reloadWindow is a separate method specifically so we can stub it in tests
      // (jsdom 26 makes window.location.reload itself non-mockable).
      const reloadSpy = jest.spyOn((TopBar as any).wrappedComponent.prototype, "reloadWindow")
        .mockImplementation(() => undefined);

      renderTopBar();
      await user.click(screen.getByTestId("reload"));
      jest.advanceTimersByTime(150);
      expect(reloadSpy).toHaveBeenCalled();

      reloadSpy.mockRestore();
      jest.useRealTimers();
    });

    it("logs SimulationEnded with reason TopBarReloadButtonClicked before reloading", async () => {
      const user = userEvent.setup();
      (logModule.log as jest.Mock).mockClear();
      const reloadSpy = jest.spyOn((TopBar as any).wrappedComponent.prototype, "reloadWindow")
        .mockImplementation(() => undefined);

      renderTopBar();
      await user.click(screen.getByTestId("reload"));

      const endedCall = (logModule.log as jest.Mock).mock.calls.find(
        (c: any[]) => c[0] === "SimulationEnded"
      );
      expect(endedCall).toBeDefined();
      expect(endedCall[1].reason).toBe("TopBarReloadButtonClicked");
      expect(endedCall[1].outcome).toBeDefined();
      expect(endedCall[1].outcome).toHaveProperty("trackPointCount");

      reloadSpy.mockRestore();
    });
  });

  describe("Share button", () => {
    it("opens share dialog", async () => {
      const user = userEvent.setup();
      renderTopBar();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      await user.click(screen.getByTestId("share"));
      expect(await screen.findByRole("dialog")).toBeInTheDocument();
    });
  });

  describe("About button", () => {
    it("opens about dialog", async () => {
      const user = userEvent.setup();
      renderTopBar();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      await user.click(screen.getByTestId("about"));
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });
});
