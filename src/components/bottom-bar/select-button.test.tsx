import * as React from "react";
import { render, screen } from "@testing-library/react";
import { SelectButton } from "./select-button";

describe("SelectButton component", () => {
  it("renders basic components", () => {
    render(
      <SelectButton
        label="Test"
        value="test"
        onChange={jest.fn()}
        menuItems={[{ value: "test", label: "Test", testId: "test-menu-item" }]}
      />
    );
    expect(screen.getByTestId("test-container")).toBeInTheDocument();
    expect(screen.getByTestId("test-button")).toBeInTheDocument();
  });

  it("disables the button when disabled prop is true", () => {
    render(
      <SelectButton
        label="Test"
        value="test"
        onChange={jest.fn()}
        menuItems={[{ value: "test", label: "Test", testId: "test-menu-item" }]}
        disabled={true}
      />
    );
    const testContainer = screen.getByTestId("test-container");
    expect(testContainer).toHaveClass("disabled");
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-disabled", "true");
    expect(testContainer.querySelector("input")).toBeDisabled();
  });
});
