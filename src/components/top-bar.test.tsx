import * as React from "react";
import { mount } from "enzyme";
import { Provider } from "mobx-react";
import { createStores } from "../models/stores";
import { TopBar } from "./top-bar";
import * as logModule from "../log";

jest.spyOn(logModule, "log").mockImplementation(() => undefined);

describe("TopBar component", () => {
  let stores = createStores();
  beforeEach(() => {
    stores = createStores();
  });

  describe("Reload button", () => {
    it("reloads the model using window.location.reload", (done) => {
      const wrapper = mount(
        <Provider stores={stores}>
          <TopBar />
        </Provider>
      );
      const topBar = wrapper.find((TopBar as any).wrappedComponent).instance() as TopBar;
      // https://remarkablemark.org/blog/2018/11/17/mock-window-location/#update-for-jsdom-14
      delete (window as any).location;
      window.location = { reload: jest.fn() } as any;
      topBar.handleReload();
      setTimeout(() => {
        expect(window.location.reload).toHaveBeenCalled();
        done();
      }, 150);
    });

    it("logs SimulationEnded with reason TopBarReloadButtonClicked before reloading", () => {
      (logModule.log as jest.Mock).mockClear();
      const wrapper = mount(
        <Provider stores={stores}>
          <TopBar />
        </Provider>
      );
      const topBar = wrapper.find((TopBar as any).wrappedComponent).instance() as TopBar;
      delete (window as any).location;
      window.location = { reload: jest.fn() } as any;
      topBar.handleReload();
      const endedCall = (logModule.log as jest.Mock).mock.calls.find(
        (c: any[]) => c[0] === "SimulationEnded"
      );
      expect(endedCall).toBeDefined();
      expect(endedCall[1].reason).toBe("TopBarReloadButtonClicked");
      expect(endedCall[1].outcome).toBeDefined();
      expect(endedCall[1].outcome).toHaveProperty("trackPointCount");
    });
  });

  describe("Share button", () => {
    it("opens share dialog", () => {
      const wrapper = mount(
        <Provider stores={stores}>
          <TopBar />
        </Provider>
      );
      expect(wrapper.find({open: true }).length).toEqual(0);
      wrapper.find("[data-test='share']").first().simulate("click");
      expect(wrapper.find({open: true }).length).toBeGreaterThan(0);
    });
  });

  describe("About button", () => {
    it("opens about dialog", () => {
      const wrapper = mount(
        <Provider stores={stores}>
          <TopBar />
        </Provider>
      );
      expect(wrapper.find({open: true }).length).toEqual(0);
      wrapper.find("[data-test='about']").first().simulate("click");
      expect(wrapper.find({open: true }).length).toBeGreaterThan(0);
    });
  });
});
