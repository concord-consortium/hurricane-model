import * as React from "react";
import { Text } from "./text";
import { shallow } from "enzyme";

describe("Text component", () => {
  it("renders provided text", () => {
    const wrapper = shallow(<Text text="Hello World"/>);
    expect(wrapper.text()).toEqual("Hello World");
  });
});
