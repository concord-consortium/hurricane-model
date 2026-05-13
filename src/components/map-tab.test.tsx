import * as React from "react";
import { render, screen } from "@testing-library/react";
import { createStores } from "../models/stores";
import { Provider } from "mobx-react";
import { MapTab } from "./map-tab";

describe("MapTab component", () => {
  let stores = createStores();
  beforeEach(() => {
    stores = createStores();
  });

  it("renders basic components", () => {
    render(
      <Provider stores={stores}>
        <MapTab tabType="base" active={true} />
      </Provider>
    );
    expect(screen.getByTestId("map-tab")).toBeInTheDocument();
  });
});
