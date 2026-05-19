# Storm placement region — design

**Branch:** `hurr-11-storm-placement`
**Date:** 2026-05-19

## Problem

During the Setup → Storm Location step, the user needs to place the hurricane somewhere reasonable (the Atlantic basin where Atlantic hurricanes actually form). Today the hurricane marker is non-interactive (`draggable={false}` in [src/components/hurricane-marker.tsx:25](../../src/components/hurricane-marker.tsx#L25)) and there is no visible affordance for the "valid placement area."

We have a GeoJSON `LineString` whose coordinates trace a closed loop around the Atlantic basin. We need to:

1. Display that region on the map while the user is in the Storm Location setup section.
2. Make the hurricane marker draggable in that mode, and clamp any dragged coordinate that falls outside the region to the nearest point on its boundary — live during the drag, not just at the end.

## Decisions (from brainstorming)

| Question | Decision |
|---|---|
| Region shape | Treat the coordinates as a **Polygon** (closed ring). |
| Clamp semantics | **Nearest point on the boundary.** |
| Drag UX | **Live clamping during drag** (clamp on every `drag` event). |
| Display | **Outline + faint fill, visible only while `ui.setupMode === "stormLocation"`.** |
| Data source | **Static JSON file** in `src/assets/`. |
| Geometry impl | **Turf** (`@turf/boolean-point-in-polygon` + `@turf/nearest-point-on-line`). |
| Drag wiring | **Included in this task** — enable `draggable` on the hurricane marker during setup mode. |

## Architecture

Four new pieces, all small:

```
src/
  assets/
    storm-placement-region.json   (new) GeoJSON FeatureCollection
  utils/
    storm-placement-region.ts     (new) isInside / clamp helpers + Leaflet-ready coords
  components/
    storm-placement-region.tsx    (new) react-leaflet <Polygon> overlay
    hurricane-marker.tsx          (edit) draggable in setup mode, clamp on drag
    map-view.tsx                  (edit) render the overlay
```

Data flow on drag:

```
user drags marker
   → Leaflet "drag" event fires with the raw latlng
   → handleDrag() calls clampToStormPlacementRegion(latlng)
   → if clamped !== raw, marker.setLatLng(clamped) so the marker visually
     tracks the boundary instead of going off into the ocean
   → on "dragend", simulation.setStartLocation(clamped) commits the position
     through the existing state path
```

The overlay polygon is rendered inside the existing `<MapContainer>` and gated on `ui.setupMode === "stormLocation"`.

## Data file: `src/assets/storm-placement-region.json`

The provided GeoJSON, with two cleanups:

- The pair `[-77.635728, 33.841221]` appears twice in a row (indices 7 and 8). Drop the duplicate.
- The ring does not explicitly close. Append the first coordinate as the last so the polygon is a valid closed ring (Turf requires this).

The file is imported via webpack's built-in JSON loader — no config changes.

## Utility: `src/utils/storm-placement-region.ts`

```ts
import { point, polygon as turfPolygon, lineString } from "@turf/helpers";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import nearestPointOnLine from "@turf/nearest-point-on-line";
import regionData from "../assets/storm-placement-region.json";

// Coordinates are [lng, lat] per GeoJSON; ring is closed (first === last).
const ring = regionData.features[0].geometry.coordinates as Array<[number, number]>;
const stormRegionPolygon = turfPolygon([ring]);
const stormRegionRing = lineString(ring);

// Leaflet uses [lat, lng]; pre-compute for the overlay component.
export const stormPlacementRegionLatLngs: Array<[number, number]> =
  ring.map(([lng, lat]) => [lat, lng]);

export function isInsideStormPlacementRegion(latLng: { lat: number; lng: number }): boolean {
  return booleanPointInPolygon(point([latLng.lng, latLng.lat]), stormRegionPolygon);
}

export function clampToStormPlacementRegion(
  latLng: { lat: number; lng: number }
): { lat: number; lng: number } {
  if (isInsideStormPlacementRegion(latLng)) return latLng;
  const snapped = nearestPointOnLine(stormRegionRing, point([latLng.lng, latLng.lat]));
  const [lng, lat] = snapped.geometry.coordinates;
  return { lat, lng };
}
```

New dependencies: `@turf/boolean-point-in-polygon`, `@turf/nearest-point-on-line`.

## Overlay: `src/components/storm-placement-region.tsx`

Functional `observer` component:

```tsx
import { observer } from "mobx-react";
import { Polygon } from "react-leaflet";
import { useStores } from "./base";   // or inject() — match existing patterns
import { stormPlacementRegionLatLngs } from "../utils/storm-placement-region";

const pathOptions = {
  color: "#<accent>",     // pick from common.scss to match the design language
  weight: 2,
  fillColor: "#<accent>",
  fillOpacity: 0.1,
};

export const StormPlacementRegion = observer(() => {
  const { ui } = useStores();
  if (ui.setupMode !== "stormLocation") return null;
  return <Polygon positions={stormPlacementRegionLatLngs} pathOptions={pathOptions} />;
});
```

Rendered inside `<MapContainer>` in [src/components/map-view.tsx](../../src/components/map-view.tsx), alongside other layers.

## Drag wiring: `src/components/hurricane-marker.tsx`

```tsx
const { ui, simulation } = this.stores;
const draggable = ui.setupMode === "stormLocation" && !simulation.simulationStarted;

const handleDrag = (e: L.LeafletEvent) => {
  const marker = e.target as L.Marker;
  const raw = marker.getLatLng();
  const clamped = clampToStormPlacementRegion({ lat: raw.lat, lng: raw.lng });
  if (clamped.lat !== raw.lat || clamped.lng !== raw.lng) {
    marker.setLatLng(clamped);
  }
};

const handleDragEnd = (e: L.LeafletEvent) => {
  const { lat, lng } = (e.target as L.Marker).getLatLng();
  simulation.setStartLocation({ lat, lng });
};
```

Wire `draggable`, `drag`, `dragend` through whatever prop surface `LeafletCustomMarker` exposes. If it does not currently forward Leaflet event handlers, the smallest change is to add a passthrough for `eventHandlers` (react-leaflet's standard pattern). Verify before implementing — this is the one wiring detail I have not confirmed.

## Testing

**Unit — `src/utils/storm-placement-region.test.ts`** (new)

- A point clearly inside the basin returns unchanged.
- A point clearly outside snaps to a known boundary segment. Use a point well east of the eastern edge so the nearest point is unambiguously on the long eastern segment; assert the snapped point lies on that segment within a small epsilon.
- `isInsideStormPlacementRegion` returns `true` for an interior point and `false` for an exterior point.

**Component — `src/components/storm-placement-region.test.tsx`** (new)

- Renders a `<Polygon>` when `ui.setupMode === "stormLocation"`.
- Renders `null` for every other `setupMode` value (including `undefined`).

**Component — `src/components/hurricane-marker.test.tsx`** (edit)

- Marker is draggable when `setupMode === "stormLocation"` and `simulationStarted === false`.
- Marker is not draggable in any other combination.

No Cypress changes required for this slice.

## Open question / known unknown

`LeafletCustomMarker` ([src/components/leaflet-custom-marker.tsx](../../src/components/leaflet-custom-marker.tsx)) wraps Leaflet's marker in a custom way ("rendering in a pretty awkward way," per a comment in `hurricane-marker.tsx`). Before implementing the drag wiring I'll confirm whether it already forwards `draggable` and Leaflet `eventHandlers`, and if not, add minimal passthrough props. This is the only piece of the design I haven't verified in the existing code.

## Non-goals

- Editing the region itself, or making it authorable via URL params / authored state. (Static JSON only; we can revisit if authoring needs it.)
- Snapping behavior other than nearest-boundary-point (no inset, no centroid jump).
- Showing the region outside of setup mode.
- Restricting hurricane motion *during* the simulation — only the initial placement is constrained.
