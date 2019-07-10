import * as React from "react";
import { mount } from "enzyme";
import { createStores } from "../models/stores";
import { Provider } from "mobx-react";
import { RightPanel } from "./right-panel";
import config from "../config";

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
    expect(wrapper.find('[data-test="base-panel"]').exists()).toEqual(true);
    // impact panel is not rendered until the tab is clicked
    expect(wrapper.find('[data-test="overlay-panel"]').length).toEqual(0);
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
    wrapper.find("#base").simulate("click");
    expect(panel.state.open).toBe(true);
    // looking at geo panel, no impact panel rendered
    expect(wrapper.find('[data-test="base-panel"]').exists()).toEqual(true);
    expect(wrapper.find('[data-test="overlay-panel"]').length).toEqual(0);
  });

  it("remains open when a different tab is clicked", () => {
    const wrapper = mount(
      <Provider stores={stores}>
        <RightPanel />
      </Provider>
    );
    const panel = (wrapper.find(RightPanel).instance() as any).wrappedInstance as RightPanel;
    expect(panel.state.open).toBe(false);
    wrapper.find("#base").simulate("click");
    expect(panel.state.open).toBe(true);
    wrapper.find("#overlay").simulate("click");
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
    wrapper.find("#base").simulate("click");
    expect(panel.state.open).toBe(true);
    wrapper.find("#base").simulate("click");
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
    wrapper.find("#overlay").simulate("click");
    expect(panel.state.open).toBe(true);
    // geo panel now hidden, impact is visible
    expect(wrapper.find('[data-test="base-panel"]').length).toEqual(0);
    expect(wrapper.find('[data-test="overlay-panel"]').exists()).toEqual(true);
  });

  it("respects config.availableOverlay options", () => {
    const defValue = config.availableOverlays;

    config.availableOverlays = ["sst", "precipitation", "stormSurge"];
    let wrapper = mount(
      <Provider stores={stores}>
        <RightPanel />
      </Provider>
    );
    expect(wrapper.exists({tabType: "overlay"})).toEqual(true);
    wrapper.find("#overlay").simulate("click");
    expect(wrapper.exists({mapType: "overlay", value: "sst"})).toEqual(true);
    expect(wrapper.exists({mapType: "overlay", value: "precipitation"})).toEqual(true);
    expect(wrapper.exists({mapType: "overlay", value: "stormSurge"})).toEqual(true);

    config.availableOverlays = ["sst", "stormSurge"];
    wrapper = mount(
      <Provider stores={stores}>
        <RightPanel />
      </Provider>
    );
    expect(wrapper.exists({tabType: "overlay"})).toEqual(true);
    wrapper.find("#overlay").simulate("click");
    expect(wrapper.exists({mapType: "overlay", value: "sst"})).toEqual(true);
    expect(wrapper.exists({mapType: "overlay", value: "precipitation"})).toEqual(false);
    expect(wrapper.exists({mapType: "overlay", value: "stormSurge"})).toEqual(true);


    config.availableOverlays = ["sst"];
    wrapper = mount(
      <Provider stores={stores}>
        <RightPanel />
      </Provider>
    );
    expect(wrapper.exists({tabType: "overlay"})).toEqual(true);
    wrapper.find("#overlay").simulate("click");
    expect(wrapper.exists({mapType: "overlay", value: "sst"})).toEqual(true);
    expect(wrapper.exists({mapType: "overlay", value: "precipitation"})).toEqual(false);
    expect(wrapper.exists({mapType: "overlay", value: "stormSurge"})).toEqual(false);


    config.availableOverlays = [];
    wrapper = mount(
      <Provider stores={stores}>
        <RightPanel />
      </Provider>
    );
    expect(wrapper.exists({tabType: "overlay"})).toEqual(false);

    config.availableOverlays = defValue;
  });
});
