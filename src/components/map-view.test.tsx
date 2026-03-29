import * as React from "react";
import { MapView } from "./map-view";
import { mount } from "enzyme";
import { Map } from "react-leaflet";
import { HurricaneMarker } from "./hurricane-marker";
import { PressureSystemMarker } from "./pressure-system-marker";
import { PixiWindLayer } from "./pixi-wind-layer";
import { ImageOverlay } from "react-leaflet";
import { HurricaneTrack } from "./hurricane-track";
import { LandfallRectangle } from "./landfall-rectangle";
import { createStores } from "../models/stores";
import { Provider } from "mobx-react";
import config from "../config";
import * as logModule from "../log";

jest.spyOn(logModule, "log").mockImplementation(() => undefined);

const createMockLeafletMouseEvent = (
  lat: number, lng: number,
  targetElement?: HTMLElement
) => ({
  latlng: { lat, lng },
  originalEvent: {
    target: targetElement || document.createElement("div")
  }
} as any);

describe("MapView component", () => {
  let stores = createStores();
  beforeEach(() => {
    stores = createStores();
  });

  it("renders (React) Leaflet map and basic components (hurricane, pressure systems, sst, wind layers, etc.)", () => {
    const wrapper = mount(
      <Provider stores={stores}>
        <MapView />
      </Provider>
    );
    expect(wrapper.find(Map).length).toEqual(1);
    expect(wrapper.find(PixiWindLayer).length).toEqual(1);
    expect(wrapper.find(ImageOverlay).length).toEqual(1);
    expect(wrapper.find(HurricaneMarker).length).toEqual(1);
    expect(wrapper.find(PressureSystemMarker).length).toEqual(4);
    expect(wrapper.find(HurricaneTrack).length).toEqual(1);
    expect(wrapper.find(LandfallRectangle).length).toEqual(0);
  });

  it("handles landfall rectangles correctly", () => {
    const oldMarkLandfalls = config.markLandfalls;
    config.markLandfalls = true;
    stores.simulation.simulationFinished = false;
    stores.simulation.landfalls = [{ position: {lat: 10, lng: 10}, category: 3 }];
    const wrapper = mount(
      <Provider stores={stores}>
        <MapView />
      </Provider>
    );
    expect(wrapper.find(LandfallRectangle).length).toEqual(0);
    // Show landfall rectangle only after simulation has finished.
    stores.simulation.simulationFinished = true;
    wrapper.update();
    expect(wrapper.find(LandfallRectangle).length).toEqual(1);
    config.markLandfalls = oldMarkLandfalls;
  });

  it("doesn't render hurricane if it's not active", () => {
    const wrapper = mount(
      <Provider stores={stores}>
        <MapView />
      </Provider>
    );
    expect(wrapper.find(HurricaneMarker).length).toEqual(1);
    stores.simulation.hurricane.setStrength(0);
    wrapper.update();
    expect(wrapper.find(HurricaneMarker).length).toEqual(0);
  });

  it("applies noTopBar class when topBarVisible is false", () => {
    const oldTopBarVisible = config.topBarVisible;
    config.topBarVisible = false;
    const wrapper = mount(
      <Provider stores={stores}>
        <MapView />
      </Provider>
    );
    expect(wrapper.find("#mapView").hostNodes().hasClass("noTopBar")).toBe(true);
    config.topBarVisible = oldTopBarVisible;
  });

  it("does not apply noTopBar class when topBarVisible is true", () => {
    const oldTopBarVisible = config.topBarVisible;
    config.topBarVisible = true;
    const wrapper = mount(
      <Provider stores={stores}>
        <MapView />
      </Provider>
    );
    expect(wrapper.find("#mapView").hostNodes().hasClass("noTopBar")).toBe(false);
    config.topBarVisible = oldTopBarVisible;
  });

  it("renders storm surge overlay in zoomed-in view", () => {
    const wrapper = mount(
      <Provider stores={stores}>
        <MapView />
      </Provider>
    );
    expect(wrapper.find({
      url: "https://tiles.arcgis.com/tiles/C8EMgrsFcRFL6LrL/arcgis/rest/services/Storm_Surge_HazardMaps_Category3" +
           "_v3/MapServer/tile/{z}/{y}/{x}"
    }).length).toEqual(0);

    stores.ui.zoomedInView = {
      landfallCategory: 3,
      stormSurgeAvailable: true
    };
    stores.ui.overlay = "stormSurge";
    wrapper.update();

    expect(wrapper.find({
      url: "https://tiles.arcgis.com/tiles/C8EMgrsFcRFL6LrL/arcgis/rest/services/Storm_Surge_HazardMaps_Category3" +
           "_v3/MapServer/tile/{z}/{y}/{x}"
    }).length).toBeGreaterThan(0);
  });

  describe("map click logging", () => {
    it("logs MapClicked with lat/lng when thermometer is inactive", () => {
      (logModule.log as jest.Mock).mockClear();
      const wrapper = mount(
        <Provider stores={stores}>
          <MapView />
        </Provider>
      );
      const mapView = (wrapper.find(MapView).instance() as any).wrappedInstance;
      stores.ui.thermometerActive = false;
      const mockEvent = createMockLeafletMouseEvent(25.5, -70.3);
      mapView.handleMouseClick(mockEvent);
      const call = (logModule.log as jest.Mock).mock.calls.find(
        (c: any[]) => c[0] === "MapClicked"
      );
      expect(call).toBeDefined();
      expect(call[1].position).toEqual({ lat: 25.5, lng: -70.3 });
    });

    it("logs ThermometerPinned instead of MapClicked when thermometer is active", () => {
      (logModule.log as jest.Mock).mockClear();
      const wrapper = mount(
        <Provider stores={stores}>
          <MapView />
        </Provider>
      );
      const mapView = (wrapper.find(MapView).instance() as any).wrappedInstance;
      stores.ui.thermometerActive = true;
      // Mock seaSurfaceTempAt to return a temperature
      jest.spyOn(stores.simulation, "seaSurfaceTempAt")
        .mockReturnValue(28.5);
      const mockEvent = createMockLeafletMouseEvent(20.0, -65.0);
      mapView.handleMouseClick(mockEvent);
      const pinnedCall = (logModule.log as jest.Mock).mock.calls.find(
        (c: any[]) => c[0] === "ThermometerPinned"
      );
      expect(pinnedCall).toBeDefined();
      expect(pinnedCall[1].position).toEqual({ lat: 20.0, lng: -65.0 });
      expect(pinnedCall[1].temperature).toBe(28.5);
      const mapClickCall = (logModule.log as jest.Mock).mock.calls.find(
        (c: any[]) => c[0] === "MapClicked"
      );
      expect(mapClickCall).toBeUndefined();
    });

    it("does not log MapClicked when click is on a marker", () => {
      (logModule.log as jest.Mock).mockClear();
      const wrapper = mount(
        <Provider stores={stores}>
          <MapView />
        </Provider>
      );
      const mapView = (wrapper.find(MapView).instance() as any).wrappedInstance;
      stores.ui.thermometerActive = false;
      // Create a target inside a leaflet-marker-pane
      const markerPane = document.createElement("div");
      markerPane.className = "leaflet-marker-pane";
      const target = document.createElement("div");
      markerPane.appendChild(target);
      document.body.appendChild(markerPane);
      const mockEvent = createMockLeafletMouseEvent(15.0, -50.0, target);
      mapView.handleMouseClick(mockEvent);
      const call = (logModule.log as jest.Mock).mock.calls.find(
        (c: any[]) => c[0] === "MapClicked"
      );
      expect(call).toBeUndefined();
      document.body.removeChild(markerPane);
    });
  });

  describe("thermometer hover logging", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("logs ThermometerHover after 1s debounce when thermometer is active", () => {
      (logModule.log as jest.Mock).mockClear();
      const wrapper = mount(
        <Provider stores={stores}>
          <MapView />
        </Provider>
      );
      const mapView = (wrapper.find(MapView).instance() as any).wrappedInstance;
      stores.ui.thermometerActive = true;
      jest.spyOn(stores.simulation, "seaSurfaceTempAt")
        .mockReturnValue(27.3);
      const mockEvent = createMockLeafletMouseEvent(22.0, -68.0);
      mapView.handleMouseMove(mockEvent);

      // Not logged yet at 999ms
      jest.advanceTimersByTime(999);
      expect((logModule.log as jest.Mock).mock.calls.find(
        (c: any[]) => c[0] === "ThermometerHover"
      )).toBeUndefined();

      // Logged at 1000ms
      jest.advanceTimersByTime(1);
      const call = (logModule.log as jest.Mock).mock.calls.find(
        (c: any[]) => c[0] === "ThermometerHover"
      );
      expect(call).toBeDefined();
      expect(call[1].position).toEqual({ lat: 22.0, lng: -68.0 });
      expect(call[1].temperature).toBe(27.3);
    });

    it("does not log ThermometerHover if thermometer is deactivated before timeout", () => {
      (logModule.log as jest.Mock).mockClear();
      const wrapper = mount(
        <Provider stores={stores}>
          <MapView />
        </Provider>
      );
      const mapView = (wrapper.find(MapView).instance() as any).wrappedInstance;
      stores.ui.thermometerActive = true;
      jest.spyOn(stores.simulation, "seaSurfaceTempAt")
        .mockReturnValue(26.0);
      const mockEvent = createMockLeafletMouseEvent(18.0, -72.0);
      mapView.handleMouseMove(mockEvent);

      // Deactivate thermometer before timeout fires
      stores.ui.thermometerActive = false;
      jest.advanceTimersByTime(1000);

      const call = (logModule.log as jest.Mock).mock.calls.find(
        (c: any[]) => c[0] === "ThermometerHover"
      );
      expect(call).toBeUndefined();
    });
  });
});
