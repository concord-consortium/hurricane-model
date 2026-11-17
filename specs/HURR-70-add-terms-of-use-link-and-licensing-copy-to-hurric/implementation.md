# Implementation Plan: Terms of Use Link and Licensing Copy for Hurricane Explorer

**Jira**: https://concord-consortium.atlassian.net/browse/HURR-70
**Requirements Spec**: [requirements.md](requirements.md)
**Status**: **In Development**

## Implementation Plan

Two steps, each one commit, in this order. R9 and R10 need no code: nothing is added outside the two dialogs and the About control. R15 is Kiley's review of the branch deploy (see Verification). Neither step changes `package.json` or the lockfile. The code below was built and run on master in a throwaway checkout (full Jest suite, `npm run lint`, and `LINT_BUILD=1` ESLint over the touched files) and then removed; see [Verification](#verification).

New code lives in a new folder, `src/components/license/`: the copy is shared by two dialogs, and `ExternalLink` is a general link component, so neither belongs to the top bar's own controls.

### Add the license copy to the About and Share dialogs

**Summary**: Adds the constants module, an `ExternalLink` component and the `LicenseCopy` component, renders `LicenseCopy` at the end of both dialogs in place of `<Copyright />`, and deletes `copyright.tsx`. Covers R1 to R8, R13 and R14's copy tests. One commit: the copy, its links and the removal of the old block are one user-visible change.

**Files affected**:
- `src/components/license/license-constants.ts` (new): the four link targets, named as in CODAP's `about-dialog-constants.ts`.
- `src/components/license/external-link.tsx`, `external-link.scss` (new): new-tab link with the visually hidden hint.
- `src/components/license/license-copy.tsx`, `license-copy.scss` (new): the copy.
- `src/components/license/license-copy.test.tsx` (new): tests run against both dialogs' content.
- `src/components/top-bar/about-dialog-content.tsx`: `<Copyright />` becomes `<LicenseCopy />`.
- `src/components/top-bar/share-dialog-content.tsx`: same.
- `src/components/top-bar/copyright.tsx`: deleted (no other importer).

**Estimated diff size**: ~205 lines

`src/components/license/license-constants.ts`:

```ts
export const kMitLicenseUrl = "https://github.com/concord-consortium/hurricane-model/blob/master/LICENSE";
export const kTermsOfUseUrl = "https://concord.org/terms-of-use/";
export const kLicensingUrl = "https://concord.org/licensing";
export const kLicensingEmail = "licensing@concord.org";
```

`src/components/license/external-link.tsx`:

```tsx
import React, { AnchorHTMLAttributes, ReactNode } from "react";

import css from "./external-link.scss";

interface IProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "target" | "rel"> {
  href: string;
  children: ReactNode;
}

// A link that opens in a new tab and tells screen-reader users that it does.
export const ExternalLink = ({ href, children, ...others }: IProps) => (
  <a {...others} href={href} target="_blank" rel="noopener noreferrer">
    {children}
    <span className={css.visuallyHidden}> (opens in a new tab)</span>
  </a>
);
```

`src/components/license/external-link.scss` (the repo has no visually hidden utility yet):

```scss
.visuallyHidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

`src/components/license/license-copy.tsx`. The JSX line breaks put a space wherever the copy has one; the copy test asserts the rendered text word for word, so a misplaced break fails it.

```tsx
import React from "react";

import { ExternalLink } from "./external-link";
import { kLicensingEmail, kLicensingUrl, kMitLicenseUrl, kTermsOfUseUrl } from "./license-constants";

import css from "./license-copy.scss";

// Product and host are fixed so the copy matches the other Geo apps in every mode.
export const LicenseCopy = () => (
  <div className={css.licenseCopy} data-test="license-copy">
    <p>
      <strong>Hurricane Explorer is free, open-source software.</strong> The Hurricane Explorer source code is
      released under the <ExternalLink href={kMitLicenseUrl}>MIT License</ExternalLink>, so you’re welcome to use,
      modify, and build on it.
    </p>
    <p>
      <strong>Your use of Hurricane Explorer at hurricane.concord.org</strong> is governed by
      our <ExternalLink href={kTermsOfUseUrl}>Terms of Use</ExternalLink>. The hosted version is free for
      non-commercial use; commercial use requires a separate written agreement. For more information,
      visit <ExternalLink href={kLicensingUrl}>concord.org/licensing</ExternalLink> or
      contact <a href={`mailto:${kLicensingEmail}`}>{kLicensingEmail}</a>.
    </p>
    <p className={css.copyright}>© {new Date().getFullYear()} The Concord Consortium, Inc.</p>
  </div>
);
```

`src/components/license/license-copy.scss`. The `0.8em` matches the old `Copyright` paragraph's inline style. Links inherit the browser's underline already; the rule keeps them underlined if a global link style changes.

```scss
.licenseCopy {
  a {
    text-decoration: underline;
  }
}

