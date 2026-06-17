# SST Anomaly Feathering Design

Date: 2026-06-16
Branch: `hurr-14-temperature-anomalies`

## Problem

The SST anomaly visualization ([2026-06-15-sst-anomaly-visualization-design.md](2026-06-15-sst-anomaly-visualization-design.md))
recolors the map where a region's anomaly is active. The anomaly is a **hard step**: full
inside the drawn polygon, zero outside (`totalAnomalyAt`, [src/models/simulation.ts:638](../../src/models/simulation.ts#L638)).
That produces a hard color seam at region edges — artifact #2 of the original design, accepted "for now."
It is not acceptable. We need to **feather** the edges so the anomaly ramps smoothly across the boundary.

The original design anticipated this: feathering "becomes a localized change" in `totalAnomalyAt`,
as `anomaly × weight(distanceToBoundary)`, keeping physics and visual in lockstep.

## Decisions

- **Scope: unified (physics + visual).** Feathering lives in `totalAnomalyAt`, which both the
  physics (`seaSurfaceTempAt`) and the recolor util (`getTempDelta`, [src/models/sst-overlay.ts:136](../../src/models/sst-overlay.ts#L136))
  already call. One change feathers both → "what you see is what the storm feels," guaranteed by construction.
- **Band geometry: straddle the boundary.** Weight is 1.0 a half-width *inside*, 0.5 *on* the drawn
  edge, 0 a half-width *outside*. The drawn polygon is the half-strength contour. Symmetric; gives
  the smoothest hand-off between adjacent regions.
- **Curve: smoothstep (cubic).** `3t² − 2t³` — zero slope at both ends of the band, so the ramp eases
  into full-strength and into zero with no kink (the seam we're removing).
- **Distance: on-the-fly planar signed distance.** A cheap point-to-segment distance to the region
  ring (lng scaled by `cos(lat)` for rough isotropy), *not* turf's great-circle `nearestPointOnLine`.

### Why planar, not turf — and why not precompute (yet)

Measured cost to process the full 4-region bounding box of the 2048×2048 SST image (~81k pixels):

| Approach | Full-bbox cost |
| --- | --- |
| On-the-fly, turf `nearestPointOnLine` | ~18,000 ms ☠️ (freezes UI; debounce can't hide a blocking loop) |
| On-the-fly, planar point-to-segment | ~80 ms ✅ |
| turf `booleanPointInPolygon` only (sign) | ~44 ms (today's baseline) |

The slowness that motivated a precomputed signed-distance field came **entirely from turf's
great-circle math**, ~400× slower than a plain point-to-segment. With planar distance, on-the-fly is
~125 ms per debounced regeneration (80 ms distance + 44 ms PIP for the sign) — inside the 150 ms debounce.

Planar distance is an approximation (treats ~1° as locally planar). That is fine here: the band width
is a soft visual choice, not a physical measurement, and physics + visual call the **same** function,
so they never diverge.

**Fallback (documented, not built):** a precomputed per-region signed-distance field (regions are
static) makes runtime an O(1) array read. Revisit only if a wider band or larger image makes on-the-fly
too slow. It costs a field builder, raster memory, and a second sampling path (bilinear interp for
physics) that must be kept consistent with the visual — the divergence risk we otherwise avoid for free.

## Components

### 1. `signedDistanceToRegion(coords, region)` — [src/utils/region.ts](../../src/utils/region.ts)

- Minimum **planar** point-to-segment distance from `coords` to the region ring, lng scaled by
  `cos(lat)`. Units ≈ degrees-of-latitude (~111 km/°).
- Sign from the existing `isInsideRegion` (turf PIP): **positive inside, negative outside**. Reuses the
  containment test physics already trusts.

### 2. `featherWeight(signedDist, halfWidth)` — [src/utils/region.ts](../../src/utils/region.ts)

```
s = clamp((signedDist + halfWidth) / (2 · halfWidth), 0, 1)
return s · s · (3 − 2s)   // smoothstep
```

→ 1.0 at `+halfWidth` (inside), 0.5 at `0` (on edge), 0 at `−halfWidth` (outside).

### 3. Constant — [src/models/constants.ts](../../src/models/constants.ts)

`temperatureAnomalyFeatherHalfWidth = 1.0` (degrees ≈ 110 km → ~2°/220 km total band). Single tunable;
retune after seeing it on the map.

### 4. Rewrite `totalAnomalyAt` — [src/models/simulation.ts:638](../../src/models/simulation.ts#L638)

```
let total = 0
for (const key of namedRegions) {
  const anomaly = temperatureAnomalyAt(key)
  if (anomaly === 0) continue
  const d = signedDistanceToRegion(coords, region)
  const w = featherWeight(d, temperatureAnomalyFeatherHalfWidth)
  if (w > 0) total += anomaly * w
}
return total
```

Overlapping bands sum naturally — same overlap semantics as today, just weighted.

### 5. Expand the recolor bbox — [src/utils/recolor-sst.ts:21](../../src/utils/recolor-sst.ts#L21)

Pad the lat/lng extents by `halfWidth` **before** projecting in `pixelBoundingBox`. Straddling means
pixels *outside* each polygon (within the band) now get a nonzero delta and must be visited. The
`delta === 0` early-continue still skips everything beyond the band, so non-band pixels stay free.

## Data flow (unchanged shape)

```
season / scale / anomaly change
        │  (debounced reaction, sst-overlay.ts)
        ▼
recolor-sst (per-pixel over padded region bboxes)
        │  getTempDelta = totalAnomalyAt  ── signedDistanceToRegion → featherWeight
        ▼
   canvas.toDataURL  ──►  ImageOverlay url
physics: seaSurfaceTempAt ── totalAnomalyAt (same path) ──► storm response
```

## Testing

- `signedDistanceToRegion`: positive inside, negative outside, ~0 on the edge, monotonic moving away.
- `featherWeight`: 1.0 / 0.5 / 0.0 at `+halfWidth` / `0` / `−halfWidth`.
- `totalAnomalyAt`: full anomaly deep inside, ~half on the edge, 0 beyond the band, summed in band overlap.
- recolor: a pixel just *outside* the polygon but within the band gets recolored (proves bbox padding);
  pixels beyond the band unchanged; land stays transparent.
- The existing physics-vs-recolor consistency test keeps holding for free (both go through `totalAnomalyAt`).

## Supersedes

Resolves accepted artifact #2 ("Hard region-edge seams") in
[2026-06-15-sst-anomaly-visualization-design.md](2026-06-15-sst-anomaly-visualization-design.md).
Artifacts #1 (32°C saturation) and #3 (transparent land) still stand.
