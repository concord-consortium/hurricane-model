# Terms of Use Link and Licensing Copy for Hurricane Explorer

**Jira**: https://concord-consortium.atlassian.net/browse/HURR-70

**Status**: **Closed**

## Overview

Hurricane Explorer's About and Share dialogs get the license and Terms of Use copy approved for CODAP's About dialog, replacing the old CC BY-NC copyright block, so that every Geo app states the same thing: the source is MIT, and use of the hosted site is governed by Concord's Terms of Use. Embeds that hide the top bar stay as they are today. The top bar's Reload, Share and About controls become real, keyboard-reachable buttons.

HURR-70 is the Hurricane Explorer story in a set of five matching Geo stories (HURR-70, SE-4, TE-10, WM-67, FM-5). The decisions shared by all five are in the global oob doc `streams/terms-of-use/geo-common.md` (decisions 1 to 11). Doug took all but four; Kiley Brown decided 3, 5, 6 and 9 on 2026-11-17. This spec applies them to Hurricane rather than re-deciding them.

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
- **R11. Reload, Share and About are `<button type="button">`s**, styled as the current controls (same icon, font, color, spacing and hover; no default button border or background), keeping their `data-test` values and their logs. Reload, which shows only an icon, is named "Reload" by `aria-label`. Each shows a visible focus indicator on keyboard focus (the `:focus-visible` outline the dialog buttons use), drawn entirely inside the 22px top bar. Reload and Share go beyond decision 4, which kept them spans (see Decisions).

### Dialog behavior

- **R12. About dialog**: keeps today's `Dialog` behavior (`role="dialog"` named "About: Hurricane Explorer", focus trap, Esc closes, Close button) and returns focus to the About button when it closes. The Share dialog likewise returns focus to the Share button.

### Unchanged

- **R13.** The storm-mode "About Storm Explorer" disclaimer view is unchanged (decision 9). The About dialog's descriptive paragraphs and its creator and NSF credit line are unchanged; their links keep their current attributes.

### Tests

- **R14.** Unit tests render the real About and Share content (not the copy component alone) and cover, for each: the four hrefs, asserted as literal URLs rather than the constants module's values; `target` and `rel` on the three web links and their absence on the mailto link; each web link's accessible name including the " (opens in a new tab)" hint, and the mailto link's name as its text alone; the R2 copy word for word and in order, including the curly apostrophe and the two bold lead-in phrases; that the copy is the dialog's last block (R1); the copyright line, with the clock pinned to a fixed date and the year asserted as a literal, under two different pinned years so neither a year computed as the code computes it nor a hardcoded year passes; that the R5 text is absent; and, with `mode=storm`, that the copy still names Hurricane Explorer at hurricane.concord.org (R3). Tests also cover that Reload, Share and About are buttons reachable by Tab in that order, that Enter reloads or opens the matching dialog, and that focus returns to Share or About when its dialog closes.

### Review

- **R15.** Kiley reviews the result on the branch deploy before merge (story acceptance criterion): CI's S3 deploy publishes each branch at `https://models-resources.concord.org/hurricane-model/branch/<name>/index.html` (`deployRunUrl` in `.github/workflows/ci.yml`), where `s3-deploy-action` strips a leading Jira key from the branch name, so this story's branch is at `https://models-resources.concord.org/hurricane-model/branch/add-terms-of-use-link/index.html`. The review covers that URL standalone and with `?mode=storm`.

## Technical Notes

