import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { createStores, IStores } from "../models/stores";
import { StoresContext } from "../stores-context";
import { RegionTemperatureControl } from "./region-temperature-control";

const renderControl = (stores: IStores) =>
  render(
    <StoresContext value={stores}>
      <RegionTemperatureControl regionKey="gulf" />
    </StoresContext>
  );

describe("RegionTemperatureControl", () => {
  let stores: IStores;
  const incButton = () => screen.getByRole("button", { name: /increase gulf temperature/i });
  const inc = () => fireEvent.click(incButton());
  const decButton = () => screen.getByRole("button", { name: /decrease gulf temperature/i });
  const dec = () => fireEvent.click(decButton());

  beforeEach(() => { stores = createStores(); });

  it("shows Baseline at 0 and signed values otherwise", () => {
    renderControl(stores);
    expect(screen.getByText("Baseline")).toBeInTheDocument();

    // statusText renders a non-breaking space (U+00A0) between value and unit — getByText's default
    // normalizer collapses it to a regular space — and a true minus sign (U+2212) for negatives.
    inc();
    expect(stores.simulation.temperatureAnomalyAt("gulf")).toBe(1);
    expect(screen.getByText("+1 °C")).toBeInTheDocument();

    dec(); dec();
    expect(screen.getByText("−1 °C")).toBeInTheDocument();
  });

  it("disables the buttons at the clamp limits", () => {
    renderControl(stores);

    inc(); inc(); inc(); // +3
    expect(incButton()).toBeDisabled();
    expect(decButton()).not.toBeDisabled();

    dec(); dec(); dec();
    dec(); dec(); dec(); // -3
    expect(decButton()).toBeDisabled();
    expect(incButton()).not.toBeDisabled();
  });
});
