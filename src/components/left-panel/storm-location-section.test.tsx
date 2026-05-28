import * as React from "react";
import { act, render, screen, fireEvent } from "@testing-library/react";
import { Provider } from "mobx-react";

import { createStores, IStores } from "../../models/stores";
import { StoresContext } from "../../stores-context";
import { StormLocationSection } from "./storm-location-section";

const renderSection = (stores: IStores) =>
  render(
    <Provider stores={stores}>
      <StoresContext value={stores}>
        <StormLocationSection />
      </StoresContext>
    </Provider>
  );

const openSection = () => {
  fireEvent.click(screen.getByTestId("storm-location-button"));
};

const latInput = () => screen.getByTestId("storm-location-lat-input") as HTMLInputElement;
const lngInput = () => screen.getByTestId("storm-location-lng-input") as HTMLInputElement;

// A coordinate that is well inside the storm placement region (Caribbean / Gulf).
const interiorPoint = { lat: 20, lng: -60 };

describe("StormLocationSection", () => {
  let stores: IStores;

  beforeEach(() => {
    stores = createStores();
    // Force a known starting coord so display assertions are deterministic.
    stores.simulation.setStartLocation(interiorPoint);
  });

  it("displays the current hurricane center coordinates with 2 decimals", () => {
    renderSection(stores);
    openSection();
    expect(latInput().value).toBe("20.00");
    expect(lngInput().value).toBe("-60.00");
  });

  it("updates both inputs live when the hurricane center moves (e.g. drag)", () => {
    renderSection(stores);
    openSection();

    act(() => {
      // Simulate the drag handler updating just hurricane.center.
      stores.simulation.hurricane.setCenter({ lat: 25.123, lng: -75.987 }, stores.simulation.pressureSystems);
    });

    expect(latInput().value).toBe("25.12");
    expect(lngInput().value).toBe("-75.99");
  });
});
