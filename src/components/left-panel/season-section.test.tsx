import * as React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";

import { createStores, IStores } from "../../models/stores";
import { StoresContext } from "../../stores-context";
import { modeSeasons, seasonLabels } from "../../types";
import { SeasonSection } from "./season-section";

const renderSection = (stores: IStores) =>
  render(
    <StoresContext value={stores}>
      <SeasonSection />
    </StoresContext>
  );

const openSection = () => {
  fireEvent.click(screen.getByTestId("season-button"));
};

const seasonButton = (label: string) => screen.getByRole("button", { name: label });

// The storm-mode seasons are the ones rendered as buttons by SeasonSection.
const stormSeasons = modeSeasons.storm;

describe("SeasonSection", () => {
  let stores: IStores;

  beforeEach(() => {
    stores = createStores();
    // Start from a known, valid storm-mode season so selection assertions are deterministic.
    stores.simulation.setSeason("summer");
  });

  it("buttons render and operate correctly", () => {
    renderSection(stores);
    openSection();

    stormSeasons.forEach(season => {
      expect(seasonButton(seasonLabels[season])).toBeInTheDocument();
    });

    // Correct button is selected
    expect(seasonButton(seasonLabels.summer)).toHaveClass("selected");
    expect(seasonButton(seasonLabels.earlyFall)).not.toHaveClass("selected");
    expect(seasonButton(seasonLabels.lateFall)).not.toHaveClass("selected");

    // Doesn't update the model when the button for the currently selected season is clicked
    fireEvent.click(seasonButton(seasonLabels.summer));

    expect(stores.simulation.season).toBe("summer");

    // Updates the model and ui when another button is clicked
    act(() => {
      stores.simulation.setSeason("lateFall");
    });

    expect(stores.simulation.season).toBe("lateFall");
    expect(seasonButton(seasonLabels.lateFall)).toHaveClass("selected");
    expect(seasonButton(seasonLabels.summer)).not.toHaveClass("selected");
  });
});
