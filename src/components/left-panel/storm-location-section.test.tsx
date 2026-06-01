import * as React from "react";
import { act, render, screen, fireEvent } from "@testing-library/react";

import { createStores, IStores } from "../../models/stores";
import { StoresContext } from "../../stores-context";
import { isInsideRegion } from "../../utils/region";
import { stormPlacementRegion } from "../../utils/storm-placement-region";
import { StormLocationSection } from "./storm-location-section";

const renderSection = (stores: IStores) =>
  render(
    <StoresContext value={stores}>
      <StormLocationSection />
    </StoresContext>
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

  it("displays the current hurricane center coordinates with 2 decimals and updates when the center moves", () => {
    renderSection(stores);
    openSection();
    expect(latInput().value).toBe("20.00");
    expect(lngInput().value).toBe("-60.00");

    act(() => {
      // Simulate the drag handler updating just hurricane.center.
      stores.simulation.hurricane.setCenter({ lat: 25.123, lng: -75.987 }, stores.simulation.pressureSystems);
    });

    expect(latInput().value).toBe("25.12");
    expect(lngInput().value).toBe("-75.99");
  });

  it("commits and reverts properly", () => {
    renderSection(stores);
    openSection();

    // Enter commits
    latInput().focus();
    fireEvent.change(latInput(), { target: { value: "22.5" } });
    fireEvent.keyDown(latInput(), { key: "Enter" });

    expect(stores.simulation.startLocation).toEqual({ lat: 22.5, lng: -60 });
    expect(latInput().value).toBe("22.50");

    // Blur commits
    fireEvent.change(lngInput(), { target: { value: "-65" } });
    fireEvent.blur(lngInput());
    const newPoint = { lat: 22.5, lng: -65 };

    expect(stores.simulation.startLocation).toEqual(newPoint);
    expect(lngInput().value).toBe("-65.00");

    // Escape reverts
    fireEvent.change(latInput(), { target: { value: "99" } });
    expect(latInput().value).toBe("99");
    fireEvent.keyDown(latInput(), { key: "Escape" });

    expect(latInput().value).toBe("22.50");
    expect(stores.simulation.startLocation).toEqual(newPoint);

    // Non-numeric values revert
    fireEvent.change(latInput(), { target: { value: "abc" } });
    fireEvent.blur(latInput());

    expect(latInput().value).toBe("22.50");
    expect(stores.simulation.startLocation).toEqual(newPoint);

    // Empty input reverts
    fireEvent.change(lngInput(), { target: { value: "" } });
    fireEvent.blur(lngInput());

    expect(lngInput().value).toBe("-65.00");
    expect(stores.simulation.startLocation).toEqual(newPoint);
  });

  it("preserves the entered lat when (lat, currentLng) is outside the region", () => {
    // Pick a lat that's inside the region's lat range but where the *current*
    // lng (-60) is outside the legal lng range for that lat. The storm
    // placement region's southern tip is around lat 4 with lng around -45 to -52.
    // At lat = 5, current lng = -60 is outside; snap should preserve lat = 5
    // and pick an in-region lng close to -60.
    renderSection(stores);
    openSection();

    fireEvent.change(latInput(), { target: { value: "5" } });
    fireEvent.blur(latInput());

    const committed = stores.simulation.startLocation as { lat: number; lng: number };
    expect(committed.lat).toBeCloseTo(5, 5);
    // lng was nudged from -60 inward toward the region (the line lat=5 only
    // crosses the region east of -60).
    expect(committed.lng).toBeGreaterThan(-52);
    expect(committed.lng).toBeLessThan(-45);
  });

  it("falls back to clampToRegion when the entered axis is outside the region entirely", () => {
    renderSection(stores);
    openSection();

    // lat = 90 is way above the region — no legal lng exists at that lat.
    fireEvent.change(latInput(), { target: { value: "90" } });
    fireEvent.blur(latInput());

    const committed = stores.simulation.startLocation as { lat: number; lng: number };
    expect(isInsideRegion(committed, stormPlacementRegion)).toBe(true);
    // The clamped lat should NOT be 90 — it should snap into the region.
    expect(committed.lat).toBeLessThan(90);
  });
});
