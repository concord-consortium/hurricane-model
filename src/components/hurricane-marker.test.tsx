import * as React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { createStores } from "../models/stores";
import { MapContainer } from "react-leaflet";
import { HurricaneMarker, HurricaneIcon } from "./hurricane-marker";
import { StoresContext } from "../stores-context";

describe("HurricaneMarker component", () => {
  let stores = createStores();
  beforeEach(() => {
    stores = createStores();
  });

  const renderMarker = () => render(
    <StoresContext value={stores}>
      <MapContainer center={[0, 0]} zoom={10}>
        <HurricaneMarker />
      </MapContainer>
    </StoresContext>
  );

  it("renders without crashing", () => {
    renderMarker();
  });

  it("is not draggable by default (outside of setup mode)", () => {
    stores.ui.setSetupMode(undefined);
    renderMarker();
    const draggableEl = document.querySelector(".leaflet-marker-draggable");
    expect(draggableEl).toBeNull();
  });

  it("is draggable while in stormLocation setup mode and simulation has not started", () => {
    stores.ui.setSetupMode("stormLocation");
    stores.simulation.simulationStarted = false;
    renderMarker();
    const draggableEl = document.querySelector(".leaflet-marker-draggable");
    expect(draggableEl).not.toBeNull();
  });

  it("is not dimmed in stormCategory setup mode", async () => {
    stores.ui.setSetupMode("stormCategory");
    stores.simulation.simulationStarted = false;
    renderMarker();
    const draggableEl = document.querySelector(".leaflet-marker-draggable");
    expect(draggableEl).toBeNull();
    await waitFor(() => {
      const markerEl = document.querySelector(`[data-test="hurricane-marker"]`);
      expect(markerEl).not.toBeNull();
      expect(markerEl).not.toHaveClass("dimmed");
    });
  });

  it("is dimmed in season setup mode", async () => {
    stores.ui.setSetupMode("season");
    stores.simulation.simulationStarted = false;
    renderMarker();
    const draggableEl = document.querySelector(".leaflet-marker-draggable");
    expect(draggableEl).toBeNull();
    await waitFor(() => {
      const markerEl = document.querySelector(`[data-test="hurricane-marker"]`);
      expect(markerEl).not.toBeNull();
      expect(markerEl).toHaveClass("dimmed");
    });
  });

  it("is not draggable once the simulation has started, even in setup mode", () => {
    stores.ui.setSetupMode("stormLocation");
    stores.simulation.simulationStarted = true;
    renderMarker();
    const draggableEl = document.querySelector(".leaflet-marker-draggable");
    expect(draggableEl).toBeNull();
  });
});

describe("HurricaneIcon component", () => {
  let stores = createStores();
  beforeEach(() => {
    stores = createStores();
  });

  it("renders hurricane category", () => {
    const { rerender } = render(
      <StoresContext value={stores}>
        <MapContainer center={[0, 0]} zoom={10}>
          <HurricaneIcon />
        </MapContainer>
      </StoresContext>
    );
    expect(screen.getByTestId("hurricane-category")).toBeInTheDocument();

    stores.simulation.hurricane.strength = 20;
    rerender(
      <StoresContext value={stores}>
        <MapContainer center={[0, 0]} zoom={10}>
          <HurricaneIcon />
        </MapContainer>
      </StoresContext>
    );
    expect(screen.getByTestId("hurricane-category")).toHaveAttribute("data-value", "0"); // tropical storm

    stores.simulation.hurricane.strength = 54;
    rerender(
      <StoresContext value={stores}>
        <MapContainer center={[0, 0]} zoom={10}>
          <HurricaneIcon />
        </MapContainer>
      </StoresContext>
    );
    expect(screen.getByTestId("hurricane-category"))
      .toHaveAttribute("data-value", String(stores.simulation.hurricane.category));

    stores.simulation.hurricane.strength = 100;
    rerender(
      <StoresContext value={stores}>
        <MapContainer center={[0, 0]} zoom={10}>
          <HurricaneIcon />
        </MapContainer>
      </StoresContext>
    );
    expect(screen.getByTestId("hurricane-category")).toHaveAttribute("data-value", "5");
  });

  it("renders the hurricane's latitude and longitude", () => {
    stores.simulation.hurricane.center = { lat: 25.5, lng: -80.25 };
    render(
      <StoresContext value={stores}>
        <MapContainer center={[0, 0]} zoom={10}>
          <HurricaneIcon />
        </MapContainer>
      </StoresContext>
    );
    expect(screen.getByText("25.50°N, 80.25°W")).toBeInTheDocument();
  });
});
