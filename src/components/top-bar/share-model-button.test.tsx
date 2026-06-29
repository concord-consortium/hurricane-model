import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";

import * as logModule from "../../log";
import { createStores } from "../../models/stores";
import { ShareModelButton } from "./share-model-button";
import { StoresContext } from "../../stores-context";
import * as cloudStorage from "../../utils/cloud-storage";

jest.spyOn(logModule, "log").mockImplementation(() => undefined);

const renderButton = () => {
  const stores = createStores();
  return render(
    <StoresContext value={stores}>
      <ShareModelButton />
    </StoresContext>
  );
};

describe("ShareModelButton", () => {
  beforeEach(() => jest.clearAllMocks());

  it("saves the model and shows the id and link in a dialog", async () => {
    const modelId = "abc123";
    jest.spyOn(cloudStorage, "saveModelToCloud").mockResolvedValue(modelId);
    const user = userEvent.setup();
    renderButton();

    await user.click(screen.getByTestId("share-model-button"));

    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    expect(screen.getByDisplayValue("abc123")).toBeInTheDocument();
    expect(screen.getByDisplayValue(new RegExp(`modelId=${modelId}`))).toBeInTheDocument();
    expect(logModule.log).toHaveBeenCalledWith("ModelShared", expect.objectContaining({ modelId }));
  });

  it("shows the actual error message when saving fails", async () => {
    jest.spyOn(cloudStorage, "saveModelToCloud").mockRejectedValue(new Error("S3 upload failed"));
    const user = userEvent.setup();
    renderButton();

    await user.click(screen.getByTestId("share-model-button"));

    // The specific failure reason is surfaced, not a generic message.
    await waitFor(() => expect(screen.getByText(/S3 upload failed/)).toBeInTheDocument());
    // Button is usable again after failure
    expect(screen.getByTestId("share-model-button")).not.toBeDisabled();
  });

  it("disables the button while saving is in flight", async () => {
    // Defer the save so we can observe the in-flight state (the only double-submit guard).
    let resolveSave: (id: string) => void = () => undefined;
    jest.spyOn(cloudStorage, "saveModelToCloud")
      .mockReturnValue(new Promise<string>((resolve) => { resolveSave = resolve; }));
    const user = userEvent.setup();
    renderButton();

    await user.click(screen.getByTestId("share-model-button"));
    expect(screen.getByTestId("share-model-button")).toBeDisabled();

    resolveSave("abc123");
    await waitFor(() => expect(screen.getByTestId("share-model-button")).not.toBeDisabled());
  });

  it("resets state and closes the dialog when closed", async () => {
    jest.spyOn(cloudStorage, "saveModelToCloud").mockResolvedValue("abc123");
    const user = userEvent.setup();
    renderButton();

    await user.click(screen.getByTestId("share-model-button"));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());

    await user.click(screen.getByLabelText("Close"));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
