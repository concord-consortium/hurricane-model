import * as React from "react";
import { render } from "@testing-library/react";
import { Dialog } from "./dialog";

// MUI reports only "backdropClick" and "escapeKeyDown" today, so a reason it might add
// later cannot be produced by clicking or typing. Capture the handler Dialog hands to
// MUI and call it directly to pin down what an unrecognized reason does.
let mockMuiOnClose: ((event: object, reason: string) => void) | undefined;

jest.mock("@mui/material/Dialog", () => ({
  __esModule: true,
  default: (props: any) => {
    mockMuiOnClose = props.onClose;
    return null;
  }
}));

describe("Dialog close policy", () => {
  beforeEach(() => {
    mockMuiOnClose = undefined;
  });

  it("ignores a close reason it does not recognize", () => {
    const onClose = jest.fn();
    render(<Dialog open={true} onClose={onClose} title="Test Dialog" />);
    expect(mockMuiOnClose).toBeDefined();
    mockMuiOnClose!({}, "someReasonMuiAddsLater");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes for the escape reason", () => {
    const onClose = jest.fn();
    render(<Dialog open={true} onClose={onClose} title="Test Dialog" />);
    expect(mockMuiOnClose).toBeDefined();
    mockMuiOnClose!({}, "escapeKeyDown");
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
