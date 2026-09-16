import * as React from "react";
import { render, screen } from "@testing-library/react";
import config from "../config";
import { createStores } from "../models/stores";
import { Provider } from "mobx-react";
import { strengthRange } from "../utils/pressure-systems";
import { PressureSystem, PressureSystemType } from "../models/pressure-system";
import { invertLowStrength, PressureSystemIcon } from "./pressure-system-icon";

describe("PressureSystemIcon component", () => {
  let stores = createStores();
  beforeEach(() => {
    stores = createStores();
  });

  const renderIcon = (model: PressureSystem, disabled?: boolean) => {
    render(
      <Provider stores={stores}>
        <PressureSystemIcon model={model} disabled={disabled} />
      </Provider>
    );
  };

  it("renders Slider", () => {
    renderIcon(stores.simulation.pressureSystemsSetup[0]);
    expect(screen.getByTestId("pressure-system-slider")).toBeInTheDocument();
  });

  it("label renders pressure in mb (high)", () => {
    const model = stores.simulation.pressureSystemsSetup[0];
    model.type = "high";
    model.setStrength(strengthRange.high.strong);
    renderIcon(model);
    expect(screen.getByText("1030mb")).toBeInTheDocument();
  });

  it("label renders pressure in mb (low)", () => {
    const model = stores.simulation.pressureSystemsSetup[0];
    model.type = "low";
    model.setStrength(strengthRange.low.strong);
    renderIcon(model);
    expect(screen.getByText("990mb")).toBeInTheDocument();
  });

  it.each<PressureSystemType>(["high", "low"])("gives the %s pressure system its own slider bounds", type => {
    const model = stores.simulation.pressureSystemsSetup[0];
    model.type = type;
    renderIcon(model);
    const slider = screen.getByTestId("pressure-system-slider").querySelector("input");
    expect(slider).toHaveAttribute("max", String(strengthRange[type].strong));
  });

  it("puts the strongest low system at the bottom of the slider", () => {
    const model = stores.simulation.pressureSystemsSetup[0];
    model.type = "low";
    model.setStrength(strengthRange.low.strong);
    renderIcon(model);
    // Both sliders read as pressure rather than strength, so the low one is inverted: its
    // strongest system is the lowest mb and sits at the bottom, where the slider value is weak.
    // Not an exact comparison: strong + weak - strong drifts off weak by ~4e-15, and MUI
    // does not snap a controlled value to the step.
    const slider = screen.getByTestId("pressure-system-slider").querySelector("input");
    expect(Number(slider?.value)).toBeCloseTo(strengthRange.low.weak);
  });

  describe("invertLowStrength", () => {
    it("maps between the ends of the low range", () => {
      expect(invertLowStrength(strengthRange.low.weak)).toBeCloseTo(strengthRange.low.strong);
      expect(invertLowStrength(strengthRange.low.strong)).toBeCloseTo(strengthRange.low.weak);
    });

    it("is self-inverse, so it round-trips slider value back to strength", () => {
      const strength = 12.5;
      expect(invertLowStrength(invertLowStrength(strength))).toBe(strength);
    });
  });

  describe("label badge", () => {
    const originalMode = config.mode;
    afterEach(() => {
      config.mode = originalMode;
    });

    it("renders in storm mode when the model has a label", () => {
      config.mode = "storm";
      const model = stores.simulation.pressureSystemsSetup[0];
      model.label = "2";
      renderIcon(model);
      expect(screen.getByTestId("pressure-system-label")).toHaveTextContent("2");
    });

    it("does not render when the label is empty", () => {
      config.mode = "storm";
      const model = stores.simulation.pressureSystemsSetup[0];
      model.label = "";
      renderIcon(model);
      expect(screen.queryByTestId("pressure-system-label")).not.toBeInTheDocument();
    });

    it("does not render outside of storm mode", () => {
      config.mode = "hurricane";
      const model = stores.simulation.pressureSystemsSetup[0];
      model.label = "2";
      renderIcon(model);
      expect(screen.queryByTestId("pressure-system-label")).not.toBeInTheDocument();
    });
  });

  it("icon is disabled when disabled prop is true", () => {
    renderIcon(stores.simulation.pressureSystemsSetup[0], true);
    expect(screen.getByTestId("pressure-system-icon")).toHaveClass("disabled");
  });

  it("icon is enabled when disabled prop is false", () => {
    renderIcon(stores.simulation.pressureSystemsSetup[0], false);
    expect(screen.getByTestId("pressure-system-icon")).not.toHaveClass("disabled");
  });

  it("icon is enabled by default when disabled prop is not provided", () => {
    renderIcon(stores.simulation.pressureSystemsSetup[0]);
    expect(screen.getByTestId("pressure-system-icon")).not.toHaveClass("disabled");
  });

  // Note: a previous enzyme test checked that handleSliderDragEnd logs
  // PressureSystemStrengthUpdated with type, position, and value, by calling the handler
  // directly on the component instance. Covering it through RTL would mean simulating
  // Material-UI Slider's mouse-drag events, which is fragile, so it stays uncovered here;
  // the log helper itself is tested separately.
});
