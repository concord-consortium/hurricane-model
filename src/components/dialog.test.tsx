import * as React from "react";
import { render, screen } from "@testing-library/react";
import { Dialog } from "./dialog";

describe("Dialog component", () => {
  it("renders Material UI Dialog component", () => {
    render(<Dialog open={true} onClose={jest.fn()} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