.copyright {
  font-size: 0.8em;
}
```

`about-dialog-content.tsx`:

```tsx
// before
import {Copyright} from "./copyright";
        <Copyright />
// after
import { LicenseCopy } from "../license/license-copy";
        <LicenseCopy />
```

`share-dialog-content.tsx` (drop the `./copyright` import; add the new one after the `cloud-storage` import):

```tsx
// before
import { Copyright } from "./copyright";
      <Copyright/>
// after
import { LicenseCopy } from "../license/license-copy";
      <LicenseCopy />
```

`src/components/license/license-copy.test.tsx`. It renders the real dialog contents rather than `LicenseCopy` alone, so dropping `<LicenseCopy />` from either dialog fails it. Hrefs and the year are literals (R14). The clock is pinned with `jest.useFakeTimers({ now, advanceTimers: true })`, which leaves Share's async upload and `waitFor` working. Two different pinned years are needed: with only one, a hardcoded year passes. The storm-mode case guards R3: every other case runs in hurricane mode, where `getAppName()` also returns "Hurricane Explorer".

```tsx
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
    expect(copy).toHaveTextContent(
      "Hurricane Explorer is free, open-source software. The Hurricane Explorer source code is released under " +
      "the MIT License (opens in a new tab), so you’re welcome to use, modify, and build on it."
    );
    expect(copy).toHaveTextContent(
      "Your use of Hurricane Explorer at hurricane.concord.org is governed by our Terms of Use (opens in a new " +
      "tab). The hosted version is free for non-commercial use; commercial use requires a separate written " +
      "agreement. For more information, visit concord.org/licensing (opens in a new tab) or contact " +
      "licensing@concord.org."
    );
    expect(copy).toHaveTextContent("© 2031 The Concord Consortium, Inc.");
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

  it("drops the old Creative Commons copyright block", async () => {
    await renderContent();
    expect(document.body).not.toHaveTextContent(/Creative Commons|CC BY|All rights reserved/);
  });
});
```

---

### Make About a keyboard-reachable button

**Summary**: Turns the About `<span onClick>` into a `<button type="button">` that looks the same and shows a focus outline. Covers R11, R12 and R14's keyboard test. Separate from the copy because it changes the top bar, not the dialogs, and stands on its own.

**Files affected**:
- `src/components/top-bar/top-bar.tsx`: About becomes a button.
- `src/components/common.scss`: the `:focus-visible` outline moves out of `dialogButton` into a `focusOutline` mixin that `dialogButton` includes.
- `src/components/top-bar/top-bar.scss`: button reset and `@include focusOutline`.
- `src/components/top-bar/top-bar.test.tsx`: keyboard and focus-return test.

**Estimated diff size**: ~40 lines

`top-bar.tsx`:

```tsx
// before
          <span data-test="about" className={css.textButton} onClick={this.handleAboutOpen}>About</span>
// after
          <button type="button" data-test="about" className={css.textButton} onClick={this.handleAboutOpen}>
            About
          </button>
```

`common.scss`: split the outline out of `dialogButton` so the dialog buttons and About share one definition. `dialogButton` keeps its hover and active backgrounds, which the text control must not get. The compiled CSS of the mixin's three users, `dialog.scss`, `disclaimer-content.scss` and `about-content.scss` (through `outlinedDialogButton`), is unchanged.

```scss
@mixin focusOutline {
  &:focus-visible {
    outline: 2px solid $charcoal;
    outline-offset: 2px;
  }
}

@mixin dialogButton {
  // ...existing &:hover and &:active rules...
  @include focusOutline;
}
```

`top-bar.scss`, inside `.topBar`: include the outline in `.textButton` and reset the button's own styles. `line-height: normal` matters: without it the button inherits the top bar's 13px line height and measured 13px tall against Share's 21px, so its focus outline hugged the glyphs; with it both measured 21px at the same position.

```scss
  .textButton {
    // ...existing rules...
    @include focusOutline;
  }

  button.textButton {
    padding: 0;
    border: none;
    background: none;
    font: inherit;
    line-height: normal;
    color: inherit;
  }
```

`top-bar.test.tsx`, in `describe("About button")` (and add `waitFor` to the testing-library import). About is the page's first Tab stop because Reload and Share are spans.

```tsx
    it("is a keyboard-reachable button that gets focus back when the dialog closes", async () => {
      const user = userEvent.setup();
      renderTopBar();
      const about = screen.getByRole("button", { name: "About" });
      await user.tab();
      expect(about).toHaveFocus();
      await user.keyboard("{Enter}");
      expect(screen.getByRole("dialog")).toHaveAccessibleName("About: Hurricane Explorer");
      await user.keyboard("{Escape}");
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(about).toHaveFocus();
    });
