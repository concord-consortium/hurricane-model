import * as React from "react";
import { shallow } from "enzyme";
import { HurricaneScale } from "./hurricane-scale";

describe("HurricaneScale component", () => {
  it("renders basic components", () => {
    const wrapper = shallow(
      <HurricaneScale />
    );
    expect(wrapper.text()).toEqual(expect.stringContaining("Hurricane Scale"));
    expect(wrapper.text()).toEqual(expect.stringContaining("Category"));
    expect(wrapper.text()).toEqual(expect.stringContaining("Wind Speed"));
  });
});
