import * as React from "react";
import { IndexPage } from "./index-page";
import { mount } from "enzyme";
import { createStores } from "../models/stores";
import { Provider } from "mobx-react";
import CircularProgress from "@material-ui/core/CircularProgress";
import { PNG } from "pngjs";
import * as logModule from "../log";

jest.spyOn(logModule, "log").mockImplementation(() => undefined);

describe("IndexPage component", () => {
  let stores = createStores();
  beforeEach(() => {
    stores = createStores();
  });
  it("renders without crashing", () => {
    mount(
      <Provider stores={stores}>
        <IndexPage />
      </Provider>
    );
  });

  it("shows loading icon", () => {
    const wrapper = mount(
      <Provider stores={stores}>
        <IndexPage />
      </Provider>
    );
    expect(wrapper.find(CircularProgress).length).toEqual(1);
    stores.simulation.seaSurfaceTempData = new PNG();
    wrapper.update();
    expect(wrapper.find(CircularProgress).length).toEqual(0);
  });

  describe("mouse enter/leave logging", () => {
    it("logs SimulationMouseEnter with position data", () => {
      (logModule.log as jest.Mock).mockClear();
      const wrapper = mount(
        <Provider stores={stores}>
          <IndexPage />
        </Provider>
      );
      const indexPage = wrapper.find(IndexPage).childAt(0).instance() as IndexPage;
      const mockEvent = {
        clientX: 150,
        clientY: 200,
        currentTarget: {
          getBoundingClientRect: () => ({
            left: 0, top: 0, width: 500, height: 400
          })
        }
      } as unknown as React.MouseEvent;
      (indexPage as any).handleMouseEnter(mockEvent);
      const call = (logModule.log as jest.Mock).mock.calls.find(
        (c: any[]) => c[0] === "SimulationMouseEnter"
      );
      expect(call).toBeDefined();
      expect(call[1]).toEqual({
        clientX: 150,
        clientY: 200,
        percentX: 30,
        percentY: 50
      });
    });

    it("logs SimulationMouseLeave with position data", () => {
      (logModule.log as jest.Mock).mockClear();
      const wrapper = mount(
        <Provider stores={stores}>
          <IndexPage />
        </Provider>
      );
      const indexPage = wrapper.find(IndexPage).childAt(0).instance() as IndexPage;
      const mockEvent = {
        clientX: 500,
        clientY: 400,
        currentTarget: {
          getBoundingClientRect: () => ({
            left: 0, top: 0, width: 500, height: 400
          })
        }
      } as unknown as React.MouseEvent;
      (indexPage as any).handleMouseLeave(mockEvent);
      const call = (logModule.log as jest.Mock).mock.calls.find(
        (c: any[]) => c[0] === "SimulationMouseLeave"
      );
      expect(call).toBeDefined();
      expect(call[1]).toEqual({
        clientX: 500,
        clientY: 400,
        percentX: 100,
        percentY: 100
      });
    });

    it("rounds percentX and percentY to integers", () => {
      (logModule.log as jest.Mock).mockClear();
      const wrapper = mount(
        <Provider stores={stores}>
          <IndexPage />
        </Provider>
      );
      const indexPage = wrapper.find(IndexPage).childAt(0).instance() as IndexPage;
      const mockEvent = {
        clientX: 33,
        clientY: 33,
        currentTarget: {
          getBoundingClientRect: () => ({
            left: 0, top: 0, width: 100, height: 100
          })
        }
      } as unknown as React.MouseEvent;
      (indexPage as any).handleMouseEnter(mockEvent);
      const call = (logModule.log as jest.Mock).mock.calls.find(
        (c: any[]) => c[0] === "SimulationMouseEnter"
      );
      expect(call[1].percentX).toBe(33);
      expect(call[1].percentY).toBe(33);
      expect(Number.isInteger(call[1].percentX)).toBe(true);
      expect(Number.isInteger(call[1].percentY)).toBe(true);
    });
  });
});
