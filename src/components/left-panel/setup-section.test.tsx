import * as React from "react";
import { act, render, screen } from "@testing-library/react";

import { createStores, IStores } from "../../models/stores";
import { StoresContext } from "../../stores-context";
import { SetupSection } from "./setup-section";

const renderSection = (stores: IStores) =>
  render(
    <StoresContext value={stores}>
      <SetupSection setupMode="season" title="Season" />
    </StoresContext>
  );

describe("SetupSection", () => {
  let stores: IStores;

  beforeEach(() => {
    stores = createStores();
  });

  it("disables the section header once the simulation has started", () => {
    renderSection(stores);
    // ListItemButton renders a div with role="button", so disabled state shows up as aria-disabled.
    expect(screen.getByTestId("Season-button")).not.toHaveAttribute("aria-disabled");

    act(() => stores.simulation.setSimulationStarted(true));

    expect(screen.getByTestId("Season-button")).toHaveAttribute("aria-disabled", "true");
  });
});
