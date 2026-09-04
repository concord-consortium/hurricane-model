import * as React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createStores } from "../../models/stores";
import { StoresContext } from "../../stores-context";
import { WindArrowsToggle } from "./wind-arrows-toggle";

describe("WindArrowsToggle component", () => {
  let stores = createStores();
  beforeEach(() => {
    stores = createStores();
  });

  it("renders basic components", () => {
    render(
      <StoresContext value={stores}>
        <WindArrowsToggle />
      </StoresContext>
    );
    expect(screen.getByRole("switch")).toBeInTheDocument();
    expect(screen.getByText(/Wind Direction and Speed/)).toBeInTheDocument();
  });

  it("turns on or off the wind arrows", async () => {
    const user = userEvent.setup();
    render(
      <StoresContext value={stores}>
        <WindArrowsToggle />
      </StoresContext>
    );
    const toggle = screen.getByRole("switch");
    const initial = stores.ui.windArrows;
    await user.click(toggle);
    expect(stores.ui.windArrows).toEqual(!initial);
    await user.click(toggle);
    expect(stores.ui.windArrows).toEqual(initial);
  });
});
