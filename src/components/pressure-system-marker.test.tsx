import * as React from "react";
import * as Leaflet from "leaflet";
import { render, waitFor } from "@testing-library/react";
import { createStores } from "../models/stores";
import { Provider } from "mobx-react";
import { MapContainer, useMap } from "react-leaflet";
import config from "../config";
import { PressureSystemMarker } from "./pressure-system-marker";

describe("PressureSystemMarker component", () => {
  let stores = createStores();
  let map: Leaflet.Map;
  const originalMode = config.mode;
  const originalLocked = config.pressureSystemsLocked;

  beforeEach(() => {
    stores = createStores();
  });

  afterEach(() => {
    config.mode = originalMode;
    config.pressureSystemsLocked = originalLocked;
  });

  const MapRef = () => {
    map = useMap();
    return null;
  };

  const renderMarker = () => render(
    <Provider stores={stores}>
      <MapContainer center={[0, 0]} zoom={10}>
        <MapRef />
        <PressureSystemMarker model={stores.simulation.pressureSystemsSetup[0]}/>
      </MapContainer>
    </Provider>
  );

  const getMarker = () => {
    let marker: Leaflet.Marker | undefined;
    map.eachLayer(layer => {
      if (layer instanceof Leaflet.Marker) {
        marker = layer;
      }
    });
    return marker as Leaflet.Marker;
  };

  const draggableEl = () => document.querySelector(".leaflet-marker-draggable");

  const iconEl = async () => {
    let icon: Element | null = null;
    await waitFor(() => {
      icon = document.querySelector(`[data-test="pressure-system-icon"]`);
      expect(icon).not.toBeNull();
    });
    return icon as unknown as Element;
  };

  it("renders without crashing", () => {
    renderMarker();
  });

  it("updates pressure center position via setPressureSysCenter", () => {
    const model = stores.simulation.pressureSystemsSetup[0];
    stores.simulation.setPressureSysCenter(model, { lat: 20, lng: 30 });
    expect(model.center).toEqual({ lat: 20, lng: 30 });

    // Limit lat to 15, don't let users drag the pressure system to southern hemisphere.
    stores.simulation.setPressureSysCenter(model, { lat: 0, lng: 30 });
    expect(model.center).toEqual({ lat: 15, lng: 30 });
  });

  describe("in storm mode", () => {
    beforeEach(() => {
      config.mode = "storm";
    });

    it("is draggable before the simulation starts, even outside of a setup mode", () => {
      stores.ui.setSetupMode(undefined);
      stores.simulation.simulationStarted = false;
      renderMarker();
      expect(draggableEl()).not.toBeNull();
    });

    it("is draggable while another setup mode is active", () => {
      stores.ui.setSetupMode("season");
      stores.simulation.simulationStarted = false;
      renderMarker();
      expect(draggableEl()).not.toBeNull();
    });

    it("is not draggable once the simulation has started", () => {
      stores.ui.setSetupMode("pressureSystems");
      stores.simulation.simulationStarted = true;
      renderMarker();
      expect(draggableEl()).toBeNull();
    });

    it("is not draggable in read only mode", () => {
      stores.ui.setMode("report");
      stores.simulation.simulationStarted = false;
      renderMarker();
      expect(draggableEl()).toBeNull();
    });

    it("switches to the pressureSystems setup mode while being dragged", () => {
      stores.ui.setSetupMode("season");
      stores.simulation.simulationStarted = false;
      renderMarker();
      getMarker().fire("drag", { latlng: Leaflet.latLng(20, -50) });
      expect(stores.ui.setupMode).toEqual("pressureSystems");
      expect(stores.simulation.pressureSystemsSetup[0].center).toEqual({ lat: 20, lng: -50 });
    });

    it("is dimmed while another setup mode is active", async () => {
      stores.ui.setSetupMode("season");
      renderMarker();
      expect(await iconEl()).toHaveClass("dimmed");
    });

    it("is not dimmed in the pressureSystems setup mode", async () => {
      stores.ui.setSetupMode("pressureSystems");
      renderMarker();
      expect(await iconEl()).not.toHaveClass("dimmed");
    });

    it("is not dimmed outside of a setup mode", async () => {
      stores.ui.setSetupMode(undefined);
      renderMarker();
      expect(await iconEl()).not.toHaveClass("dimmed");
    });
  });

  describe("in hurricane mode", () => {
    beforeEach(() => {
      config.mode = "hurricane";
    });

    it("is draggable by default", () => {
      renderMarker();
      expect(draggableEl()).not.toBeNull();
    });

    it("is not draggable when pressure systems are locked", () => {
      config.pressureSystemsLocked = true;
      renderMarker();
      expect(draggableEl()).toBeNull();
    });

    it("is not draggable when the thermometer is active", () => {
      stores.ui.setThermometerActive(true);
      renderMarker();
      expect(draggableEl()).toBeNull();
    });

    it("is not draggable once the simulation has started", () => {
      stores.simulation.simulationStarted = true;
      renderMarker();
      expect(draggableEl()).toBeNull();
    });

    it("is not draggable in read only mode", () => {
      stores.ui.setMode("report");
      renderMarker();
      expect(draggableEl()).toBeNull();
    });

    it("doesn't set a setup mode while being dragged", () => {
      renderMarker();
      getMarker().fire("drag", { latlng: Leaflet.latLng(20, -50) });
      expect(stores.ui.setupMode).toBeUndefined();
      expect(stores.simulation.pressureSystemsSetup[0].center).toEqual({ lat: 20, lng: -50 });
    });
  });
});
