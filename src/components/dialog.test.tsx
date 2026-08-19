import * as React from "react";
import { render, screen } from "@testing-library/react";
import { Dialog } from "./dialog";

describe("Dialog component", () => {
  it("renders Material UI Dialog component", () => {
    render(<Dialog open={true} onClose={jest.fn()} title="Test Dialog" />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    // The title element is what labels the dialog.
    expect(dialog).toHaveAccessibleName("Test Dialog");
  });

  it("renders without a title and omits aria-labelledby", () => {
    render(<Dialog open={true} onClose={jest.fn()}><p>Body text</p></Dialog>);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).not.toHaveAttribute("aria-labelledby");
    expect(screen.getByText("Body text")).toBeInTheDocument();
  });
});
