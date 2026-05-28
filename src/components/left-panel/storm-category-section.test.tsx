import * as React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";

import { hurricaneCategoryInfo } from "../../models/constants";
import { createStores, IStores } from "../../models/stores";
import { StoresContext } from "../../stores-context";
import { StormCategorySection } from "./storm-category-section";

const renderSection = (stores: IStores) =>
  render(
    <StoresContext value={stores}>
      <StormCategorySection />
    </StoresContext>
  );

const openSection = () => {
  fireEvent.click(screen.getByTestId("storm-category-button"));
};

describe("StormCategorySection", () => {
  let stores: IStores;

  beforeEach(() => {
    stores = createStores();
    stores.simulation.hurricane.setStartingCategory(0);
  });

  it("displays the current category name", () => {
    renderSection(stores);
    openSection();
    expect(screen.getByTestId("storm-category-name")).toHaveTextContent(
      hurricaneCategoryInfo[0].name
    );
  });

  it("updates the displayed name when startingCategory changes on the model", () => {
    renderSection(stores);
    openSection();
    expect(screen.getByTestId("storm-category-name")).toHaveTextContent(
      hurricaneCategoryInfo[0].name
    );

    act(() => {
      stores.simulation.hurricane.setStartingCategory(3);
    });

    expect(screen.getByTestId("storm-category-name")).toHaveTextContent(
      hurricaneCategoryInfo[3].name
    );
  });

  it("syncs the slider's underlying value with the model", () => {
    renderSection(stores);
    openSection();
    const slider = screen.getByTestId("storm-category-slider").querySelector("input");
    expect(slider).not.toBeNull();
    expect(slider!.value).toEqual("0");

    act(() => {
      stores.simulation.hurricane.setStartingCategory(4);
    });

    expect(slider!.value).toEqual("4");
  });

  it("calls setStartingCategory on the hurricane when the slider input fires a change", () => {
    renderSection(stores);
    openSection();
    const slider = screen.getByTestId("storm-category-slider").querySelector("input");
    expect(slider).not.toBeNull();

    fireEvent.change(slider!, { target: { value: "2" } });

    expect(stores.simulation.hurricane.startingCategory).toEqual(2);
    // setStartingCategory should also push the strength to the matching startingWindSpeed.
    expect(stores.simulation.hurricane.strength).toEqual(
      hurricaneCategoryInfo[2].startingWindSpeed
    );
  });
});
