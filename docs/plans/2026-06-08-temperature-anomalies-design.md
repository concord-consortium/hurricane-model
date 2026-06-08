# Sea-Surface-Temperature Anomalies — Design

Date: 2026-06-08
Branch: `hurr-14-temperature-anomalies`

## Goal

Let users raise or lower the sea-surface temperature of four ocean regions by
±3 °C (1 °C steps). The four regions are **Gulf**, **Caribbean**,
**Central Atlantic**, and **Coastal Africa**, with boundaries defined by the
GeoJSON in `src/data/regions/*.json`.

The temperature change must:
- feed the simulation (hurricane intensity, thermometer readouts, markers),
- be settable via URL param and authorable in LARA,
- be saved/restored as part of interactive state,
- be adjustable from a left-panel section and from controls drawn on the map,
- color the regions on the map while in the `seaSurfaceTemperatures` setup mode.

Patching the SST PNG map overlay to reflect anomalies is **explicitly deferred**
to a follow-up task (see "Deferred").

## Decisions

- **URL param form:** a single JSON object,
  `?temperatureAnomalies={"gulf":2,"caribbean":-1}`. This is auto-parsed by
  `config.ts` (same path as `pressureSystems`, `initialBounds`) and maps 1:1 to
  the model's observable map.
- **Units / granularity:** ±3 °C, 1 °C per button click, clamped to `[-3, 3]`.
  Status displays `-X°C` / `Baseline` / `+X°C`.
- **Storage policy:** always store the value for every region (including 0); do
  not delete-on-zero.
- **Region fill opacity on the map:** `0.6`.
- **Overlay patching:** deferred to a separate task.

## 1. Region registry (single source of truth)

`src/types.ts` gains the key union:

```ts
export type NamedRegion = "gulf" | "caribbean" | "centralAtlantic" | "coastalAfrica";
```

New `src/utils/regions.ts`:

```ts
import { Region, createRegion } from "./region";
import { NamedRegion } from "../types";
// + the four src/data/regions/*.json imports

export interface NamedRegionData {
  label: string;              // "Gulf", "Caribbean", "Central Atlantic", "Coastal Africa"
  anchor: [number, number];   // [lat, lng] where the in-map control is centered
  region: Region;             // createRegion(<geojson>)
}

export const temperatureAnomalyRegions: Record<NamedRegion, NamedRegionData> = {
  gulf:            { label: "Gulf",             anchor: [/* lat, lng */], region: createRegion(gulfData) },
  caribbean:       { label: "Caribbean",        anchor: [/* lat, lng */], region: createRegion(caribbeanData) },
  centralAtlantic: { label: "Central Atlantic", anchor: [/* lat, lng */], region: createRegion(centralAtlanticData) },
  coastalAfrica:   { label: "Coastal Africa",   anchor: [/* lat, lng */], region: createRegion(coastalAfricaData) },
};
```

The record key (the `NamedRegion`) is the canonical identifier used by config,
the model map, and interactive state. The `anchor` is a hand-picked
`[lat, lng]` inside each (possibly concave) region so the floating control sits
sensibly — chosen over a computed centroid to avoid the centroid landing outside
the Caribbean shape and to avoid adding a `@turf/centroid` dependency.

Iteration elsewhere uses `Object.keys(temperatureAnomalyRegions) as NamedRegion[]`.

## 2. Model — `SimulationModel.temperatureAnomalies`

In `src/models/simulation.ts`:

- `@observable public temperatureAnomalies = observable.map<NamedRegion, number>()`.
- `public temperatureAnomalyAt(key: NamedRegion): number` → `this.temperatureAnomalies.get(key) ?? 0`.
- `@action.bound public adjustTemperatureAnomaly(key: NamedRegion, delta: number)`
  → write `clamp(current + delta, -3, 3)` (always stores, including 0).
- Constructor seeds the map from `config.temperatureAnomalies` (plain object →
  entries), defaulting every region to 0 so all four are always present.
- `seaSurfaceTempAt(position)` ([simulation.ts:577]): after computing the base
  temperature, if it is non-null, add the anomalies of every region that both
  (a) has a non-zero anomaly and (b) contains the position:

  ```ts
  let temp = invertedTemperatureScale(color); // base
  for (const key of Object.keys(temperatureAnomalyRegions) as NamedRegion[]) {
    const anomaly = this.temperatureAnomalyAt(key);
    if (anomaly !== 0 && isInsideRegion(position, temperatureAnomalyRegions[key].region)) {
      temp += anomaly;
    }
  }
  return temp;
  ```

  The `anomaly !== 0` guard short-circuits the point-in-polygon test for
  unmodified regions. Regions don't overlap in practice, but summing is safe.

