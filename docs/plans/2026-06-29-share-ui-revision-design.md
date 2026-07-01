# Share UI Revision — Auto-share on dialog open

**Date:** 2026-06-29
**Status:** Approved (design)
**Branch:** hurr-13-model-sharing

## Summary

Revise the model-sharing UI. Instead of a dedicated "Share Model" button that
uploads and opens its own result modal, the model uploads **automatically when
the Share dialog is opened**, and the resulting `?modelId=` link appears in a new
field at the bottom of the existing Share dialog.

This supersedes the UI introduced in the original feature (the `ShareModelButton`
component and its result dialog); the storage util, config, and standalone/LARA
load logic are unchanged.

## Decisions

- **Upload trigger:** every time the Share dialog opens (fresh `modelId` reflecting
  current state each time). MUI `Dialog` unmounts its children on close, so
  mounting `ShareDialogContent` == the dialog being opened.
- **Error display:** show the actual error message in the new field.

## Changes

### Removal
- Delete `src/components/top-bar/share-model-button.tsx` and its test.
- Remove `<ShareModelButton />` from `share-dialog-content.tsx`.

### Auto-upload
- Convert `ShareDialogContent` from a class to a functional component.
- On mount (`useEffect(…, [])`): `getInteractiveState(useStores())` →
  `saveModelToCloud(state)`, tracking `saving` / `modelId` / `error`.
- Log `ModelShared` (`{ modelId }`) on success — preserves the existing event.

### New field (bottom of dialog, above `<Copyright/>`)
- **Saving:** `Saving model…`
- **Success:** label `To share this exact model state in email or IM, copy this link:`
  above a read-only textarea containing
  `window.location.href.split("?")[0] + "?modelId=" + modelId`.
- **Error:** `Couldn't save the model: <actual message>`.
- The existing page-URL and iframe-embed fields are unchanged.

## Error handling

- `saveModelToCloud` throws on failure; caught in `ShareDialogContent`, message
  stored and rendered in the new field. No throw escapes to the app.

## Testing

- Delete `share-model-button.test.tsx`; remove the obsolete "shows the Share Model
  button" test from `top-bar.test.tsx` (keep "opens share dialog").
- New `share-dialog-content.test.tsx` (mock `saveModelToCloud`): (a) shows
  `Saving model…` while in flight, (b) shows the labeled `?modelId=` link on
  success, (c) shows the real error message on failure, (d) logs `ModelShared` on
  success.

## Docs

- Update the `ModelShared` trigger in `LOGGED-EVENTS.md` to "Share dialog opened
  and model successfully saved to the cloud".

## Out of scope

- No change to `cloud-storage.ts`, `config.modelId`, `app.tsx`, or
  `lara-app-wrapper.tsx`.
