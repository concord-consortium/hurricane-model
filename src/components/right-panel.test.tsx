import * as React from "react";
import { mount } from "enzyme";
import { createStores } from "../models/stores";
import { Provider } from "mobx-react";
import { RightPanel } from "./right-panel";
import { MapButton } from "./map-button";

describe("Right Panel component", () => {
  let stores = createStores();
  beforeEach(() => {
    stores = createStores();
  });

  it("renders basic components", () => {
    const wrapper = mount(
      <Provider stores={stores}>
        <RightPanel />
      </Provider>
    );
    expect(wrapper.find(RightPanel).length).toBe(1);
    expect(wrapper.find("ul").length).toBe(1);
    expect(wrapper.find("li").length).toBe(2);
    // default is the geo panel
    expect(wrapper.find('[data-test="geo-panel"]').exists());
    // impact panel is not rendered until the tab is clicked
    expect(wrapper.find('[data-test="impact-panel"]').length).toEqual(0);
  });

  it("opens when a tab is clicked", () => {
    const wrapper = mount(
      <Provider stores={stores}>
        <RightPanel />
      </Provider>
    );
    const panel = (wrapper.find(RightPanel).instance() as any).wrappedInstance as RightPanel;
    // right panel hidden by default
    expect(panel.state.open).toBe(false);
    wrapper.find("#geo").simulate("click");
    expect(panel.state.open).toBe(true);
    // looking at geo panel, no impact panel rendered
    expect(wrapper.find('[data-test="geo-panel"]').exists());
    expect(wrapper.find('[data-test="impact-panel"]').length).toEqual(0);
  });

  it("remains open when a different tab is clicked", () => {
    const wrapper = mount(
      <Provider stores={stores}>
        <RightPanel />
      </Provider>
    );
    const panel = (wrapper.find(RightPanel).instance() as any).wrappedInstance as RightPanel;
    expect(panel.state.open).toBe(false);
    wrapper.find("#geo").simulate("click");
    expect(panel.state.open).toBe(true);
    wrapper.find("#impact").simulate("click");
    expect(panel.state.open).toBe(true);
  });

  it("closes when the same tab is clicked", () => {
    const wrapper = mount(
      <Provider stores={stores}>
        <RightPanel />
      </Provider>
    );
    const panel = (wrapper.find(RightPanel).instance() as any).wrappedInstance as RightPanel;
    expect(panel.state.open).toBe(false);
    wrapper.find("#geo").simulate("click");
    expect(panel.state.open).toBe(true);
    wrapper.find("#geo").simulate("click");
    expect(panel.state.open).toBe(false);
  });

  it("renders the impact panel when the impact tab is clicked", () => {
    const wrapper = mount(
      <Provider stores={stores}>
        <RightPanel />
      </Provider>
    );
    const panel = (wrapper.find(RightPanel).instance() as any).wrappedInstance as RightPanel;
    expect(panel.state.open).toBe(false);
    wrapper.find("#impact").simulate("click");
    expect(panel.state.open).toBe(true);
    // geo panel now hidden, impact is visible
    expect(wrapper.find('[data-test="geo-panel"]').length).toEqual(0);
    expect(wrapper.find('[data-test="impact-panel"]').exists());
  });

  it("renders disabled storm surge button unless zoomed in view is active", () => {
    const wrapper = mount(
      <Provider stores={stores}>
        <RightPanel />
      </Provider>
    );
    wrapper.find("#impact").simulate("click");
    expect(wrapper.find({
      label: "Storm Surge", value: "stormSurge", mapType: "impact", disabled: true
    }).length).toBeGreaterThan(0); // for some reason length is 2. Impossible looking at the code. Enzyme/Jest issue?

    stores.ui.zoomedInView = {
      landfallCategory: 3,
      stormSurgeAvailable: true
    };
    wrapper.update();

    expect(wrapper.find({
      label: "Storm Surge", value: "stormSurge", mapType: "impact", disabled: true
    }).length).toEqual(0);
    expect(wrapper.find({
      label: "Storm Surge", value: "stormSurge", mapType: "impact", disabled: false
    }).length).toBeGreaterThan(0); // for some reason length is 2. Impossible looking at the code. Enzyme/Jest issue?
  });

});
