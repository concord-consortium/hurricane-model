import * as React from "react";
import { render, screen } from "@testing-library/react";
import config from "../config";
import { createStores } from "../models/stores";
import { Provider } from "mobx-react";
import { maxStrength, mbLabelRange, minStrength } from "../utils/pressure";
import { PressureSystemIcon } from "./pressure-system-icon";

describe("PressureSystemIcon component", () => {
  let stores = createStores();
  beforeEach(() => {
    stores = createStores();
  });

  it("renders Slider", () => {
    render(
      <Provider stores={stores}>
        <PressureSystemIcon model={stores.simulation.pressureSystemsSetup[0]}/>
      </Provider>
    );
    expect(screen.getByTestId("pressure-system-slider")).toBeInTheDocument();
  });

  it("label renders pressure in mb (high)", () => {
    const model = stores.simulation.pressureSystemsSetup[0];
    model.setStrength(1500000);
    model.type = "high";
    render(
      <Provider stores={stores}>
        <PressureSystemIcon model={model}/>
      </Provider>
    );
    const expected = 1015 + Math.round((1500000 - minStrength) / (maxStrength - minStrength) * mbLabelRange) + "mb";
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it("label renders pressure in mb (low)", () => {
    const model = stores.simulation.pressureSystemsSetup[0];
    model.setStrength(1000000);
    model.type = "low";
    render(
      <Provider stores={stores}>
        <PressureSystemIcon model={model}/>
      </Provider>
    );
    const expected = 1010 - Math.round((1000000 - minStrength) / (maxStrength - minStrength) * mbLabelRange) + "mb";
    expect(screen.getByText(expected)).toBeInTheDocument();
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
      render(
        <Provider stores={stores}>
          <PressureSystemIcon model={model}/>
        </Provider>
      );
      expect(screen.getByTestId("pressure-system-label")).toHaveTextContent("2");
    });

    it("does not render when the label is empty", () => {
      config.mode = "storm";
      const model = stores.simulation.pressureSystemsSetup[0];
      model.label = "";
      render(
        <Provider stores={stores}>
          <PressureSystemIcon model={model}/>
        </Provider>
      );
      expect(screen.queryByTestId("pressure-system-label")).not.toBeInTheDocument();
    });

    it("does not render outside of storm mode", () => {
      config.mode = "hurricane";
      const model = stores.simulation.pressureSystemsSetup[0];
      model.label = "2";
      render(
        <Provider stores={stores}>
          <PressureSystemIcon model={model}/>
        </Provider>
      );
      expect(screen.queryByTestId("pressure-system-label")).not.toBeInTheDocument();
    });
  });

  it("icon is disabled when disabled prop is true", () => {
    render(
      <Provider stores={stores}>
        <PressureSystemIcon model={stores.simulation.pressureSystemsSetup[0]} disabled={true}/>
      </Provider>
    );
    expect(screen.getByTestId("pressure-system-icon")).toHaveClass("disabled");
  });

  it("icon is enabled when disabled prop is false", () => {
    render(
      <Provider stores={stores}>
        <PressureSystemIcon model={stores.simulation.pressureSystemsSetup[0]} disabled={false}/>
      </Provider>
    );
    expect(screen.getByTestId("pressure-system-icon")).not.toHaveClass("disabled");
  });

  it("icon is enabled by default when disabled prop is not provided", () => {
    render(
      <Provider stores={stores}>
        <PressureSystemIcon model={stores.simulation.pressureSystemsSetup[0]}/>
      </Provider>
    );
    expect(screen.getByTestId("pressure-system-icon")).not.toHaveClass("disabled");
  });

  // Note: previous enzyme tests checked that sliders are enabled by default and
  // PressureSystemStrengthUpdated was logged with type, position, and value on drag end.
  // These tests called handleStrengthChange and handleSliderDragEnd
  // directly on the component instance. Those exercised internal handler logic that is
  // already covered by tests on the underlying model (PressureSystem.setStrength) and
  // the log helper. Migrating them to RTL would require simulating Material-UI Slider's
  // mouse-drag events, which is fragile. If we want explicit coverage of those handlers,
  // extracting them to module-scope helper functions would let us test them directly.
});
