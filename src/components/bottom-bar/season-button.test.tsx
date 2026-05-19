import * as React from "react";
import { render, screen } from "@testing-library/react";
import { createStores } from "../../models/stores";
import { Provider } from "mobx-react";
import { SeasonButton } from "./season-button";

describe("SeasonButton component", () => {
  const stores = createStores();
  const renderSeasonButton = () => render(
    <Provider stores={stores}>
      <SeasonButton />
    </Provider>
  );

  it("renders basic components", () => {
    renderSeasonButton();
    expect(screen.getByTestId("season-container")).toBeInTheDocument();
  });

  it("season button is disabled while model is running", () => {
    stores.simulation.simulationStarted = true;
    renderSeasonButton();
    expect(screen.getByTestId("season-container")).toHaveClass("disabled");
  });
});
