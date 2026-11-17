import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";

import config from "../../config";
import { createStores } from "../../models/stores";
import { StoresContext } from "../../stores-context";
import * as cloudStorage from "../../utils/cloud-storage";
import * as logModule from "../../log";
import { AboutDialogContent } from "../top-bar/about-dialog-content";
import { ShareDialogContent } from "../top-bar/share-dialog-content";

jest.spyOn(logModule, "log").mockImplementation(() => undefined);

const webLinks = [
  ["MIT License", "https://github.com/concord-consortium/hurricane-model/blob/master/LICENSE"],
  ["Terms of Use", "https://concord.org/terms-of-use/"],
  ["concord.org/licensing", "https://concord.org/licensing"]
];

const renderAbout = async () => {
  render(<AboutDialogContent />);
};

const renderShare = async () => {
  jest.spyOn(cloudStorage, "saveModelToCloud").mockResolvedValue("abc123");
  render(
    <StoresContext value={createStores()}>
      <ShareDialogContent />
    </StoresContext>
  );
  // Let the upload settle so its state update doesn't leak past the test.
  await waitFor(() => expect(screen.getByTestId("share-model-url")).toBeInTheDocument());
};

describe.each([
  ["About", renderAbout],
  ["Share", renderShare]
])("license copy in the %s dialog", (_name, renderContent) => {
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date("2031-03-04T12:00:00Z"), advanceTimers: true });
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it("links the MIT License, Terms of Use and licensing page in a new tab", async () => {
    await renderContent();
    const copy = within(screen.getByTestId("license-copy"));
    expect(copy.getAllByRole("link")).toHaveLength(4);
    for (const [text, href] of webLinks) {
      const link = copy.getByRole("link", { name: `${text} (opens in a new tab)` });
      expect(link).toHaveAttribute("href", href);
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
  });

  it("links the licensing email in the same tab", async () => {
    await renderContent();
    const mail = within(screen.getByTestId("license-copy")).getByRole("link", { name: "licensing@concord.org" });
    expect(mail).toHaveAttribute("href", "mailto:licensing@concord.org");
    expect(mail).not.toHaveAttribute("target");
    expect(mail).not.toHaveAttribute("rel");
  });

  it("shows the approved copy and the current year", async () => {
    await renderContent();
    const copy = screen.getByTestId("license-copy");
    const paragraphs = [...copy.querySelectorAll("p")].map(p => p.textContent?.replace(/\s+/g, " ").trim());
    expect(paragraphs).toEqual([
      "Hurricane Explorer is free, open-source software. The Hurricane Explorer source code is released under " +
      "the MIT License (opens in a new tab), so you’re welcome to use, modify, and build on it.",
      "Your use of Hurricane Explorer at hurricane.concord.org is governed by our Terms of Use (opens in a new " +
      "tab). The hosted version is free for non-commercial use; commercial use requires a separate written " +
      "agreement. For more information, visit concord.org/licensing (opens in a new tab) or contact " +
      "licensing@concord.org.",
      "© 2031 The Concord Consortium, Inc."
    ]);
    expect([...copy.querySelectorAll("strong")].map(s => s.textContent)).toEqual([
      "Hurricane Explorer is free, open-source software.",
      "Your use of Hurricane Explorer at hurricane.concord.org"
    ]);
  });

  it("computes the copyright year when it renders", async () => {
    jest.setSystemTime(new Date("2047-11-20T12:00:00Z"));
    await renderContent();
    expect(screen.getByTestId("license-copy")).toHaveTextContent("© 2047 The Concord Consortium, Inc.");
  });

  it("names Hurricane Explorer in storm mode too", async () => {
    const originalMode = config.mode;
    config.mode = "storm";
    try {
      await renderContent();
      const copy = screen.getByTestId("license-copy");
      expect(copy).toHaveTextContent("Hurricane Explorer is free, open-source software. The Hurricane Explorer source");
      expect(copy).toHaveTextContent("Your use of Hurricane Explorer at hurricane.concord.org");
    } finally {
      config.mode = originalMode;
    }
  });

  it("is the last block in the dialog", async () => {
    await renderContent();
    expect(screen.getByTestId("license-copy").nextElementSibling).toBeNull();
  });

  it("drops the old Creative Commons copyright block", async () => {
    await renderContent();
    expect(document.body).not.toHaveTextContent(/Creative Commons|CC BY|All rights reserved/);
  });
});
