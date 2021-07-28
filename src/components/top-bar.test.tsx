import * as React from "react";
import { shallow } from "enzyme";
import { createStores } from "../models/stores";
import { TopBar } from "./top-bar";

describe("TopBar component", () => {
  let stores = createStores();
  beforeEach(() => {
    stores = createStores();
  });

  describe("Reload button", () => {
    it("reloads the model using window.location.reload", (done) => {
      const wrapper = shallow(
        <TopBar />
      );
      const topBar = wrapper.instance() as TopBar;
      window.location.reload = jest.fn();
      topBar.handleReload();
      setTimeout(() => {
        expect(window.location.reload).toHaveBeenCalled();
        done();
      }, 150);
    });
  });

  describe("Share button", () => {
    it("opens share dialog", () => {
      const wrapper = shallow(
        <TopBar />
      );
      expect(wrapper.find({open: true }).length).toEqual(0);
      wrapper.find("[data-test='share']").simulate("click");
      expect(wrapper.find({open: true }).length).toEqual(1);
    });
  });

  describe("About button", () => {
    it("opens about dialog", () => {
      const wrapper = shallow(
        <TopBar />
      );
      expect(wrapper.find({open: true }).length).toEqual(0);
      wrapper.find("[data-test='about']").simulate("click");
      expect(wrapper.find({open: true }).length).toEqual(1);
    });
  });
});
