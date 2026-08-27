import * as React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LabeledSwitch } from "./labeled-switch";

describe("LabeledSwitch component", () => {
  it("renders title, side labels, and bolds the active side", () => {
    const { rerender } = render(
      <LabeledSwitch
        title="Wind Direction and Speed" offLabel="Hide" onLabel="Show"
        checked={false} dataTest="wind-arrows-setting" onChange={() => undefined}
      />
    );
    expect(screen.getByText("Wind Direction and Speed")).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Wind Direction and Speed" })).toBeInTheDocument();
    expect(screen.getByText("Hide")).toHaveClass("active");
    expect(screen.getByText("Show")).not.toHaveClass("active");
    rerender(
      <LabeledSwitch
        title="Wind Direction and Speed" offLabel="Hide" onLabel="Show"
        checked={true} dataTest="wind-arrows-setting" onChange={() => undefined}
      />
    );
    expect(screen.getByText("Hide")).not.toHaveClass("active");
    expect(screen.getByText("Show")).toHaveClass("active");
  });

  it("calls onChange with the new value when toggled", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(
      <LabeledSwitch
        title="Hurricane Image" offLabel="Icon" onLabel="Image"
        checked={false} dataTest="hurricane-image-setting" onChange={onChange}
      />
    );
    await user.click(screen.getByRole("switch", { name: "Hurricane Image" }));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