- **Where the code lives**: the copy, the `ExternalLink` component and the link constants are in `src/components/license/` (`license-constants.ts`, `external-link.tsx`, `license-copy.tsx`, with `license-copy.test.tsx` running against both dialogs). The top-bar buttons are in `src/components/top-bar/top-bar.tsx`; their focus outline comes from the `focusOutline` mixin in `src/components/common.scss`, which `dialogButton` also includes.
- **Reference implementation**: CODAP's About dialog (CODAP-1595 / codap#2758): strings `V3.AboutDialog.*` in `v3/src/utilities/translation/lang/en-US.json5`, links in `about-dialog-constants.ts`, new-tab links in `components/common/external-link.tsx` with hint `V3.ExternalLink.opensInNewTab`. The constants module and copy match CODAP's apart from the product, host and MIT URL.
- **No shared package**: the Geo apps share no component library, so Hurricane implements the copy locally; sameness comes from geo-common.md and an identical constants module.
- **Dialog**: `src/components/dialog.tsx` needed no change. It wraps MUI 9's `Dialog`, which already meets the CODAP-1595 pattern (`role="dialog"` labeled by its title, focus trap, Esc closes, a real Close button). MUI's focus trap restores focus to the element focused before opening, so R12's focus return follows from R11 once About can hold focus.
- **Top bar and embeds**: `config.topBarVisible` (URL parameter or authored `urlParams`) makes `index-page.tsx` skip `<TopBar />` entirely, and with it every route to the About dialog. Running in Activity Player does not change it, so the full top bar shows there unless the activity's authored `urlParams` set `topBarVisible=false`.
- **Storm mode**: `getAppName()` returns "Storm Explorer" in storm mode, so the copy names the product directly rather than calling it.
- **Button reset**: the top-bar buttons set their line height from `$topBarHeight` minus the outline's width and offset on both sides (16px with a 1px offset), so the focus outline fills the 22px bar without being clipped by the window edge above or the side panels below. Reload's button is the same 16px tall; its 24px MUI icon overflows it by 4px above and below, which is blank space in the icon's box, so the icon stays where it was and the outline frames the glyph.
- **Logging**: no new log events, so `LOGGED-EVENTS.md` is unchanged.
- **CLUE-750 differences**: CLUE keeps a heading and a links row because its story and mockup require them; the Geo apps do not (decision 6).

## Out of Scope

- From the story: a third-party library acknowledgements list, usage tracking, changing the software license, localizing the legal copy, and a cookie banner.
- Existing credit links in the About dialog, including their missing `rel` (geo-common "How links open").
- The disclaimer modal's "About Storm Explorer" view (decision 9).
- Embeds that hide the top bar (`topBarVisible=false`): no corner Terms of Use link, corner About control or top-bar change, so the About dialog and the copy stay unreachable there, as before (decision 3).
- Changing the dialog titles or `getAppName()` for storm mode (decision 10).
- The other four Geo apps and Boreal Forest Fire Explorer.
- Loading in a non-LARA iframe: when iframed, the app waits for Activity Player's `initInteractive` message with no fallback, so a plain third-party iframe stays on "Loading your simulation...". This predates the story and is left as is.

## Decisions

### May the CC BY-NC content-license sentence go? (geo-common decision 5)
**Context**: The old `Copyright` block licensed the content under CC BY-NC 4.0, which the new copy does not mention.

**Decision**: Yes. Kiley on 2026-11-17: "Yes, replace it with the new copy." R1 and R5 follow.

---

### Does a link inside the About and Share dialogs count as "visible"? (geo-common decision 6)
**Context**: The story asks for a persistent, visible Terms of Use link; the dialogs are opened from the top bar rather than always on screen.

**Decision**: Yes, with no top-bar Terms of Use item. Kiley on 2026-11-17: "Yes." R10 follows.

---

### What do embeds that hide the top bar get? (geo-common decision 3)
**Context**: With `topBarVisible=false` nothing in the app reaches the About dialog, and story requirement 4 asks for reachability in embeds. A corner link and a corner About control had been planned.

**Decision**: Nothing. Kiley on 2026-11-17: "Don't add anything." No corner Terms of Use link, no corner About control and no top-bar change (R9, Out of Scope). The planned corner-link step was removed, which also made the question of where the corner link goes moot.

---

### Can the storm-mode "About Storm Explorer" view go without the copy? (geo-common decision 9)
**Context**: The disclaimer modal's About view lists model simplifications and is a second "About" surface in storm mode.

**Decision**: Yes. Kiley on 2026-11-17: "Agreed." R13 follows.

---

### What if the stream changes the shared wording?
**Context**: Questions about the copy were still being raised elsewhere (such as Leslie Bondaryk's question on "Inc." in CLUE-750's review).

**Options considered**:
- A) Follow geo-common.md as it stands, and update R2 if the stream changes the copy for all apps.
- B) Hold the copy open until every question about it is settled.

**Decision**: A. The copy is approved CODAP wording; a stream-wide change would be one edit to R2 and the copy component.

---

### Should About's focus return be a requirement or only a consequence?
**Context**: Focus return follows from MUI's focus restore once About is a button, but that was reasoned, not yet run.

**Options considered**:
- A) Keep R12 and verify it with a throwaway test.
- B) Drop R12 as implied.

**Decision**: A. A throwaway Jest test with a `<button>` trigger and the real `Dialog` confirmed that Tab reaches the button, Enter opens a dialog named "About: Hurricane Explorer", and both Esc and the Close button return focus to the trigger. R12 stays because a later change (a `disableRestoreFocus`, or About going back to a span) would break it silently, and R14 tests it.

---

