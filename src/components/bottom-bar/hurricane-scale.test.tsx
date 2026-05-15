import * as React from "react";
import { render, screen } from "@testing-library/react";
import { HurricaneScale } from "./hurricane-scale";

describe("HurricaneScale component", () => {
  it("renders basic components", () => {
    render(<HurricaneScale />);
    expect(screen.getByText(/Hurricane Scale/)).toBeInTheDocument();
    expect(screen.getByText(/Category/)).toBeInTheDocument();
    expect(screen.getByText(/Wind Speed/)).toBeInTheDocument();
  });
});
