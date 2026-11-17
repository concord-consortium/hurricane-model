# Terms of Use Link and Licensing Copy for Hurricane Explorer

**Jira**: https://concord-consortium.atlassian.net/browse/HURR-70
**Repo**: https://github.com/concord-consortium/hurricane-model
**Implementation Spec**: [implementation.md](implementation.md)
**Status**: **In Development**

## Overview

Hurricane Explorer's About and Share dialogs get the license and Terms of Use copy approved for CODAP's About dialog, replacing the old CC BY-NC copyright block, so that every Geo app states the same thing: the source is MIT, and use of the hosted site is governed by Concord's Terms of Use. Embeds that hide the top bar stay as they are today.

## Project Owner Overview

Concord published non-commercial Terms of Use for everything it hosts. The Geo simulations are embedded widely, including in commercial curricula, so each one needs a visible, consistent statement that the hosted site is governed by those terms and that commercial use needs a separate agreement. HURR-70 is the Hurricane Explorer story in a set of five matching Geo stories, and its wording must match CODAP's approved About dialog and the other four apps.

Students and teachers see the new copy at the end of the About and Share dialogs, with working links to the MIT License, the Terms of Use, concord.org/licensing and licensing@concord.org. Embeds that hide the top bar (and with it the About button) are unchanged, as Kiley decided. The About button becomes reachable by keyboard. Kiley reviews the result on the deployed branch before merge.

## Background

The story asks for a persistent Terms of Use link, the license and Terms of Use copy wherever the app shows About or credits information, a run-time copyright year, reachability when embedded, and accessible links and dialogs. The shared decisions for all five Geo apps are in the global oob doc `streams/terms-of-use/geo-common.md` (decisions 1 to 11). Doug took all but four; Kiley Brown decided 3, 5, 6 and 9 on 2026-11-17, recorded under Open Questions below. This spec applies them to Hurricane rather than re-deciding them.

What the code has today (master):

- `src/components/top-bar/top-bar.tsx` renders Reload, Share and About as `<span onClick>` elements (`data-test` `reload`, `share`, `about`), so none of them is reachable by keyboard. About opens `<Dialog title="About: Hurricane Explorer">` with `AboutDialogContent`; Share opens `<Dialog title="Share: Hurricane Explorer">` with `ShareDialogContent`. Opening logs `AboutDialogOpened` / `ShareDialogOpened`.
- Both `about-dialog-content.tsx` and `share-dialog-content.tsx` end with `<Copyright />` (`top-bar/copyright.tsx`): "Copyright © {year} The Concord Consortium. All rights reserved. This resource is licensed under the Creative Commons Attribution-NonCommercial 4.0 International License (CC BY-NC 4.0)...". Nothing else imports `Copyright`.
- `src/components/dialog.tsx` wraps MUI 9's `Dialog`: the paper has `role="dialog"` and is labeled by an `<h2>` title through `aria-labelledby`, MUI traps focus and restores it on close, Esc closes (`escapeKeyDown` is the only close reason honored, so backdrop clicks do not), and the close control is a real `<button aria-label="Close">`. It already meets the CODAP-1595 dialog pattern; no dialog fix is needed in this repo.
- `config.topBarVisible` (default `true`; set by URL parameter `?topBarVisible=false` or by authored `urlParams`, listed in `src/utils/parse-authored-params.ts`) makes `index-page.tsx` skip `<TopBar />` entirely. With it off, nothing in the app reaches the About dialog. The app never turns the top bar off by itself: running in Activity Player (`LaraAppWrapper`) changes saving and modes but not `topBarVisible`, so in Activity Player the full top bar (Reload, Share, About) shows unless the activity's authored `urlParams` set `topBarVisible=false`. No branch of this repo hides it automatically when iframed. Among the other Geo apps, only Wildfire changes its header when embedded, and only in read-only (report) mode, where it drops Reload (WM-64). The map fills the space (`map-view.tsx` adds `css.noTopBar`).
- `config.mode === "storm"` renames the app "Storm Explorer" through `getAppName()` (`src/utils/app.ts`); Share's body text uses it, but the About and Share titles are hardcoded "Hurricane Explorer". In storm mode a disclaimer modal (`src/components/disclaimer-modal/`) also has an "About Storm Explorer" view (`about-content.tsx`) listing model simplifications.
- `LICENSE` is MIT (Copyright (c) 2018 Concord Consortium), so the story's "flag to Kiley if not MIT" condition does not trigger.

## Requirements

### License copy