Because `seaSurfaceTempAt` is the single read point for sea-surface temperature
(hurricane intensity step at simulation.ts:320, thermometer hover/click in
map-view.tsx, hurricane-marker.tsx, thermometer-marker.tsx), this is the only
simulation change required.

## 3. Config / URL params / authoring

- Add `temperatureAnomalies: {}` to `DEFAULT_CONFIG` in `src/config.ts`. The
  existing `isJSON` branch parses the object form automatically.
- Add one `KNOWN_PARAMETERS` entry in
  `src/utils/parse-authored-params.ts` documenting `temperatureAnomalies`
  (JSON object of region key → number in `-3..3`) so it is authorable and
  validated.

## 4. Interactive state (save / restore)

- Add `temperatureAnomalies: Record<string, number>` to `ISimulationState`
  (`src/types/interactive-state.ts`), optional for backward compatibility.
- `getInteractiveState`: `temperatureAnomalies: toJS(simulation.temperatureAnomalies)`
  — an unconditional read, per the file's MobX-reaction warning.
- `setInteractiveState`: `simulation.temperatureAnomalies.replace(simState.temperatureAnomalies ?? {})`.
- `CURRENT_VERSION` stays `1`; absence of the field restores to defaults (all
  zeros). No migration step needed.

## 5. Reusable control component

New `RegionTemperatureControl` (mobx `observer`):

- Props: `regionKey: NamedRegion` and `variant: "panel" | "map"`.
- Layout, left→right: **label** — **minus button** — **status** — **plus button**.
- Status text: `-X°C` / `Baseline` / `+X°C` from `temperatureAnomalyAt(regionKey)`.
- Buttons are real `<button>` elements with `aria-label`s
  (e.g. "Decrease Gulf temperature"), using
  `temp-decrease-button[-hover].svg` / `temp-increase-button[-hover].svg` for
  styling, disabled at the −3 / +3 clamp.
- `variant` switches styling between the left-panel row and the floating map
  control; behavior is identical. Used in both placements (section + map).

## 6. Left-panel section

`src/components/left-panel/sea-surface-temperatures-section.tsx`: render one
`RegionTemperatureControl variant="panel"` per entry of
`temperatureAnomalyRegions`. Update the hint text from "±5°F" to "±3°C".

## 7. Map rendering (`seaSurfaceTemperatures` setup mode)

In `src/components/map-view.tsx`, when `ui.setupMode === "seaSurfaceTemperatures"`,
for each region render:

- a `PolygonRegion` whose fill comes from a d3 color ramp evaluated at that
  region's anomaly, with `fillOpacity: 0.6`:

  ```ts
  import { scaleLinear } from "d3-scale";
  import { interpolateRgb } from "d3-interpolate";
  const anomalyColor = scaleLinear<string>()
    .domain([-3, 0, 3])
    .range(["#2255cc", "#ffffff", "#c62828"])
    .interpolate(interpolateRgb);
  ```

- a `LeafletCustomMarker` at the region's `anchor` hosting
  `RegionTemperatureControl variant="map"`.

(`d3-scale` is a direct dependency; `d3-interpolate` is already present.)

## 8. Deferred — SST overlay patching

Recoloring the SST PNG `ImageOverlay` (map-view.tsx:163) to reflect anomalies is
a separate follow-up task (precompute + cache per region/anomaly). `seaSurfaceTempAt`
is left as the clean seam for that work to reuse the same per-region math. Add a
code comment near the overlay noting it is not yet anomaly-aware.

## Testing

- `simulation.test.ts`: `temperatureAnomalyAt` defaults to 0; `adjustTemperatureAnomaly`
  clamps to `[-3, 3]`; `seaSurfaceTempAt` shifts by the anomaly inside a region and is
  unaffected outside, and is unaffected by a zero anomaly.
- `interactive-state.test.ts`: round-trip save/restore of anomalies; state missing the
  field restores to defaults.
- `regions.test.ts`: registry loads all four regions; `isInsideRegion` sanity per region.
- `RegionTemperatureControl` component test: status text and clamp-disable behavior.

## Out of scope / non-goals

- SST overlay PNG recoloring (deferred, above).
- Changing the temperature scale or regenerating SST images.
- Any new region beyond the four listed.
