import * as React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

  it("does not close when the backdrop is clicked", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    const { baseElement } = render(
      <Dialog open={true} onClose={onClose} title="Test Dialog" />
    );
    // MUI renders the backdrop in a portal, outside the container the render
    // helper returns, so query from baseElement rather than container.
    const backdrop = baseElement.querySelector(".MuiBackdrop-root");
    expect(backdrop).toBeInTheDocument();
    await user.click(backdrop!);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes when escape is pressed", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    render(<Dialog open={true} onClose={onClose} title="Test Dialog" />);
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });

  it("closes when the close button is clicked", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    render(<Dialog open={true} onClose={onClose} title="Test Dialog" />);
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalled();
  });
});
