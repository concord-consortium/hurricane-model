import * as React from "react";
import { IndexPage } from "./index-page";
import { render, screen, fireEvent } from "@testing-library/react";
import { createStores } from "../models/stores";
import { Provider } from "mobx-react";
import { PNG } from "pngjs";
import * as logModule from "../log";

jest.spyOn(logModule, "log").mockImplementation(() => undefined);

describe("IndexPage component", () => {
  let stores = createStores();
  beforeEach(() => {
    stores = createStores();
  });
  it("renders without crashing", () => {
    render(
      <Provider stores={stores}>
        <IndexPage />
      </Provider>
    );
  });

  it("shows loading icon", () => {
    const { rerender, container } = render(
      <Provider stores={stores}>
        <IndexPage />
      </Provider>
    );
    expect(container.querySelector(".MuiCircularProgress-root")).toBeInTheDocument();
    stores.simulation.seaSurfaceTempData = new PNG();
    rerender(
      <Provider stores={stores}>
        <IndexPage />
      </Provider>
    );
    expect(container.querySelector(".MuiCircularProgress-root")).not.toBeInTheDocument();
  });

  describe("mouse enter/leave logging", () => {
    // Stub getBoundingClientRect since jsdom returns zeros and the component needs real
    // dimensions to compute percentX/percentY.
    function withRect(width: number, height: number) {
      const original = Element.prototype.getBoundingClientRect;
      Element.prototype.getBoundingClientRect = function() {
        return {
          left: 0, top: 0, right: width, bottom: height, width, height, x: 0, y: 0, toJSON: () => ({})
        } as DOMRect;
      };
      return () => { Element.prototype.getBoundingClientRect = original; };
    }

    it("logs SimulationMouseEnter with position data", () => {
      (logModule.log as jest.Mock).mockClear();
      const restore = withRect(500, 400);
      render(
        <Provider stores={stores}>
          <IndexPage />
        </Provider>
      );
      fireEvent.mouseEnter(screen.getByTestId("index-page"), { clientX: 150, clientY: 200 });
      restore();

      const call = (logModule.log as jest.Mock).mock.calls.find(
        (c: any[]) => c[0] === "SimulationMouseEnter"
      );
      expect(call).toBeDefined();
      expect(call[1]).toEqual({ clientX: 150, clientY: 200, percentX: 30, percentY: 50 });
    });

    it("logs SimulationMouseLeave with position data", () => {
      (logModule.log as jest.Mock).mockClear();
      const restore = withRect(500, 400);
      render(
        <Provider stores={stores}>
          <IndexPage />
        </Provider>
      );
      fireEvent.mouseLeave(screen.getByTestId("index-page"), { clientX: 500, clientY: 400 });
      restore();

      const call = (logModule.log as jest.Mock).mock.calls.find(
        (c: any[]) => c[0] === "SimulationMouseLeave"
      );
      expect(call).toBeDefined();
      expect(call[1]).toEqual({ clientX: 500, clientY: 400, percentX: 100, percentY: 100 });
    });

    it("rounds percentX and percentY to integers", () => {
      (logModule.log as jest.Mock).mockClear();
      const restore = withRect(200, 300);
      render(
        <Provider stores={stores}>
          <IndexPage />
        </Provider>
      );
      // (33/200)*100 = 16.5 → 17, (77/300)*100 ≈ 25.667 → 26
      fireEvent.mouseEnter(screen.getByTestId("index-page"), { clientX: 33, clientY: 77 });
      restore();

      const call = (logModule.log as jest.Mock).mock.calls.find(
        (c: any[]) => c[0] === "SimulationMouseEnter"
      );
      expect(call[1].percentX).toBe(17);
      expect(call[1].percentY).toBe(26);
      expect(Number.isInteger(call[1].percentX)).toBe(true);
      expect(Number.isInteger(call[1].percentY)).toBe(true);
    });
  });
});
