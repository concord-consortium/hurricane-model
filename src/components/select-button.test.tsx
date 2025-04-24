import * as React from "react";
import { mount } from "enzyme";
import { SelectButton } from "./select-button";
import Select from "@material-ui/core/Select";
import MenuItem from "@material-ui/core/MenuItem";

describe("SelectButton component", () => {
  it("renders basic components", () => {
    const wrapper = mount(
      <SelectButton
        label="Test"
        value="test"
        onChange={jest.fn()}
        menuItems={[{ value: "test", label: "Test", testId: "test-menu-item" }]}
      />
    );
    expect(wrapper.find(Select).length).toEqual(1);
    expect(wrapper.find('div[data-test="test-container"]')).toHaveLength(1);
    expect(wrapper.find('div[data-test="test-button"]')).toHaveLength(1);
  });

  it("disables the button when disabled prop is true", () => {
    const wrapper = mount(
      <SelectButton
        label="Test"
        value="test"
        onChange={jest.fn()}
        menuItems={[{ value: "test", label: "Test", testId: "test-menu-item" }]}
        disabled={true}
      />
    );
    const select = wrapper.find(Select);
    expect(select.prop("disabled")).toEqual(true);
  });
});
