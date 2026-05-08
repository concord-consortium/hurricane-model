import * as React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createStores } from "../models/stores";
import { Provider } from "mobx-react";
import { WindArrowsToggle } from "./wind-arrows-toggle";

describe("WindArrowsToggle component", () => {
  let stores = createStores();
  beforeEach(() => {
    stores = createStores();
  });

  it("renders basic components", () => {
    render(
      <Provider stores={stores}>
        <WindArrowsToggle />
      </Provider>
    );
    expect(screen.getByRole("checkbox")).toBeInTheDocument();
    expect(screen.getByText(/Wind Direction and Speed/)).toBeInTheDocument();
  });

  it("turns on or off the wind arrows", () => {
    render(
      <Provider stores={stores}>
        <WindArrowsToggle />
      </Provider>
    );
    const toggle = screen.getByRole("checkbox");
    const initial = stores.ui.windArrows;
    userEvent.click(toggle);
    expect(stores.ui.windArrows).toEqual(!initial);
    userEvent.click(toggle);
    expect(stores.ui.windArrows).toEqual(initial);
  });
});
