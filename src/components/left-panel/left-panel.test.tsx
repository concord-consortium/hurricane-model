import * as React from "react";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "mobx-react";
import { createStores } from "../../models/stores";
import { StoresContext } from "../../stores-context";
import { LeftPanel } from "./left-panel";

describe("LeftPanel component", () => {
  let stores = createStores();
  const renderPanel = (open: boolean, toggleOpen = () => undefined) => render(
    <StoresContext value={stores}>
      <Provider stores={stores}>
        <LeftPanel open={open} toggleOpen={toggleOpen} />
      </Provider>
    </StoresContext>
  );

  beforeEach(() => {
    stores = createStores();
  });

  describe("storm setup tab", () => {
    const getTabBack = () => screen.getByTestId("tab-setup").querySelector(".tabBack");

    it("renders the setup sections", () => {
      renderPanel(true);
      expect(screen.getByTestId("left-panel")).toBeInTheDocument();
      expect(screen.getByTestId("season-button")).toBeInTheDocument();
    });

    it("clears the setup mode when the simulation starts", () => {
      stores.ui.setSetupMode("season");
      renderPanel(true);
      expect(stores.ui.setupMode).toBe("season");
      act(() => stores.simulation.setSimulationStarted(true));
      expect(stores.ui.setupMode).toBeUndefined();
    });

    it("toggles the panel when clicked", async () => {
      const user = userEvent.setup();
      const toggleOpen = jest.fn();
      renderPanel(false, toggleOpen);
      await user.click(screen.getByTestId("tab-setup"));
      expect(toggleOpen).toHaveBeenCalled();
    });

    // jsdom renders the inert attribute but doesn't implement its behavior, so the attribute
    // itself is what can be asserted here — the browser enforces the rest.
    it("is inert while the panel is open, so the hidden tab can't be clicked or tabbed to", () => {
      const { unmount } = renderPanel(false);
      expect(screen.getByTestId("tab-setup")).not.toHaveAttribute("inert");
      unmount();

      renderPanel(true);
      expect(screen.getByTestId("tab-setup")).toHaveAttribute("inert");
    });

    it("slides behind the panel when the panel is open", () => {
      const { unmount } = renderPanel(false);
      expect(getTabBack()).not.toHaveClass("active");
      unmount();

      renderPanel(true);
      expect(getTabBack()).toHaveClass("active");
    });
  });
});
