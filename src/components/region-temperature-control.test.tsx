import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { createStores, IStores } from "../models/stores";
import { StoresContext } from "../stores-context";
import { RegionTemperatureControl } from "./region-temperature-control";

const renderControl = (stores: IStores) =>
  render(
    <StoresContext value={stores}>
      <RegionTemperatureControl regionKey="gulf" variant="panel" />
    </StoresContext>
  );

describe("RegionTemperatureControl", () => {
  let stores: IStores;
  beforeEach(() => { stores = createStores(); });

  it("shows Baseline at 0 and signed values otherwise", () => {
    renderControl(stores);
    expect(screen.getByText("Baseline")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /increase gulf temperature/i }));
    expect(stores.simulation.temperatureAnomalyAt("gulf")).toBe(1);
    expect(screen.getByText("+1°C")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /decrease gulf temperature/i }));
    fireEvent.click(screen.getByRole("button", { name: /decrease gulf temperature/i }));
    expect(screen.getByText("-1°C")).toBeInTheDocument();
  });

  it("disables the buttons at the clamp limits", () => {
    renderControl(stores);
    const inc = screen.getByRole("button", { name: /increase gulf temperature/i });
    const dec = screen.getByRole("button", { name: /decrease gulf temperature/i });

    fireEvent.click(inc); fireEvent.click(inc); fireEvent.click(inc); // +3
    expect(inc).toBeDisabled();
    expect(dec).not.toBeDisabled();

    fireEvent.click(dec); fireEvent.click(dec); fireEvent.click(dec);
    fireEvent.click(dec); fireEvent.click(dec); fireEvent.click(dec); // -3
    expect(dec).toBeDisabled();
    expect(inc).not.toBeDisabled();
  });
});
