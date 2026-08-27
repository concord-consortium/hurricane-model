import * as React from "react";
import { render, screen } from "@testing-library/react";
import { createStores } from "../../models/stores";
import { Provider } from "mobx-react";
import { RightTab } from "./right-tab";

describe("RightTab component", () => {
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
    expect(screen.getByTestId("right-tab")).toBeInTheDocument();
  });
});
