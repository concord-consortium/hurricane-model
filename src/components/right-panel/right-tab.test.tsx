import * as React from "react";
import { render, screen } from "@testing-library/react";
import { createStores } from "../../models/stores";
import { Provider } from "mobx-react";
import { RightTab } from "./right-tab";

describe("MapTab component", () => {
  let stores = createStores();
  beforeEach(() => {
    stores = createStores();
  });

  it("renders basic components", () => {
    render(
      <Provider stores={stores}>
        <RightTab tabType="base" active={true} />
      </Provider>
    );
    expect(screen.getByTestId("map-tab")).toBeInTheDocument();
  });

  it("renders a text-only settings tab", () => {
    render(
      <Provider stores={stores}>
        <RightTab tabType="settings" active={true} />
      </Provider>
    );
    expect(screen.getByText("Settings")).toBeInTheDocument();
    // no map image for the settings tab
    expect(document.querySelector("[class*='mapTabImage']")).not.toBeInTheDocument();
  });
});