- **R1. One license-copy component** renders the copy below and is the last block of both the About dialog and the Share dialog, replacing `<Copyright />` in each. `top-bar/copyright.tsx` is deleted (decision 5).
- **R2. Copy, word for word** (geo-common "Copy"; CODAP `V3.AboutDialog.*` with the product and host swapped), in this order:
  - Paragraph 1: **Hurricane Explorer is free, open-source software.** The Hurricane Explorer source code is released under the [MIT License], so you’re welcome to use, modify, and build on it.
  - Paragraph 2: **Your use of Hurricane Explorer at hurricane.concord.org** is governed by our [Terms of Use]. The hosted version is free for non-commercial use; commercial use requires a separate written agreement. For more information, visit [concord.org/licensing] or contact [licensing@concord.org].
  - Copyright line, in the existing small copyright style (0.8em): `© {current year} The Concord Consortium, Inc.`
  - The leading phrase of each paragraph is bold. "you’re" uses the curly apostrophe U+2019 (decision 1).
- **R3. Product name is always "Hurricane Explorer"** and the host always `hurricane.concord.org`, in storm mode too (decision 10).
- **R4. Year** is `new Date().getFullYear()` at render time. No range and no build-time constant (decision 1).
- **R5. The old text is gone** from both dialogs: no "Creative Commons", "CC BY-NC" or "All rights reserved" (decision 5).

### Links

- **R6. Link targets**, kept in one constants module rather than inline in JSX:
  - MIT License: `https://github.com/concord-consortium/hurricane-model/blob/master/LICENSE`
  - Terms of Use: `https://concord.org/terms-of-use/`
  - concord.org/licensing: `https://concord.org/licensing`
  - licensing@concord.org: `mailto:licensing@concord.org`
- **R7. Web links open in a new tab**: the three web links have `target="_blank"` and `rel="noopener noreferrer"` (decision 2), and append visually hidden text " (opens in a new tab)" so their accessible name is the visible text plus the hint. The mailto link is a plain same-tab `<a>` with no hint.
- **R8. Links in the copy are underlined.**

### Reachability

- **R9. Hidden top bar is unchanged**: with `topBarVisible` false the app renders exactly as today, with no corner link, About control or top-bar change (decision 3, Kiley: "Don't add anything").
- **R10. No other new surface**: no top-bar Terms of Use item, no heading over the copy, no CODAP-style links row (decision 6; Kiley confirmed the link inside the dialogs counts as visible).
- **R11. About is a `<button type="button">`**, styled as the current text control (same font, color, spacing and hover; no default button border or background), keeping `data-test="about"` and the `AboutDialogOpened` log. It shows a visible focus indicator on keyboard focus (the `:focus-visible` outline the dialog buttons use). Reload and Share stay as they are (decision 4).

### Dialog behavior

- **R12. About dialog**: keeps today's `Dialog` behavior (`role="dialog"` named "About: Hurricane Explorer", focus trap, Esc closes, Close button) and returns focus to the About button when it closes.

### Unchanged

- **R13.** The storm-mode "About Storm Explorer" disclaimer view is unchanged (decision 9). The About dialog's descriptive paragraphs and its creator and NSF credit line are unchanged; their links keep their current attributes.

### Tests

- **R14.** Unit tests render the real About and Share content (not the copy component alone) and cover, for each: the four hrefs, asserted as literal URLs rather than the constants module's values; `target` and `rel` on the three web links and their absence on the mailto link; each web link's accessible name including the " (opens in a new tab)" hint, and the mailto link's name as its text alone; the R2 copy word for word and in order, including the curly apostrophe and the two bold lead-in phrases; that the copy is the dialog's last block (R1); the copyright line, with the clock pinned to a fixed date and the year asserted as a literal, under two different pinned years so neither a year computed as the code computes it nor a hardcoded year passes; that the R5 text is absent; and, with `mode=storm`, that the copy still names Hurricane Explorer at hurricane.concord.org (R3). Tests also cover that About is a button reachable by Tab that opens the dialog with Enter and gets focus back when the dialog closes.

### Review

- **R15.** Kiley reviews the result on the branch deploy before merge (story acceptance criterion): CI's S3 deploy publishes each branch at `https://models-resources.concord.org/hurricane-model/branch/<name>/index.html` (`deployRunUrl` in `.github/workflows/ci.yml`), where `s3-deploy-action` strips a leading Jira key from the branch name, so this story's branch is at `https://models-resources.concord.org/hurricane-model/branch/add-terms-of-use-link/index.html`. The review covers that URL standalone and with `?mode=storm`.

## Technical Notes

