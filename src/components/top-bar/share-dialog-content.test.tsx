import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { StoresContext } from "../../stores-context";
import { createStores } from "../../models/stores";
import { ShareDialogContent } from "./share-dialog-content";
import * as cloudStorage from "../../utils/cloud-storage";
import * as logModule from "../../log";

jest.spyOn(logModule, "log").mockImplementation(() => undefined);

const renderDialog = () =>
  render(
    <StoresContext value={createStores()}>
      <ShareDialogContent />
    </StoresContext>
  );

describe("ShareDialogContent", () => {
  beforeEach(() => jest.clearAllMocks());

  it("shows 'Saving model...' while the upload is in flight", async () => {
    let resolveSave: (id: string) => void = () => undefined;
    jest.spyOn(cloudStorage, "saveModelToCloud")
      .mockReturnValue(new Promise<string>((resolve) => { resolveSave = resolve; }));
    renderDialog();
    expect(screen.getByTestId("share-model-saving")).toBeInTheDocument();
    resolveSave("abc123");
    await waitFor(() => expect(screen.queryByTestId("share-model-saving")).not.toBeInTheDocument());
  });

  it("shows the labeled modelId link after a successful upload and logs ModelShared", async () => {
    jest.spyOn(cloudStorage, "saveModelToCloud").mockResolvedValue("abc123");
    renderDialog();
    await waitFor(() => expect(screen.getByTestId("share-model-url")).toBeInTheDocument());
    expect(screen.getByDisplayValue(/modelId=abc123/)).toBeInTheDocument();
    expect(screen.getByText(/To share this exact model state in email or IM, copy this link:/)).toBeInTheDocument();
    expect(logModule.log).toHaveBeenCalledWith("ModelShared", expect.objectContaining({ modelId: "abc123" }));
  });

  it("shows the actual error message when the upload fails", async () => {
    jest.spyOn(cloudStorage, "saveModelToCloud").mockRejectedValue(new Error("S3 upload failed"));
    renderDialog();
    await waitFor(() => expect(screen.getByText(/S3 upload failed/)).toBeInTheDocument());
  });

  it("still renders the page URL and iframe embed fields", async () => {
    jest.spyOn(cloudStorage, "saveModelToCloud").mockResolvedValue("abc123");
    const { container } = renderDialog();
    expect(container.querySelector("#page-url")).toBeInTheDocument();
    expect(container.querySelector("#iframe-string")).toBeInTheDocument();
    // Await the async save so its state update doesn't leak past the test (act warning).
    await waitFor(() => expect(screen.getByTestId("share-model-url")).toBeInTheDocument());
  });
});
