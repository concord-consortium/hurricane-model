# Run letters design

Runs get letter labels (A–F) shown at the end of their track on the map and in the `runLabel` slot of
each RunCard. Letters follow run order, so deleting an earlier run shifts the later ones down.

## Letter source

`RunsModel` gains:

```ts
public runLetter(run: IRunState): string {
  return String.fromCharCode(65 + this.runs.indexOf(run));  // A–F; maxRuns is 6
}
```

Index-based, so the shift-on-delete behavior falls out for free. Nothing is persisted, so
`IHurricaneInteractiveState` and `migrateState()` are unchanged.

## Map labels

Hover is linked both ways — hovering either the letter or the polyline highlights both — so the label
and the polylines must share the `hoveredRunId` state that already lives in `RunTracks`. `RunTracks`
therefore renders a label for *every* complete run, including the selected one, while continuing to
render polylines only for unselected runs. The selected run's track stays in `HurricaneTrack`.
Incomplete runs get no label, which falls out of the existing `isRunComplete` filter.

A new `RunTrackLabel` component wraps a `LeafletCustomMarker`, positioned at the last position of
`positions(run)`, around a div holding the letter. Unselected labels get the same click / mouseover /
mouseout handlers as the polylines; the selected label gets none, since re-selecting is already a
no-op.

`LeafletCustomMarker` gains an optional `zIndexOffset` pass-through so the selected label draws above
the others where track ends overlap.

## Styling

`run-track-label.scss`: 28px rounded square matching the card's `runLabel`, 2px white border, drop
shadow, bold `$mainFont` letter in `$charcoal`. Background `#ccc` unselected, `$secondaryColorHover`
on hover, `$secondaryColor` selected. Centered on the point with `transform: translate(-8px, -8px)` —
Leaflet's default `DivIcon` anchors a 12px icon, so 28/2 − 6 = 8.

## Run card

`runLabel` renders the letter, flex-centered. The card's `aria-label` becomes `Run A` rather than
`Run 1`, and the `runNumber` local goes away.

## Testing

- `run-card.test.tsx` — renders the letter; it shifts after an earlier run is deleted.
- `run-tracks.test.tsx` — a label renders only for complete runs; the selected run gets a label but
  no polyline; clicking a label selects the run; hovering a label changes its polyline color.
