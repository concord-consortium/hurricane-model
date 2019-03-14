import * as React from "react";
import { mount } from "enzyme";
import { createStores } from "../models/stores";
import { Provider } from "mobx-react";
import { PressureSystemIcon, minStrength, maxStrength, mbLabelRange } from "./pressure-system-icon";
import Slider from "@material-ui/lab/Slider";
import * as css from "./pressure-system-icon.scss";

describe("PressureSystemIcon component", () => {
  let stores = createStores();
  beforeEach(() => {
    stores = createStores();
  });

  it("renders Slider", () => {
    const wrapper = mount(
      <Provider stores={stores}>
        <PressureSystemIcon model={stores.simulation.pressureSystems[0]}/>
      </Provider>
    );
    expect(wrapper.find(Slider).length).toEqual(1);
  });

  it("strength slider change updates underlying model", () => {
    const model = stores.simulation.pressureSystems[0];
    const wrapper = mount(
      <Provider stores={stores}>
        <PressureSystemIcon model={model}/>
      </Provider>
    );
    const icon = (wrapper.find(PressureSystemIcon).instance() as any).wrappedInstance as PressureSystemIcon;
    icon.handleStrengthChange(null, 123);
    expect(model.strength).toEqual(123);
  });

  it("label renders pressure in mb", () => {
    const model = stores.simulation.pressureSystems[0];
    const wrapper = mount(
      <Provider stores={stores}>
        <PressureSystemIcon model={model}/>
      </Provider>
    );
    const icon = (wrapper.find(PressureSystemIcon).instance() as any).wrappedInstance as PressureSystemIcon;

    model.setStrength(1500000);
    model.type = "high";
    expect(icon.renderLabel()).toEqual(
      1015 + Math.round((1500000 - minStrength) / (maxStrength - minStrength) * mbLabelRange) + "mb"
    );

    model.setStrength(1000000);
    model.type = "low";
    expect(icon.renderLabel()).toEqual(
      1010 - Math.round((1000000 - minStrength) / (maxStrength - minStrength) * mbLabelRange) + "mb"
    );
  });

  it("icon and sliders are disabled while model is running", () => {
    stores.simulation.simulationStarted = true;
    const model = stores.simulation.pressureSystems[0];
    const wrapper = mount(
      <Provider stores={stores}>
        <PressureSystemIcon model={model}/>
      </Provider>
    );
    const pressureIcon = wrapper.find('[data-test="pressure-system-icon"]').first();
    expect(pressureIcon.hasClass(css.disabled)).toEqual(true);
  });
});
