import * as React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createStores } from "../../models/stores";
import { StoresContext } from "../../stores-context";
import { HurricaneImageToggle } from "./hurricane-image-toggle";

describe("HurricaneImageToggle component", () => {
  let stores = createStores();
  beforeEach(() => {
    stores = createStores();
  });

  it("renders basic components", () => {
    render(
      <StoresContext value={stores}>
        <HurricaneImageToggle />
      </StoresContext>
    );
    expect(screen.getByRole("switch")).toBeInTheDocument();
    expect(screen.getByText(/Hurricane Image/)).toBeInTheDocument();
  });

  it("turns on or off the hurricane image", async () => {
    const user = userEvent.setup();
    render(
      <StoresContext value={stores}>
        <HurricaneImageToggle />
      </StoresContext>
    );
    const toggle = screen.getByRole("switch");
    expect(stores.ui.hurricaneImage).toEqual(false);
    await user.click(toggle);
    expect(stores.ui.hurricaneImage).toEqual(true);
    await user.click(toggle);
    expect(stores.ui.hurricaneImage).toEqual(false);
  });
});
