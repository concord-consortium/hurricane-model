import * as React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

    it("is the first Tab stop, is named Reload with a matching tooltip, and reloads on Enter", async () => {
      const user = userEvent.setup();
      const reloadSpy = jest.spyOn((TopBar as any).wrappedComponent.prototype, "reloadWindow")
        .mockImplementation(() => undefined);

      renderTopBar();
      await user.tab();
      const reload = screen.getByRole("button", { name: "Reload" });
      expect(reload).toHaveFocus();
      expect(reload).toHaveAttribute("title", "Reload");
      await user.keyboard("{Enter}");
      await waitFor(() => expect(reloadSpy).toHaveBeenCalled());

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

  describe.each([
    { name: "Share", tabs: 2 },
    { name: "About", tabs: 3 }
  ])("$name button keyboard access", ({ name, tabs }) => {
    it("is reachable by Tab, opens with Enter, and gets focus back when the dialog closes", async () => {
      const user = userEvent.setup();
      renderTopBar();
      const button = screen.getByRole("button", { name });
      for (let i = 0; i < tabs; i++) {
        await user.tab();
      }
      expect(button).toHaveFocus();
      await user.keyboard("{Enter}");
      expect(await screen.findByRole("dialog")).toHaveAccessibleName(`${name}: Hurricane Explorer`);
      await user.keyboard("{Escape}");
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(button).toHaveFocus();
    });

    it("gets focus back after a click that does not focus it, as in Safari", async () => {
      const user = userEvent.setup();
      renderTopBar();
      const button = screen.getByRole("button", { name });
      fireEvent.click(button);
      expect(await screen.findByRole("dialog")).toHaveAccessibleName(`${name}: Hurricane Explorer`);
      await user.keyboard("{Escape}");
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(button).toHaveFocus();
    });
  });
});
