# StormLocationSection lat/lng inputs — design

## Goal

Fill out `StormLocationSection` with two text inputs that read and write
`simulation.startLocation.lat` / `.lng`. The inputs stay synced with the
hurricane marker as the user drags it, and editing them moves the storm
to the chosen coordinates (snapped into the legal placement region when
needed).

## UX

- Two labeled inputs ("Latitude", "Longitude") rendered inside the
  existing `SetupSection` body. Layout: a two-column grid (label / input),
  one row per coordinate.
- `<input type="text">` — not `type="number"`. Values are displayed signed
  with 2 decimals (e.g. `25.42`, `-80.19`).
- Local React state per input holds the in-progress text. When focused or
  unfocused, the inputs stay synced with the model — including while the
  hurricane marker is being dragged on the map (a focused field updates
  too). User-typed text is only "stuck" between keystrokes; any model
  change re-syncs.
- Commit triggers: pressing **Enter** or **blurring** the field.
- **Escape** reverts local state to the current model value and blurs.
- Typing alone never mutates the model.

## Commit pipeline

For the field being committed (lat or lng):

1. `parseFloat` the local text. If `NaN` → revert silently to the model
   value.
2. Build a candidate `ICoordinates` using the parsed value for the edited
   axis and the current resolved model value for the other axis.
3. If `isInsideRegion(candidate, stormPlacementRegion)` → commit via
   `simulation.setStartLocation(candidate)`. Done.
4. Otherwise try to preserve the entered axis: find a point in the region
   with that axis fixed at the entered value, with the other axis as
   close as possible to its current value. If one exists → commit it.
5. Otherwise fall back to `clampToRegion(candidate, stormPlacementRegion)`
   and commit that.

`simulation.setStartLocation` is the same path used by drag-end, so the
existing named-location handling (pressure systems / strength) stays
unchanged — coordinate inputs always commit `ICoordinates`, not names.

## New helper: `snapToRegionPreservingAxis`

Added to [src/utils/region.ts](../../src/utils/region.ts).

```ts
function snapToRegionPreservingAxis(
  region: Region,
  axis: "lat" | "lng",
  target: number,
  preferredOther: number
): ICoordinates | null
```

Walk the polygon ring once. For each segment, check whether the segment
crosses the line `axis = target`. Each crossing yields an other-axis
value. Sorted crossings form pairs `[lo, hi]` defining valid intervals on
that line. Pick the interval-clamped value closest to `preferredOther`.
Return `null` if there are no crossings.

Pure geometry over `region.ring.geometry.coordinates`. No new
dependencies.

## Reading the current model value

The displayed values come from
`resolveStartLocation(simulation.startLocation)` so that a named location
(`"atlantic"` / `"gulf"`) still shows numeric coords until the user edits
them. The component is wrapped in `observer()` from `mobx-react` so it
re-renders on `startLocation` and `hurricane.center` changes.

(Note: drag updates `hurricane.center` continuously but only commits
`startLocation` on drag-end. The inputs reflect the live storm center
during drag, which means reading from `hurricane.center` is preferred
over `startLocation` for display.)

## Files

- [src/utils/region.ts](../../src/utils/region.ts) — add
  `snapToRegionPreservingAxis`.
- [src/utils/region.test.ts](../../src/utils/region.test.ts) — new tests
  covering: simple inside case, target lat that misses the region, target
  lat that hits a single interval, preferred-other clamped to interval
  edges.
- [src/components/left-panel/storm-location-section.tsx](../../src/components/left-panel/storm-location-section.tsx)
  — flesh out body, make `observer`.
- [src/components/left-panel/storm-location-section.scss](../../src/components/left-panel/storm-location-section.scss)
  — minimal label/input grid.
- [src/components/left-panel/storm-location-section.test.tsx](../../src/components/left-panel/storm-location-section.test.tsx)
  — tests for live-sync, enter/blur commit, escape revert,
  snap-preserving, clamp fallback.
