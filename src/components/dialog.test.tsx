import * as React from "react";
import { mount } from "enzyme";
import {Dialog} from "./dialog";
import MuiDialog from "@material-ui/core/Dialog";

describe("Dialog component", () => {
  it("renders Material UI Dialog component", () => {
    const wrapper = mount(
      <Dialog open={true} onClose={jest.fn()} />
    );
    expect(wrapper.find(MuiDialog).length).toBe(1);
  });
});
