import * as React from "react";
import { Provider } from "mobx-react";
import { render, screen } from "@testing-library/react";
import { createStores } from "../models/stores";
import { StartLocationButton } from "./start-location-button";

describe("StartLocationButton component", () => {
  const stores = createStores();
  const renderButton = () => render(
    <Provider stores={stores}>
      <StartLocationButton />
    </Provider>
  );

  it("renders basic components", () => {
    renderButton();
    expect(screen.getByTestId("start-location-container")).toBeInTheDocument();
  });

  it("start location button is disabled while model is running", () => {
    stores.simulation.simulationStarted = true;
    renderButton();
    expect(screen.getByTestId("start-location-container")).toHaveClass("disabled");
  });
});
