import * as React from "react";
import { render, screen } from "@testing-library/react";
import { createStores } from "../models/stores";
import { Provider } from "mobx-react";
import { Map } from "react-leaflet";
import { HurricaneMarker, HurricaneIcon } from "./hurricane-marker";

describe("HurricaneMarker component", () => {
  let stores = createStores();
  beforeEach(() => {
    stores = createStores();
  });

  it("renders without crashing", () => {
    render(
      <Provider stores={stores}>
        <Map center={[0, 0]} zoom={10}>
          <HurricaneMarker/>
        </Map>
      </Provider>
    );
  });
});

describe("HurricaneIcon component", () => {
  let stores = createStores();
  beforeEach(() => {
    stores = createStores();
  });

  it("renders hurricane category", () => {
    const { rerender } = render(
      <Provider stores={stores}>
        <Map center={[0, 0]} zoom={10}>
          <HurricaneIcon />
        </Map>
      </Provider>
    );
    expect(screen.getByTestId("hurricane-category")).toBeInTheDocument();

    stores.simulation.hurricane.strength = 20;
    rerender(
      <Provider stores={stores}>
        <Map center={[0, 0]} zoom={10}>
          <HurricaneIcon />
        </Map>
      </Provider>
    );
    expect(screen.getByTestId("hurricane-category")).toHaveAttribute("data-value", "0"); // tropical storm

    stores.simulation.hurricane.strength = 54;
    rerender(
      <Provider stores={stores}>
        <Map center={[0, 0]} zoom={10}>
          <HurricaneIcon />
        </Map>
      </Provider>
    );
    expect(screen.getByTestId("hurricane-category"))
      .toHaveAttribute("data-value", String(stores.simulation.hurricane.category));

    stores.simulation.hurricane.strength = 100;
    rerender(
      <Provider stores={stores}>
        <Map center={[0, 0]} zoom={10}>
          <HurricaneIcon />
        </Map>
      </Provider>
    );
    expect(screen.getByTestId("hurricane-category")).toHaveAttribute("data-value", "5");
  });
});
