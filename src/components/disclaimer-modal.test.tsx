import * as React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { backdropClasses } from "@mui/material/Backdrop";

import config from "../config";
import * as logModule from "../log";
import { createStores, IStores } from "../models/stores";
import { StoresContext } from "../stores-context";
import { DisclaimerModal } from "./disclaimer-modal";

const logSpy = jest.spyOn(logModule, "log").mockImplementation(() => undefined);

const MESSAGE = "This is a simulation and cannot be used to make a forecast.";

describe("DisclaimerModal component", () => {
  let stores: IStores;
  let oldMode: string;
  let oldSkipDisclaimer: boolean;

  beforeEach(() => {
    stores = createStores();
    oldMode = config.mode;
    oldSkipDisclaimer = config.skipDisclaimer;
    config.mode = "storm";
    config.skipDisclaimer = false;
    logSpy.mockClear();
  });

  afterEach(() => {
    config.mode = oldMode;
    config.skipDisclaimer = oldSkipDisclaimer;
  });

  const renderModal = () => render(
    <StoresContext value={stores}>
      <DisclaimerModal />
    </StoresContext>
  );

  it("shows the disclaimer in storm mode", () => {
    renderModal();
    expect(screen.getByText(MESSAGE)).toBeInTheDocument();
  });

  it("names the dialog so it is not announced as an unnamed dialog", () => {
    renderModal();
    expect(screen.getByRole("dialog")).toHaveAccessibleName("Disclaimer");
  });

  it("describes the dialog with the disclaimer message", () => {
    renderModal();
    expect(screen.getByRole("dialog")).toHaveAccessibleDescription(MESSAGE);
  });

  it("does not show when skipDisclaimer is set", () => {
    config.skipDisclaimer = true;
    renderModal();
    expect(screen.queryByText(MESSAGE)).not.toBeInTheDocument();
  });

  it("does not show in hurricane mode", () => {
    config.mode = "hurricane";
    renderModal();
    expect(screen.queryByText(MESSAGE)).not.toBeInTheDocument();
  });

  it("does not show in report mode", () => {
    stores.ui.setMode("report");
    renderModal();
    expect(screen.queryByText(MESSAGE)).not.toBeInTheDocument();
  });

  // LARA reports the mode after the first render, so a late report mode still has to hide it.
  it("hides when report mode arrives after the first render", async () => {
    renderModal();
    expect(screen.getByText(MESSAGE)).toBeInTheDocument();
    act(() => stores.ui.setMode("report"));
    await waitFor(() => expect(screen.queryByText(MESSAGE)).not.toBeInTheDocument());
  });

  it("closes and logs when Got it is clicked", async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(screen.getByRole("button", { name: "Got it" }));
    // The dialog stays mounted through its closing transition, so wait it out.
    await waitFor(() => expect(screen.queryByText(MESSAGE)).not.toBeInTheDocument());
    expect(logSpy).toHaveBeenCalledWith("DisclaimerDismissed", { source: "gotIt" });
    expect(logSpy).toHaveBeenCalledTimes(1);
  });

  it("closes and logs when the close button is clicked", async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByText(MESSAGE)).not.toBeInTheDocument());
    expect(logSpy).toHaveBeenCalledWith("DisclaimerDismissed", { source: "close" });
    expect(logSpy).toHaveBeenCalledTimes(1);
  });

  it("focuses the Got it button when it opens", async () => {
    renderModal();
    await waitFor(() => expect(screen.getByRole("button", { name: "Got it" })).toHaveFocus());
  });

  it("stays open when the backdrop is clicked", async () => {
    const user = userEvent.setup();
    const { baseElement } = renderModal();
    await user.click(baseElement.querySelector(`.${backdropClasses.root}`)!);
    expect(screen.getByText(MESSAGE)).toBeInTheDocument();
    expect(logSpy).not.toHaveBeenCalled();
  });
});