### Should the About button get a focus style?
**Context**: `.textButton` had hover styles but no focus style, so "styled as the current text control" would carry that gap onto a keyboard-reachable button.

**Decision**: R11 requires a visible focus indicator, reusing the `:focus-visible` outline the dialog buttons already use.

---

### How should the tests guard the year and the hrefs?
**Context**: A year test that computes its expectation the same way as the code passes by construction, and href tests that compare against the exported constants pass even if a constant is wrong (CLUE-750's review caught the same thing).

**Decision**: R14 pins the clock and asserts a literal year under two different pinned years, and asserts hrefs as literal URLs.

---

### How strong does R14 need to be?
**Context**: geo-common.md's Tests paragraph and the planned tests asserted accessible names with the new-tab hint, the copy word for word with its bold lead-ins, and the year under two pinned dates, but R14 named none of them, so a test file meeting R14 alone could drop them.

**Decision**: R14 lists all of them and requires rendering the real dialog content. geo-common.md's Tests paragraph was rewritten to match R14, so the other four stories write the same tests, with this story's `license-copy.test.tsx` as the worked example.

---

### Does the Kiley review need its own requirement, and where does she look?
**Context**: The story's fourth acceptance criterion had no requirement, and a URL built from the full branch name 404s because `s3-deploy-action` strips a leading Jira key.

**Decision**: R15 adds the review and gives the exact branch deploy URL, checked standalone and with `?mode=storm`.

---

### What about a plain third-party iframe that never loads?
**Context**: When iframed, `LaraAppWrapper` shows "Loading your simulation..." until Activity Player's `initInteractive` message arrives, and `@concord-consortium/lara-interactive-api` 1.13.0 waits with no timeout, so any host that is not LARA or Activity Player never gets the app, its top bar or the About dialog. The Share dialog's own embed snippet showed this in Chromium and Firefox. It predates the story, but story requirement 4 names third-party iframes.

**Options considered**:
- A) Leave it out of scope, file a follow-up story, and cover embedded in R15 through an Activity Player activity.
- B) Fix it here: render the standalone app when no `initInteractive` arrives within a short timeout.
- C) Ask Kiley whether Activity Player alone satisfies "embedded".

**Decision**: Doug on 2026-11-17: ignore it for this story. HURR-70 does not change how the app loads in an iframe, R15 adds no embedded check, and no follow-up story was filed. It is listed under Out of Scope.

---

### Where does the shared code live?
**Options considered**:
- A) A new `src/components/license/` folder.
- B) `src/components/top-bar/`, beside the dialogs.

**Decision**: A. The copy is rendered by both dialogs and `ExternalLink` is a general link component; keeping them apart from the top bar's own controls keeps `top-bar/` about the bar.

---

### Test the copy through the dialogs or through `LicenseCopy` alone?
**Options considered**:
- A) Run one `describe.each` over the real About and Share contents.
- B) Test `LicenseCopy` alone, plus a smoke check that each dialog renders it.

**Decision**: A. R14 asks for each dialog to be covered, and A fails if either dialog drops the component, without a separate smoke test.

---

### How is storm mode's product name tested?
**Context**: Every copy test ran in hurricane mode, where `getAppName()` also returns "Hurricane Explorer", so rewriting `LicenseCopy` to use `getAppName()` left all the copy tests green.

**Decision**: A storm-mode case was added to the `describe.each`, and R14 names it.

---

### Should the About button copy the dialog buttons' outline or share it?
**Context**: Pasting `outline: 2px solid $charcoal; outline-offset: 2px` into `.textButton` beside the identical block in `dialogButton` would let the two focus styles drift apart.

**Decision**: A `focusOutline` mixin in `common.scss` holds the outline, and both `dialogButton` and `.textButton` include it. The compiled CSS of `dialogButton`'s three users (`dialog.scss`, `disclaimer-content.scss`, and `about-content.scss` through `outlinedDialogButton`) is byte-identical to before.

---

### Should Share and Reload become buttons too?
**Context**: Decision 4 kept Share and Reload spans because every link in Share's copy is also reachable through About. PR review asked for Share to be keyboard reachable as well, and Doug chose to convert Reload with it.

**Decision**: Yes. Both are buttons styled and tested like About, with Reload named by `aria-label`. The other Geo stories still follow decision 4 unless they choose otherwise.

---

### Can a caller weaken the new-tab link's `rel`?
**Context**: `ExternalLink` spreads its other props onto the `<a>`.

**Decision**: No change needed: its props type omits `target` and `rel`, and the spread comes before them, so a caller cannot override either. Nothing in the copy or its links is user-controlled.
