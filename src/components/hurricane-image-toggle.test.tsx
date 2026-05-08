import * as React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createStores } from "../models/stores";
import { Provider } from "mobx-react";
import { HurricaneImageToggle } from "./hurricane-image-toggle";

describe("HurricaneImageToggle component", () => {
  let stores = createStores();
  beforeEach(() => {
    stores = createStores();
  });

  it("renders basic components", () => {
    render(
      <Provider stores={stores}>
        <HurricaneImageToggle />
      </Provider>
    );
    expect(screen.getByRole("checkbox")).toBeInTheDocument();
    expect(screen.getByText(/Hurricane Image/)).toBeInTheDocument();
  });

  it("turns on or off the hurricane image", () => {
    render(
      <Provider stores={stores}>
        <HurricaneImageToggle />
      </Provider>
    );
    const toggle = screen.getByRole("checkbox");
    expect(stores.ui.hurricaneImage).toEqual(false);
    userEvent.click(toggle);
    expect(stores.ui.hurricaneImage).toEqual(true);
    userEvent.click(toggle);
    expect(stores.ui.hurricaneImage).toEqual(false);
  });
});
