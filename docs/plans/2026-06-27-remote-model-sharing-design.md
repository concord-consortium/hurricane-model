# Remote Model Sharing via `modelId` — Design

**Date:** 2026-06-27
**Status:** Approved (design); implementation plan pending
**Branch:** hurr-13-model-sharing

## Summary

Allow a user to save the current simulation state remotely and share it via a
`?modelId=<id>` URL. Loading the app with that param fetches the saved state and
restores it. This mirrors the existing feature in
[concord-consortium/tectonic-explorer](https://github.com/concord-consortium/tectonic-explorer),
adapted to this repo's existing serialization.

## Background — how tectonic-explorer does it

- **Storage:** AWS S3 via Concord's `@concord-consortium/token-service` (NOT
  Firebase, despite a stale code comment). `src/storage.ts` mints temporary S3
  credentials (`tool: "te-models"`), gzips the serialized model with `pako`,
  uploads `model.json.gz`, and the returned S3 resource UUID becomes the
  `modelId`. Load is a public `fetch` from
  `https://models-resources.concord.org/te-models/${modelId}/model.json.gz`.
- **Reading `modelId`:** `getURLParam("modelId")` in `app.tsx`; copied into
  `config.modelId`; the simulation store's constructor calls
  `loadCloudModel(config.modelId)` when set.
- **Save UI gate:** the "Share Model" button appears only when `config.sidebar`
  contains `"save"` (default includes it). No separate feature flag, no env vars
  — token-service handles auth at runtime.

## What this repo already has

The hard part — serialization — is done.
[src/models/interactive-state.ts](../../src/models/interactive-state.ts) provides
`getInteractiveState()`, `setInteractiveState()`, and `migrateState()` over a
versioned `IHurricaneInteractiveState`. The new feature reuses this format
verbatim; it only adds remote upload/download and a share UI.

A Share dialog already exists
([share-dialog-content.tsx](../../src/components/top-bar/share-dialog-content.tsx))
showing the page URL and an iframe embed string, opened from
[top-bar.tsx](../../src/components/top-bar/top-bar.tsx).

## Decisions

| Decision | Choice |
| --- | --- |
| Storage backend | Mirror tectonic: `@concord-consortium/token-service` + S3, `aws-sdk`, `pako` |
| token-service tool name | `hurricane-models` (register in Concord token-service if not already) |
| Share UI | Self-contained `ShareModelButton` at the **top** of the existing share dialog; opens its **own** result dialog with model code + link. Loosely coupled so it can be relocated. |
| Button visibility | Always visible (no config flag) |
| Load precedence | Standalone: `modelId` wins (only state source). LARA: a saved student `interactiveState` takes precedence; `modelId` seeds initial state only when there is no saved work. |

New dependencies (not yet installed): `@concord-consortium/token-service`,
`aws-sdk`, `pako`.

## Architecture

### 1. Storage module — new `src/models/cloud-storage.ts`

The only place that knows about S3 / token-service. Operates on the existing
`IHurricaneInteractiveState`; introduces no new serialization format.

- `saveModelToCloud(state: IHurricaneInteractiveState): Promise<string>`
  - `new TokenServiceClient({ env: "production" })`
  - create S3 resource under `tool: "hurricane-models"`, get temporary credentials
  - `pako.gzip(JSON.stringify(state))`, upload `model.json.gz` via aws-sdk S3 client
  - resolve to `resource.id` (the `modelId`)
- `loadModelFromCloud(modelId: string): Promise<IHurricaneInteractiveState | null>`
  - `fetch` `https://models-resources.concord.org/hurricane-models/${modelId}/model.json.gz`
  - ungzip / parse, run through `migrateState()`
  - return migrated state, or `null` on incompatible/parse/network failure

### 2. `ShareModelButton` — new `src/components/top-bar/share-model-button.tsx`

Self-contained component owning its own state and result dialog:

- Button + `saving` state (disabled while uploading)
- On click: `getInteractiveState(stores)` → `saveModelToCloud(...)`
  - success → open own result dialog with read-only **model code** (the id) and
    **link** = `location.href.split("?")[0] + "?modelId=" + id` (matches tectonic)
  - failure → inline error in the result dialog; button re-enables for retry
- Logs a `ModelShared` event via `log()` (add to LOGGED-EVENTS.md)

Rendered at the top of `share-dialog-content.tsx`; the rest of the dialog is
untouched.

### 3. Config + load-on-startup

- Add `modelId: ""` to `DEFAULT_CONFIG` in
  [config.ts](../../src/config.ts) so the existing URL-param loop populates
  `config.modelId` from `?modelId=`.
- **Standalone** ([AppComponent](../../src/components/app.tsx)): on mount, if
  `config.modelId`, `loadModelFromCloud` → `setInteractiveState(stores, migrated)`.
  Show a lightweight loading/error indicator while fetching.
- **LARA** ([lara-app-wrapper.tsx](../../src/components/lara/lara-app-wrapper.tsx)):
  in the existing restore effect, saved `interactiveState` takes precedence; only
  when there is no saved student work do we fall back to loading `config.modelId`
  as the initial seed. Never overwrites student work.

## Error handling

- **Save** (token-service / S3 / network): caught in `ShareModelButton`, surfaced
  as an error in its result dialog; button re-enables. No throw to the app.
- **Load** (404 / corrupt / incompatible version → `migrateState` returns `null`):
  app continues with default state and shows a non-blocking notice ("Couldn't
  load the shared model"). No crash.

## Testing

- Jest unit tests for `cloud-storage.ts` with token-service / aws-sdk / `fetch`
  mocked: gzip round-trip, tool name, URL construction, migration on load, null on
  failure.
- Jest component test for `ShareModelButton` (mock `saveModelToCloud`): click →
  saving state → result dialog shows code + correct `?modelId=` link; error path
  shows error.
- Add any ESM-only storage deps to Jest's `transformIgnorePatterns` allow-list
  (per CLAUDE.md).

## Out of scope (YAGNI)

- No config flag to hide the button.
- No new serialization format or versioning changes beyond existing `migrateState`.
- No backend service to stand up (token-service + S3 already exist).
- No Firebase.
