import * as React from "react";
import { act, render, screen } from "@testing-library/react";

import { createStores, IStores } from "../../models/stores";
import { StoresContext } from "../../stores-context";
import { LeftPanel } from "./left-panel";

const renderPanel = (stores: IStores) =>
  render(
    <StoresContext value={stores}>
      <LeftPanel open={true} toggleOpen={jest.fn()} />
    </StoresContext>
  );

describe("LeftPanel", () => {
  let stores: IStores;

  beforeEach(() => {
    stores = createStores();
  });

  it("renders the setup sections", () => {
    renderPanel(stores);
    expect(screen.getByTestId("left-panel")).toBeInTheDocument();
    expect(screen.getByTestId("season-button")).toBeInTheDocument();
  });

  it("clears the setup mode when the simulation starts", () => {
    stores.ui.setSetupMode("season");
    renderPanel(stores);
    expect(stores.ui.setupMode).toBe("season");

    act(() => stores.simulation.setSimulationStarted(true));
    expect(stores.ui.setupMode).toBeUndefined();
  });
});
