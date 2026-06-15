# SST Anomaly Visualization Design

Date: 2026-06-15
Branch: `hurr-14-temperature-anomalies`

## Problem

Per-region sea-surface-temperature (SST) anomalies already affect the **physics**: `seaSurfaceTempAt()` adds each region's anomaly to the sampled temperature before the hurricane uses it ([src/models/simulation.ts:585-624](../../src/models/simulation.ts#L585-L624)). But they are **not reflected visually**. The map draws a static per-season PNG via a Leaflet `ImageOverlay` ([src/components/map-view.tsx:175-183](../../src/components/map-view.tsx#L175-L183)); anomalies only appear as colored region polygons in setup mode. When a student warms the Gulf, the storm responds but the SST colors don't change.

Goal: make the rendered SST map visually reflect active anomalies, as a **seamless recolor** — warmer water simply looks warmer on the same temperature→color scale, staying consistent with the SST legend and the physics.

## Key facts that shape the design

- The color scale is bidirectional and precomputed (O(1) both ways): `temperatureScale(temp, scaleName)` → color and `invertedTemperatureScale(color, scaleName)` → temp, both in [src/temperature-scale.js](../../src/temperature-scale.js). Max temp 32°C.
- The **visible** image is chosen by scale name: `getVisibleSeaSurfaceTempImgUrl(season)` → `sstImages[sstScaleName][season]` ([src/models/ui.ts:154-156](../../src/models/ui.ts#L154-L156)). When the accessible scale is on, this is a *different* PNG than the one physics parses (`seaSurfaceTempData`, always the default-scale per-season image). The recolor must operate on the visible image with its own scale.
- Pixels → lat/lng uses `CRS.EPSG3857` ([src/models/simulation.ts:592-595](../../src/models/simulation.ts#L592-L595)); land is alpha 0.
- Regions are GeoJSON polygons with an `isInsideRegion(latLng, region)` test ([src/utils/regions.ts](../../src/utils/regions.ts)).

## Approach: single regenerated overlay

When any anomaly is nonzero, build a recolored copy of the **visible** SST image and feed its `toDataURL` to the existing `ImageOverlay`. When all anomalies are zero, fall back to the current static URL unchanged.

**Why not a second overlay layer:** a second, partially-transparent anomaly layer drawn over the 0.8-opacity base SST layer would double-blend and produce colors that don't correspond to any real temperature on the scale — contradicting both the legend and the physics. A truthful overlay would have to be drawn opaquely with scale-correct colors, at which point it is just this approach scoped to region boxes. One overlay, one opacity, no blend artifacts.

## Components

### 1. Shared anomaly-contribution helper (`totalAnomalyAt`)

Extract the per-position anomaly summation currently inlined in `seaSurfaceTempAt` ([src/models/simulation.ts:613-621](../../src/models/simulation.ts#L613-L621)) into a single method:

```
totalAnomalyAt(latLng): number   // sum of anomalies for all regions containing latLng
```

- `seaSurfaceTempAt` is refactored to call it.
- The recolor util calls it per pixel (converting pixel → lat/lng, which it does anyway for the inside-region test).
- **Today** it returns the hard step (full anomaly inside a region, 0 outside).
- **Future edge-smoothing** becomes a localized change here — e.g. `anomaly × weight(distanceToBoundary)` — and physics + visual stay consistent automatically. It also leaves room to feather only the visual if desired, still as a one-place change.

This is the safeguard against hard region edges being expensive to fix later.

### 2. Recolor util (`src/utils/recolor-sst.ts`)

Inputs: parsed visible PNG, visible scale name, anomalies (or the `totalAnomalyAt` helper).

For each region with a nonzero anomaly, compute its polygon's pixel-space bounding box (same `CRS.EPSG3857` math as `seaSurfaceTempAt`). Iterate only those bbox pixels; for opaque pixels with a nonzero contribution:

```
temp  = invertedTemperatureScale(rgb, scale)
temp += totalAnomalyAt(pixelLatLng)
rgb'  = temperatureScale(temp, scale)   // saturates at 32°C
write rgb'
```

All other pixels are copied unchanged. Output a canvas `toDataURL`. Work is bounded by the region bounding boxes; color lookups are O(1), so it is interactive.

### 3. Wiring

- Parse the **visible** PNG (reuse the existing pngjs path; needed separately from the physics PNG because the visible scale can differ).
- A debounced MobX `reaction` regenerates the dataURL when **season**, **sstScaleName** (accessible toggle), or **any anomaly** changes. Debounce so rapid +/- clicks coalesce into one regeneration.
- `map-view.tsx` reads the recolored URL when anomalies are active, else the static URL.

## Data flow

```
season / scale / anomaly change
        │  (debounced reaction)
        ▼
parse visible PNG ──► recolor-sst (per-pixel, region bboxes, uses totalAnomalyAt)
        │
        ▼
   canvas.toDataURL  ──►  ImageOverlay url   (single layer, existing opacity)
```

## Accepted visual artifacts

1. **32°C saturation.** The scale caps at 32°C, so a region pushed above 32 saturates visually while physics keeps the higher value. Accepted — minor and expected.
2. **Hard region-edge seams.** The anomaly is a step function at borders, so a hard color seam at region edges is inherent. Accepted for now; the `totalAnomalyAt` helper keeps smoothing cheap to add later if it looks bad.
3. **Land** (alpha 0) pixels are left transparent.

## Testing

- Unit-test `recolor-sst` with a small synthetic PNG: pixels inside a region shift by the expected color, pixels outside are unchanged, land stays transparent, and a non-default scale name is honored.
- Unit-test `totalAnomalyAt`: correct sum for points inside/outside/overlapping regions.
- A consistency test asserting physics (`seaSurfaceTempAt`) and the recolor agree on the anomaly contribution at a given point — so future feathering keeps them in lockstep.
- A check that the overlay falls back to the static URL when all anomalies are zero.
