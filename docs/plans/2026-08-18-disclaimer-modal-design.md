# Liability Disclaimer Modal — Design

Date: 2026-08-18

## Problem

Storm Explorer is a simulation. Users need to be told, before they can interact
with it, that its output is not a forecast. Today nothing says so.

## Solution

On load, Storm Explorer shows a blocking modal over a darkened page:

- close button, top right
- warning icon, centered below it
- the text "This is a simulation and cannot be used to make a forecast."
- a "Got it" button at the bottom

Dismissing it — by either button — reveals the app.

## Scope

The modal appears only when:

- `config.mode === "storm"` (Hurricane Explorer does not show it)
- `config.disclaimer` is true (new flag, default true, settable via `?disclaimer=false`)
- `ui.isReportMode` is false, so LARA report and reportItem views skip it

## Components

### `Dialog` (existing, modified)

`src/components/dialog.tsx` already supplies the MUI `Dialog` wrapper, backdrop,
focus trap, scroll lock and a top-right close button. Reuse it rather than
building a second modal.

Two changes:

1. `title` becomes optional. When absent, the title element is not rendered and
   `aria-labelledby` is omitted. The About and Share dialogs still pass a title
   and are unaffected.
2. `.closeButton` gains a filled hover and active state (see Button styling).
   This changes the About and Share dialogs' close buttons too, which is
   intended — the app should have one close-button treatment.

The icon, message and "Got it" button are passed as `children`. No `icon` or
`footer` props.

### `DisclaimerModal` (new)

`src/components/disclaimer-modal.tsx` plus `disclaimer-modal.scss`.

Renders `Dialog` with no title, `ariaDescribedBy` pointing at the message, and
children: `WarningIcon` from `@mui/icons-material`, the message, the "Got it"
button.

Local `useState` holds only whether the user has dismissed it; visibility is
derived on each render as `!dismissed && config.disclaimer && config.mode ===
"storm" && !ui.isReportMode`. Deriving rather than initializing state once
matters because `LaraAppWrapper` sets `ui.mode` asynchronously from LARA's
`initMessage`, after first render — an `isReportMode` that arrives late still
hides the modal.

Dismissal is deliberately not stored in `UIModel`: it is not student work, so
keeping it out avoids touching `IHurricaneInteractiveState` and bumping
`CURRENT_VERSION` in `migrateState`.

Mounted by `IndexPage`.

## Button styling

Both buttons share one SCSS placeholder for their fill:

- hover: `$secondaryColorHover` (`#ffdaa3`)
- active: `$secondaryColor` (`#ff9900`), no visible border

The close button stays borderless at rest, as it is today, and gains padding and
a border radius so the fill has a shape. The "Got it" button carries a
`$charcoalMedium` border at rest. On active its border goes transparent rather
than being removed, so the button does not shift by a pixel.

## Config

`DEFAULT_CONFIG` in `src/config.ts` gets `disclaimer: true`. The existing URL
param loop already coerces `"false"` to boolean `false`, so no parsing change is
needed.

Cypress specs drive the app immediately after load and would be blocked by the
modal, so they append `disclaimer=false` to their visit URL.

## Logging

`log("DisclaimerDismissed", { source })` fires on close, where `source` is
`"gotIt"` or `"close"`. The shared `Dialog`'s `onClose` is typed `() => void`
and drops MUI's `reason` argument, so a close-button click, an escape key and a
backdrop click all arrive as `"close"`. Splitting them would mean widening the
shared signature for one caller; not worth it. Documented in `LOGGED-EVENTS.md`.

Backdrop click and escape therefore still dismiss the modal, per MUI's default.
If the disclaimer must require an explicit acknowledgement, `Dialog` would need
to forward MUI's `reason` so the modal can ignore `"backdropClick"`. Flagged,
not built.

## Testing

Jest, in `disclaimer-modal.test.tsx`:

- renders in storm mode with the flag on
- absent when `disclaimer` is false
- absent in hurricane mode
- absent when `ui.isReportMode`
- each button closes it and logs with the right `source`

Existing `dialog.test.tsx` gains a case for the untitled variant.
