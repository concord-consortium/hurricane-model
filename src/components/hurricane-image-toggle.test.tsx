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

  it("turns on or off the hurricane image", async () => {
    const user = userEvent.setup();
    render(
      <Provider stores={stores}>
        <HurricaneImageToggle />
      </Provider>
    );
    const toggle = screen.getByRole("checkbox");
    expect(stores.ui.hurricaneImage).toEqual(false);
    await user.click(toggle);
    expect(stores.ui.hurricaneImage).toEqual(true);
    await user.click(toggle);
    expect(stores.ui.hurricaneImage).toEqual(false);
  });
});
