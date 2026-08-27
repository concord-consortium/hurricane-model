import * as React from "react";
import { render, screen } from "@testing-library/react";
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
    it("toggles the panel when clicked", async () => {
      const user = userEvent.setup();
      const toggleOpen = jest.fn();
      renderPanel(false, toggleOpen);
      await user.click(screen.getByTestId("storm-setup-tab"));
      expect(toggleOpen).toHaveBeenCalled();
    });

    it("slides behind the panel and leaves the tab order when the panel is open", () => {
      const { unmount } = renderPanel(false);
      const tab = screen.getByTestId("storm-setup-tab");
      expect(tab).not.toHaveClass("open");
      expect(tab).not.toHaveAttribute("tabindex", "-1");
      unmount();

      renderPanel(true);
      const openTab = screen.getByTestId("storm-setup-tab");
      expect(openTab).toHaveClass("open");
      expect(openTab).toHaveAttribute("tabindex", "-1");
    });
  });
});
