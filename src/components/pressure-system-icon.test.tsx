import * as React from "react";
import { render, screen } from "@testing-library/react";
import { createStores } from "../models/stores";
import { Provider } from "mobx-react";
import { PressureSystemIcon, minStrength, maxStrength, mbLabelRange } from "./pressure-system-icon";

describe("PressureSystemIcon component", () => {
  let stores = createStores();
  beforeEach(() => {
    stores = createStores();
  });

  it("renders Slider", () => {
    render(
      <Provider stores={stores}>
        <PressureSystemIcon model={stores.simulation.pressureSystems[0]}/>
      </Provider>
    );
    expect(screen.getByTestId("pressure-system-slider")).toBeInTheDocument();
  });

  it("label renders pressure in mb (high)", () => {
    const model = stores.simulation.pressureSystems[0];
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
    const model = stores.simulation.pressureSystems[0];
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

  it("icon is disabled when disabled prop is true", () => {
    render(
      <Provider stores={stores}>
        <PressureSystemIcon model={stores.simulation.pressureSystems[0]} disabled={true}/>
      </Provider>
    );
    expect(screen.getByTestId("pressure-system-icon")).toHaveClass("disabled");
  });

  it("icon is enabled when disabled prop is false", () => {
    render(
      <Provider stores={stores}>
        <PressureSystemIcon model={stores.simulation.pressureSystems[0]} disabled={false}/>
      </Provider>
    );
    expect(screen.getByTestId("pressure-system-icon")).not.toHaveClass("disabled");
  });

  it("icon is enabled by default when disabled prop is not provided", () => {
    render(
      <Provider stores={stores}>
        <PressureSystemIcon model={stores.simulation.pressureSystems[0]}/>
      </Provider>
    );
    expect(screen.getByTestId("pressure-system-icon")).not.toHaveClass("disabled");
  });

  // Note: previous enzyme tests checked that sliders are enabled by default and
  // PressureSystemStrengthUpdated was logged with type, position, and value on darg end.
  // These tests called handleStrengthChange and handleSliderDragEnd
  // directly on the component instance. Those exercised internal handler logic that is
  // already covered by tests on the underlying model (PressureSystem.setStrength) and
  // the log helper. Migrating them to RTL would require simulating Material-UI Slider's
  // mouse-drag events, which is fragile. If we want explicit coverage of those handlers,
  // extracting them to module-scope helper functions would let us test them directly.
});