- **Files in scope**: `src/components/top-bar/` (`top-bar.tsx`, `top-bar.scss`, `about-dialog-content.tsx`, `share-dialog-content.tsx`, `copyright.tsx` deleted, tests), `src/components/common.scss` (the shared focus outline), plus new files for the license copy, the `ExternalLink` component and the constants module.
- **Reference implementation**: CODAP's About dialog (CODAP-1595 / codap#2758): strings `V3.AboutDialog.*` in `v3/src/utilities/translation/lang/en-US.json5`, links in `about-dialog-constants.ts`, new-tab links in `components/common/external-link.tsx` with hint `V3.ExternalLink.opensInNewTab`.
- **No shared package**: the Geo apps share no component library, so Hurricane implements the copy locally; sameness comes from geo-common.md and an identical constants module.
- **Dialog**: `src/components/dialog.tsx` needs no change. MUI's focus trap restores focus to the element focused before opening, so R12's focus return follows from R11 once About can hold focus.
- **Logging**: no new log events, so `LOGGED-EVENTS.md` is unchanged.
- **Documentation**: no README line describes the copyright or license block.
- **CLUE-750 differences**: CLUE keeps a heading and a links row because its story and mockup require them; the Geo apps do not (decision 6).

## Out of Scope

- From the story: a third-party library acknowledgements list, usage tracking, changing the software license, localizing the legal copy, and a cookie banner.
- Converting Reload and Share to buttons (decision 4).
- Existing credit links in the About dialog, including their missing `rel` (geo-common "How links open").
- The disclaimer modal's "About Storm Explorer" view (decision 9).
- Embeds that hide the top bar (`topBarVisible=false`): no corner Terms of Use link, corner About control or top-bar change, so the About dialog and the copy stay unreachable there, as today (decision 3).
- Changing the dialog titles or `getAppName()` for storm mode (decision 10).
- The other four Geo apps and Boreal Forest Fire Explorer.
- Loading in a non-LARA iframe: when iframed, the app waits for Activity Player's `initInteractive` message with no fallback, so a plain third-party iframe stays on "Loading your simulation...". This exists on master and is left as is.

## Open Questions

<!-- Requirements-focused questions only (scope, acceptance criteria, business rules).
     Implementation questions go in implementation.md. -->

### RESOLVED: May the CC BY-NC content-license sentence go? (geo-common decision 5)
**Decision**: Yes. Kiley on 2026-11-17: "Yes, replace it with the new copy." R1 and R5 stand.

### RESOLVED: Does a link inside the About and Share dialogs count as "visible"? (geo-common decision 6)
**Decision**: Yes, with no top-bar Terms of Use item. Kiley on 2026-11-17: "Yes." R10 stands.

### RESOLVED: What do embeds that hide the top bar get? (geo-common decision 3)
**Decision**: Nothing. Kiley on 2026-11-17: "Don't add anything." No corner Terms of Use link, no corner About control and no top-bar change; with `topBarVisible=false` the app stays as it is today (R9, Out of Scope).

### RESOLVED: Where does the hidden-top-bar link go?
**Decision**: Moot: with decision 3 there is no corner link.

### RESOLVED: Can the storm-mode "About Storm Explorer" view go without the copy? (geo-common decision 9)
**Decision**: Yes. Kiley on 2026-11-17: "Agreed." R13 stands.

### RESOLVED: Judgment call: what if the stream changes the shared wording?
**Options considered**:
- A) Follow geo-common.md as it stands, and update R2 if the stream changes the copy for all apps.
- B) Hold the copy open until every question about it (such as Leslie Bondaryk's question on "Inc." in CLUE-750's review) is settled.

**Decision**: A. The copy is approved CODAP wording; a stream-wide change would be one edit to R2 and the copy component.

### RESOLVED: Low confidence: should About's focus return be a requirement here or only a consequence?
**Context**: R12 asks for focus to return to the About button. It follows from MUI's focus restore once About is a button, but that is reasoned, not yet run.
**Options considered**:
- A) Keep R12 and verify it with a throwaway test before the implementation spec.
- B) Drop R12 as implied.

**Decision**: A. A throwaway Jest test with a `<button>` trigger and the real `Dialog` confirmed that Tab reaches the button, Enter opens a dialog named "About: Hurricane Explorer", and both Esc and the Close button return focus to the trigger. R12 stays, since a later change (a `disableRestoreFocus`, or About going back to a span) would break it silently, and R14 gets a test for it.

## Self-Review

### WCAG Accessibility Expert

