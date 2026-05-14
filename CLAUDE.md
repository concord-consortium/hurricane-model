# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start                # webpack dev server with HMR
npm run build            # lint:build + clean + production webpack build
npm run lint             # eslint over src/**/*.{ts,tsx}
npm run lint:build       # same, but LINT_BUILD=1 makes no-console / no-debugger errors
npm run lint:fix
npm run lint:unused      # tsc --noUnusedLocals (separate from lint)
npm test                 # jest
npm run test:watch
npm run test:coverage
npm run test:cypress     # headless cypress run (e2e)
npm run test:cypress:open
```

Run a single Jest test by file or name:
```bash
npx jest src/models/simulation.test.ts
npx jest -t "name of test"
```

## Big-picture architecture

This is a physics-style hurricane simulation that runs in two embedding contexts:
- **Standalone** (`src/index.tsx` → `AppComponent`): no host integration; config comes from URL params merged over `DEFAULT_CONFIG` in [src/config.ts](src/config.ts).
- **Iframed in LARA / Activity Player** (`LaraAppWrapper`): uses `@concord-consortium/lara-interactive-api` to receive `initMessage`, hydrate `authoredState`, restore/save `interactiveState` (debounced via a MobX `reaction`), and report height. The wrapper detects iframe via `inIframe()` and chooses which root component to render.

**State layer (MobX, class-based with decorators).** `createStores()` in [src/models/stores.ts](src/models/stores.ts) creates two singletons:
- `SimulationModel` ([src/models/simulation.ts](src/models/simulation.ts)) — the physics core: wind field (seasonally averaged NOAA data, NetCDF→JSON in `wind-data-json/`), pressure systems, hurricane state, track points, landfalls, precipitation. Uses `kd-tree-javascript` for nearest-wind-point lookups and `pngjs` to read sea-surface-temperature PNGs (color→temperature via [src/temperature-scale.js](src/temperature-scale.js)). An `autorun` in the constructor keeps `seaSurfaceTempData` in sync with `season`.
- `UIModel` ([src/models/ui.ts](src/models/ui.ts)) — map bounds/zoom, base map, overlay, thermometer state, accessible SST scale, runtime/authoring/report `mode`.

Stores are injected via `mobx-react`'s `<Provider>` and read in class components via [src/components/base.ts](src/components/base.ts) (`BaseComponent.stores`). Functional components use `observer()` from `mobx-react`.

**Authored / Interactive state.** Two flows touch `config`:
1. URL params: parsed inside [src/config.ts](src/config.ts) and merged over `DEFAULT_CONFIG` at module load.
2. LARA authored state: `applyAuthoredState()` ([src/utils/apply-authored-state.ts](src/utils/apply-authored-state.ts)) parses an `urlParams` string from the authored state object and **mutates `config` in place** after import. Components that read `config` at construction time will already have the URL-param values; authored values must be applied before stores are read.

`IHurricaneInteractiveState` (versioned, [src/types/interactive-state.ts](src/types/interactive-state.ts)) is what gets saved/restored for student work. `migrateState()` in [src/models/interactive-state.ts](src/models/interactive-state.ts) handles legacy unversioned state — bump `CURRENT_VERSION` and add a migration step when changing the shape.

**Randomness.** All "random" calls go through `random()` in [src/seedrandom.ts](src/seedrandom.ts) — never use `Math.random` directly. `seedrandom.initialize(config.deterministic)` runs at startup so `?deterministic=true` produces reproducible runs. State can be captured via `getState()` / `initializeFromState()` (used by interactive-state save/restore).

**Logging.** All telemetry goes through `log` in [src/log.ts](src/log.ts), which wraps `@concord-consortium/lara-interactive-api`'s `log()`. Events only fire when iframed in LARA. The full event catalog (parameters + trigger conditions) is in [LOGGED-EVENTS.md](LOGGED-EVENTS.md) — keep it in sync when adding/removing events. `?logMonitor=true` opens an in-page sidebar via `@concord-consortium/log-monitor` for previewing events during development.

## Conventions worth knowing

- `src/temperature-scale.js` is used by **both** the runtime (color→temp via `invertedTemperatureScale`) and the offline scripts in `scripts/` that generate `sea-surface-temp-img/*.png`. If you change the scale, regenerate the PNGs — the README spells out the exact commands.
- Wind data lives in `wind-data-json/{dec,mar,jun,sep}-simple.json` and is imported statically into `SimulationModel`. To regenerate from NetCDF, use `scripts/convert-wind-data.js` (requires `brew install netcdf`).
- The codebase still uses MobX class decorators (`@observable`, `@computed`, `@action`) plus `makeObservable(this)` in constructors — this is the MobX 6 idiom, keep it consistent.
- ESLint config ([eslint.config.mjs](eslint.config.mjs)) is mostly lenient (migrated from TSLint) — `@typescript-eslint/no-explicit-any`, `ban-ts-comment`, and several others are off. `no-console` / `no-debugger` are only errors under `LINT_BUILD=1` (CI build), so local lint won't catch leftover logs.
- Tests live next to source as `*.test.ts(x)`. Jest config is inline in [package.json](package.json) — `jsdom` env, `ts-jest`, asset mocks under `__mocks__/`, and an explicit `transformIgnorePatterns` allow-list for ESM-only packages (`d3-*`, `screenfull`, `react-leaflet`, etc.). Add new ESM deps to that list if Jest complains.
- Cypress e2e specs are under `cypress/e2e/`. They share `package.json` but are excluded from Jest via `testPathIgnorePatterns`.