```

---

## Verification

**Throwaway build of both steps on master** (since removed):

- The new and changed tests pass: `src/components/license` and `src/components/top-bar`.
- Mutations that the tests catch: `rel="noopener"` alone; a hardcoded copyright year (caught only by the second pinned year); the copy built from `getAppName()` (caught only by the storm-mode case); a straight apostrophe in "you're"; dropping `<LicenseCopy />` from Share alone; `disableRestoreFocus` on the MUI dialog; About back to a `<span>` (no button role); the mailto link rendered through `ExternalLink`; `<Copyright />` left beside `<LicenseCopy />`.
- Full Jest suite: the only failure is `app.test.tsx` ("shows the actual error message when loading fails", `log is not a function` from `MapView.handleViewportChanged`). It fails the same way on master in full runs and passes when run alone, so it is not caused by this change.
- `tsc --noEmit`: clean. Production webpack build: succeeds.
- `npm run lint`: 0 errors; its 4 warnings are unused `eslint-disable` directives in files this change does not touch. `LINT_BUILD=1` ESLint over the touched files: clean. `npm run lint:unused` reports one existing error in `bottom-bar/select-button.tsx`, also on master.
- Browser (dev server, 1280 × 800): the About dialog shows the copy in R2's order with underlined links and the small copyright line; About and Share sit on the same baseline in the top bar; Tab reaches About first, Enter opens the dialog, Esc closes it, and focus returns to About. With `?topBarVisible=false` the app renders as on master (R9).

**For the implementer**: re-run the full Jest suite, `npm run lint:build` and the browser checks on the finished branch, and check the Share dialog by eye too (it was covered by tests, not screenshots).

**For Kiley's review (R15)**: the branch deploy at R15's URL, standalone and with `?mode=storm`.

## Open Questions

<!-- Implementation-focused questions only. Requirements questions go in requirements.md. -->

### RESOLVED: Judgment call: where does the shared code live?
**Options considered**:
- A) A new `src/components/license/` folder.
- B) `src/components/top-bar/`, beside the dialogs.

**Decision**: A. The copy is rendered by both dialogs and `ExternalLink` is a general link component; keeping them apart from the top bar's own controls keeps `top-bar/` about the bar.

### RESOLVED: Judgment call: test the copy through the dialogs or through `LicenseCopy` alone?
**Options considered**:
- A) Run one `describe.each` over the real About and Share contents.
- B) Test `LicenseCopy` alone, plus a smoke check that each dialog renders it.

**Decision**: A. R14 asks for each dialog to be covered, and A fails if either dialog drops the component, without a separate smoke test.

## Self-Review

- **Commit reviewer**: each step compiles and passes on its own, in either order. No dependency or lockfile changes.
- **Test writer**: every named test runs against the existing harnesses (`StoresContext` for Share, the `Provider` pair for `TopBar`), and each catches a named mutation (see Verification).
- **Accessibility**: the button reset was measured in the browser (see the `top-bar.scss` note); the links' names and new-tab hint were checked.
- **Operator**: no new config, log events or deploy changes; README and `LOGGED-EVENTS.md` need no edits.

### QA Engineer

#### RESOLVED: R3 (storm mode keeps "Hurricane Explorer") had no test
Every copy test ran in hurricane mode, where `getAppName()` also returns "Hurricane Explorer", so rewriting `LicenseCopy` to use `getAppName()` left all ten copy tests green. Added a storm-mode case to the `describe.each` (fails twice under that mutation, passes as planned) and added it to R14.

#### RESOLVED: Two tests had no mutation under Verification
The Test writer line says each test catches a named mutation, but Verification named none for the mailto test or the old-text test. Built with the plan's code: rendering the mailto link through `ExternalLink` fails four tests, and leaving `<Copyright />` beside `<LicenseCopy />` fails the old-text case in both dialogs. Both are now in Verification's list.

Checked and held: the plan compiles and lints clean as written; the mutations listed under Verification each fail a test; the new-tab hint, link names and constants match CODAP's `ExternalLink` and `about-dialog-constants.ts`; the Share dialog shows the copy with all four links underlined and the copyright line at 0.8em; nothing in `cypress/`, the README or `LOGGED-EVENTS.md` refers to the old copyright block or the About span.

### Engineer porting the plan to the other Geo apps

#### RESOLVED: geo-common's Tests paragraph describes the tests R14 rules out
geo-common.md's "Tests" paragraph asks each app to assert "the copyright line built from the current year", which is the year test that passes by construction (R14 pins the clock and asserts a literal). It also omits the literal-URL hrefs, the new-tab hint in the link names, and the product-name case for an app with a mode switch. An engineer porting from geo-common alone would write tests this spec rejects. geo-common.md's Tests paragraph now matches R14 (real dialog content, literal URLs, accessible names with the hint, word-for-word copy, two pinned years, the storm-mode name for Hurricane) and points at this plan's `license-copy.test.tsx` as a worked example.

### Screen-reader user, and a student or teacher in Activity Player

Checked and held, with the plan's code built on this branch as throwaway code: the three web links' accessible names are their text plus " (opens in a new tab)" and the mailto link's is its text alone; at a 1000 × 500 viewport (a short Activity Player iframe) the About dialog's paper scrolls (`overflow-y: auto`, 573px of content in 436px), opening it moves focus to the paper, and every copy link is reached by Tab. Activity Player's interactive iframe (`iframe-runtime.tsx`) sets `allow` but no `sandbox`, so `target="_blank"` opens a tab from inside it. The constants and copy match CODAP's `about-dialog-constants.ts` and `V3.AboutDialog.license.*` apart from the product, host and MIT URL; the repo's default branch is `master` and `LICENSE` is MIT. The plan's tests pass on this branch.

### Requirements traceability

#### RESOLVED: R9, R10 and R15 traced to no step
The step summaries cover R1 to R8 and R11 to R14, and nothing said where R9, R10 or R15 are met. The plan's opening now says R9 and R10 need no code and R15 is the review under Verification, which already checks R9 in the browser. Checked and held: building both steps on this branch as throwaway code, the touched suites pass (21 tests) and `tsc --noEmit` is clean; step one's code is about 200 lines, within its estimate.

### Code reviewer reading the PR diff

#### RESOLVED: The About focus outline copied the `dialogButton` mixin's values
The plan pasted `outline: 2px solid $charcoal; outline-offset: 2px` into `.textButton` beside the identical block in `common.scss`'s `dialogButton`, so the two focus styles could drift apart. A `focusOutline` mixin now holds the outline; `dialogButton` and `.textButton` both include it. Built with the plan's code: compiled `dialog.scss` and `disclaimer-content.scss` CSS is byte-identical, the top bar's compiled CSS matches the copied version, and the touched suites still pass.

#### RESOLVED: The `common.scss` note named two of the mixin's three users
`about-content.scss` also gets `dialogButton`, through `outlinedDialogButton`, but the step's note listed only `dialog.scss` and `disclaimer-content.scss`. Built with the plan's code, all three compile byte-identical to master; the note now names all three.

Checked and held: every before snippet matches the current `about-dialog-content.tsx`, `share-dialog-content.tsx`, `top-bar.tsx` and `top-bar.test.tsx` exactly; both steps apply as written and pass on their own (step one 20 tests, both 21); step one measures 200 changed lines; `LINT_BUILD=1` ESLint, `tsc --noEmit`, `npm run lint` (4 existing warnings) and `npm run lint:unused` (1 existing error) match Verification; the full suite fails only `app.test.tsx`.

### Reader of the spec a year from now

#### RESOLVED: Stale lines in this Self-Review
Its opening "Roles:" line named five roles that do not match the headings below it, and the traceability item referred to a corner-link step that no longer exists in the plan. Both are removed; the findings themselves are unchanged.

#### RESOLVED: "No confirmed issues" above the confirmed issues
The opening bullets ended with "No confirmed issues beyond the measurement folded into the `top-bar.scss` note", directly above the RESOLVED findings that follow. The line is removed.


### Security reviewer

Checked and held: nothing in the copy or its links is user-controlled; the three web links carry `rel="noopener noreferrer"` and `ExternalLink`'s props type omits `target` and `rel`, with the spread placed before them, so a caller cannot weaken either; the mailto link has no `target`, so no new browsing context is opened.

### Jest and test-isolation reviewer

Checked and held: with the plan's code, the touched suites pass under `--randomize` with three seeds (21 tests) and with the storm-mode and year cases run alone (`-t`); the run prints no `act` warnings or console errors. Fake timers are per test (`beforeEach`/`afterEach`), the storm case restores `config.mode` in `finally`, and the module-level `log` spy and per-test `saveModelToCloud` spies stay inside their own file's module registry.

### Cross-browser and visual reviewer

Checked and held, with the plan's code on a dev server in Chromium and Firefox at 1280 × 800: About and Share measure the same (21px tall, same top, 17px Lato, same color, no border, background or padding on the button); Tab focuses About with the 2px solid outline; after a mouse click opens About and Esc closes it, focus is back on About; in both dialogs all four copy links are underlined, and the Share dialog shows the copy below its three fields with the small copyright line. WebKit could not be launched on this host, so Safari is not covered. No dependency is added, so bundle growth is just the new components and styles.