#### RESOLVED: A button with no focus style
`top-bar.scss` has hover styles for `.textButton` but no focus style, and R11's "styled as the current text control" would carry that gap onto the new button. The repo's `dialogButton` mixin (`common.scss`) already defines a `:focus-visible` outline. R11 now requires a visible focus indicator.

---

### QA Engineer

#### RESOLVED: The year test could pass by construction
The existing `Copyright` computes `(new Date()).getFullYear()`; a test that builds its expectation the same way cannot catch a wrong year source. R14 now pins the clock and asserts a literal year.

#### RESOLVED: Href tests against the constants module cannot fail
A test that compares hrefs with the exported constants passes even if a constant is wrong (CLUE-750's review caught the same thing). R14 now asks for literal URLs.

---

### Product Manager

#### RESOLVED: The Kiley review criterion had no requirement
The story's fourth acceptance criterion ("Kiley has reviewed the result on the deployed branch") was not in the requirements. R15 adds it with the branch deploy location from `ci.yml` and the configurations she should see.

---

### Senior Engineer

#### RESOLVED: Requirements out of numeric order
The Review section (R15) sat between R12 and R13, so the list read R12, R15, R13, R14. It now follows Tests; no requirement was renumbered, so the implementation spec's references still hold.

#### RESOLVED: Background credited every geo-common decision to Doug
It said decisions 1 to 11 were "all taken by Doug" and, in the next sentence, that Kiley decided 3, 5, 6 and 9. It now says Doug took all but those four.

---

### Engineer porting the plan to the other Geo apps

#### RESOLVED: R14 was weaker than geo-common's Tests paragraph and the planned tests
geo-common.md's Tests paragraph, and the plan's `license-copy.test.tsx`, assert each web link's accessible name with the new-tab hint, the copy word for word with its bold lead-ins, and the year under two pinned dates. R14 named none of these, so the implementation spec's claim that geo-common "matches R14" did not hold, and a test file meeting R14 alone could drop them. R14 now lists all three, and says the tests render the real dialog content.

---

### Reader of the spec a year from now

#### RESOLVED: Browser check recorded in both specs
Technical Notes carried a "Verified in the browser" note on throwaway code that repeats the browser bullet in the implementation spec's Verification. It is removed here; Verification is the one record.

#### RESOLVED: The Self-Review's "Roles:" line did not match its headings
It listed a Student role that has no findings and a Product Manager "as Kiley" that is a separate heading, and omitted three roles that have headings. It is removed; the headings are the list, as in implementation.md.


---

### Kiley, as the acceptance reviewer on the branch deploy

#### RESOLVED: R15 named only the deploy bucket, not the page to open
R15 said CI publishes each branch "under" `models-resources.concord.org/hurricane-model/`. `s3-deploy-action` (`deploy-props.ts`) publishes to `branch/<name>/` after stripping a leading Jira key (`^[A-Za-z]{2,}-[0-9]+-`), so a URL built from the full branch name 404s. R15 now gives the exact URL; implementation.md's Verification points at it.

#### RESOLVED: A bare third-party iframe never gets past "Loading your simulation...", so the "embedded" half of the first acceptance criterion cannot be shown outside Activity Player
`index.tsx` renders `LaraAppWrapper` whenever `inIframe()` is true, and `LaraAppWrapper` shows `LoadingIndicator` until `useInitMessage()` resolves. In `@concord-consortium/lara-interactive-api` 1.13.0, `getInitInteractiveMessage()` resolves only on an `initInteractive` message from the parent and has no timeout, so any host that is not LARA or Activity Player never gets the app, its top bar, or the About dialog. Confirmed in Chromium and Firefox with the plan's code: a page holding the exact `<iframe>` snippet that the Share dialog offers ("To embed ... in a website or blog") showed "Loading your simulation..." after 8 seconds, with no About control. This is on master too and is not caused by this story, but the story's requirement 4 names "third-party iframes", and Kiley's decision 6 (the link inside the dialogs counts as visible embedded) assumed the dialogs render when embedded. R15 also gives Kiley no embedded view to check.
- A) Leave it out of scope: add it to Out of Scope as a pre-existing defect, file a follow-up story, and have R15 cover embedded through an Activity Player activity pointed at the branch URL (Doug to provide the link).
- B) Fix it in this story: render the standalone app when no `initInteractive` arrives within a short timeout, with a test.
- C) Ask Kiley whether Activity Player alone satisfies "embedded" for her review.

**Decision**: Doug on 2026-11-17: ignore it for this story. HURR-70 does not change how the app loads in an iframe, and R15 does not add an embedded check; see Out of Scope.
