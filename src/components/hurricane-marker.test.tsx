import * as React from "react";
import * as Leaflet from "leaflet";
import { render, screen, waitFor } from "@testing-library/react";
import { MapContainer, useMap } from "react-leaflet";
import config from "../config";
import { createStores } from "../models/stores";
import { HurricaneMarker, HurricaneIcon } from "./hurricane-marker";
import { StoresContext } from "../stores-context";

// Inside the storm placement region, so it won't be clamped.
const insideRegion = { lat: 25, lng: -50 };

describe("HurricaneMarker component", () => {
  let stores = createStores();
  let map: Leaflet.Map;
  const originalMode = config.mode;

  beforeEach(() => {
    stores = createStores();
  });

  afterEach(() => {
    config.mode = originalMode;
  });

  const MapRef = () => {
    map = useMap();
    return null;
  };

  const renderMarker = () => render(
    <StoresContext value={stores}>
      <MapContainer center={[0, 0]} zoom={10}>
        <MapRef />
        <HurricaneMarker />
      </MapContainer>
    </StoresContext>
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

  it("renders without crashing", () => {
    renderMarker();
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
      stores.ui.setSetupMode("stormLocation");
      stores.simulation.simulationStarted = true;
      renderMarker();
      expect(draggableEl()).toBeNull();
    });

    it("is not draggable when the thermometer is active", () => {
      stores.ui.setThermometerActive(true);
      renderMarker();
      expect(draggableEl()).toBeNull();
    });

    it("is not draggable in read only mode", () => {
      stores.ui.setMode("report");
      stores.simulation.simulationStarted = false;
      renderMarker();
      expect(draggableEl()).toBeNull();
    });

    it("switches to the stormLocation setup mode and moves the hurricane while being dragged", () => {
      stores.ui.setSetupMode("season");
      stores.simulation.simulationStarted = false;
      renderMarker();
      const marker = getMarker();
      marker.setLatLng(insideRegion);
      marker.fire("drag");
      expect(stores.ui.setupMode).toEqual("stormLocation");
      expect(stores.simulation.hurricane.center).toEqual(insideRegion);
    });

    it("saves the start location when the drag ends", () => {
      stores.simulation.simulationStarted = false;
      renderMarker();
      const marker = getMarker();
      marker.setLatLng(insideRegion);
      marker.fire("dragend");
      expect(stores.simulation.startLocation).toEqual(insideRegion);
    });
  });

  describe("in hurricane mode", () => {
    beforeEach(() => {
      config.mode = "hurricane";
    });

    it("is never draggable, even before the simulation starts", () => {
      stores.simulation.simulationStarted = false;
      renderMarker();
      expect(draggableEl()).toBeNull();
    });
  });

  describe("dimming", () => {
    beforeEach(() => {
      config.mode = "storm";
    });

    it("is not dimmed when not in a setup mode", async () => {
      renderMarker();
      await waitFor(() => {
        const markerEl = document.querySelector(`[data-test="hurricane-marker"]`);
        expect(markerEl).not.toBeNull();
        expect(markerEl).not.toHaveClass("dimmed");
      });
    });

    it("is not dimmed in stormCategory setup mode", async () => {
      stores.ui.setSetupMode("stormCategory");
      renderMarker();
      await waitFor(() => {
        const markerEl = document.querySelector(`[data-test="hurricane-marker"]`);
        expect(markerEl).not.toBeNull();
        expect(markerEl).not.toHaveClass("dimmed");
      });
    });

    it("is dimmed in season setup mode", async () => {
      stores.ui.setSetupMode("season");
      renderMarker();
      await waitFor(() => {
        const markerEl = document.querySelector(`[data-test="hurricane-marker"]`);
        expect(markerEl).not.toBeNull();
        expect(markerEl).toHaveClass("dimmed");
      });
    });
  });
});

describe("HurricaneIcon component", () => {
  let stores = createStores();
  beforeEach(() => {
    stores = createStores();
  });

  const renderIcon = (draggable = true) => render(
    <StoresContext value={stores}>
      <MapContainer center={[0, 0]} zoom={10}>
        <HurricaneIcon draggable={draggable} />
      </MapContainer>
    </StoresContext>
  );

  it("renders hurricane category", () => {
    const { rerender } = renderIcon();
    expect(screen.getByTestId("hurricane-category")).toBeInTheDocument();

    const rerenderIcon = () => rerender(
      <StoresContext value={stores}>
        <MapContainer center={[0, 0]} zoom={10}>
          <HurricaneIcon draggable={true} />
        </MapContainer>
      </StoresContext>
    );

    stores.simulation.hurricane.strength = 20;
    rerenderIcon();
    expect(screen.getByTestId("hurricane-category")).toHaveAttribute("data-value", "0"); // tropical storm

    stores.simulation.hurricane.strength = 54;
    rerenderIcon();
    expect(screen.getByTestId("hurricane-category"))
      .toHaveAttribute("data-value", String(stores.simulation.hurricane.category));

    stores.simulation.hurricane.strength = 100;
    rerenderIcon();
    expect(screen.getByTestId("hurricane-category")).toHaveAttribute("data-value", "5");
  });

  it("renders the hurricane's latitude and longitude", () => {
    stores.simulation.hurricane.center = { lat: 25.5, lng: -80.25 };
    renderIcon();
    expect(screen.getByText("25.50°N, 80.25°W")).toBeInTheDocument();
  });

  it("is disabled when it isn't draggable", () => {
    renderIcon(false);
    expect(screen.getByTestId("hurricane-marker")).toHaveClass("disabled");
  });

  it("is not disabled when it is draggable", () => {
    renderIcon(true);
    expect(screen.getByTestId("hurricane-marker")).not.toHaveClass("disabled");
  });
});
