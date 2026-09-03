# Run Letters Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Label each run with a letter (A–F), shown at the end of its track on the map and in the RunCard's `runLabel` slot.

**Architecture:** Letters derive from a run's index in `RunsModel.runs`, so deleting an earlier run shifts the rest automatically and nothing new gets persisted. On the map, `RunTracks` — which already owns the `hoveredRunId` state shared by the track polylines — grows to also render a `RunTrackLabel` marker for every *complete* run, the selected one included (its polyline still comes from `HurricaneTrack`). Incomplete runs get no label.

**Tech Stack:** TypeScript, React, MobX (class decorators + `makeObservable`), react-leaflet, SCSS modules, Jest + @testing-library/react.

**Background reading before starting:**
- Design doc: `docs/plans/2026-09-03-run-letters-design.md`
- `CLAUDE.md` — MobX 6 decorator idiom, test layout, lint commands
- `src/models/runs.ts`, `src/components/run-tracks.tsx`, `src/components/leaflet-custom-marker.tsx`

**Conventions to respect:**
- Comments only where the *why* is non-obvious. Do not narrate what the code plainly says.
- No `!important` in CSS.
- Named constants over magic numbers in TSX.
- All new components take an `IProps` interface.

---

### Task 1: `runLetter` on RunsModel

**Files:**
- Modify: `src/models/runs.ts`
- Test: `src/models/runs.test.ts`

**Step 1: Write the failing tests**

Append inside the top-level `describe` in `src/models/runs.test.ts`:

```ts
  describe("runLetter", () => {
    it("letters runs in order starting at A", () => {
      const runs = new RunsModel(simulation, ui);
      completeCurrentRun(simulation);
      runs.addRun();
      expect(runs.runLetter(runs.runs[0])).toBe("A");
      expect(runs.runLetter(runs.runs[1])).toBe("B");
    });

    it("shifts later letters down when an earlier run is deleted", () => {
      const runs = new RunsModel(simulation, ui);
      completeCurrentRun(simulation);
      runs.addRun();
      const second = runs.runs[1];
      expect(runs.runLetter(second)).toBe("B");

      runs.deleteRun(runs.runs[0].id);

      expect(runs.runs[0]).toBe(second);
      expect(runs.runLetter(second)).toBe("A");
    });
  });
```

Read the existing `src/models/runs.test.ts` first: reuse whatever it already has for
constructing a `RunsModel` and for marking the live simulation complete (there is an
existing helper or inline pattern — match it rather than inventing `completeCurrentRun`
if a different name is already in use, and adjust the two snippets above accordingly).

**Step 2: Run the tests to verify they fail**

Run: `npx jest src/models/runs.test.ts -t "runLetter"`
Expected: FAIL — `runs.runLetter is not a function`.

**Step 3: Write the implementation**

In `src/models/runs.ts`, add after `isRunComplete`:

```ts
  public runLetter(run: IRunState): string {
    return String.fromCharCode(firstRunLetterCharCode + this.runs.indexOf(run));
  }
```

and next to `export const maxRuns = 6;` at the top of the file:

```ts
// Runs are lettered A onwards; maxRuns keeps them inside A–F.
const firstRunLetterCharCode = 65;
```

**Step 4: Run the tests to verify they pass**

Run: `npx jest src/models/runs.test.ts`
Expected: PASS, including the pre-existing tests.

**Step 5: Commit**

```bash
git add src/models/runs.ts src/models/runs.test.ts
```
```bash
git commit -m "Add runLetter to RunsModel."
```

---

### Task 2: Show the letter in the RunCard

**Files:**
- Modify: `src/components/left-panel/run-card/run-card.tsx:26`, `:86`, `:92`
- Modify: `src/components/left-panel/run-card/run-card.scss:47-53`
- Test: `src/components/left-panel/run-card/run-card.test.tsx:96-104`

**Step 1: Update the existing label test and add a shift test**

Replace the `"labels each panel by its run number"` test with:

```tsx
  it("labels each panel by its run letter", () => {
    completeCurrentRun(stores);
    stores.runs.addRun();
    renderPanels(stores);

    const panels = screen.getAllByTestId("run-card");
    expect(panels[0]).toHaveAttribute("aria-label", "Run A");
    expect(panels[1]).toHaveAttribute("aria-label", "Run B, Not run yet - editable");
    expect(screen.getAllByTestId("run-label").map(label => label.textContent)).toEqual(["A", "B"]);
  });

  it("shifts the letters down when an earlier run is deleted", () => {
    completeCurrentRun(stores);
    stores.runs.addRun();
    renderPanels(stores);

    act(() => { stores.runs.deleteRun(stores.runs.runs[0].id); });
    expect(screen.getAllByTestId("run-label").map(label => label.textContent)).toEqual(["A"]);
  });
```

`act` is already imported in this file.

**Step 2: Run the tests to verify they fail**

Run: `npx jest src/components/left-panel/run-card/run-card.test.tsx -t "letter"`
Expected: FAIL — `aria-label` is still `"Run 1"` and there is no `run-label` test id.

**Step 3: Write the implementation**

In `run-card.tsx`, replace line 26:

```tsx
  const letter = runs.runLetter(run);
```

replace the `aria-label` on line 86:

```tsx
        aria-label={`Run ${letter}${labelStatusMessage}`}
```

and replace the empty label div on line 92:

```tsx
          <div className={css.runLabel} data-test="run-label">{letter}</div>
```

In `run-card.scss`, extend `.runLabel` (lines 47–53) so the letter is centered:

```scss
      .runLabel {
        align-items: center;
        background-color: #ccc;
        border-radius: 5px;
        display: flex;
        font-family: $mainFont;
        font-size: 18px;
        font-weight: bold;
        height: 28px;
        justify-content: center;
        width: 28px;
      }
```

**Step 4: Run the tests to verify they pass**

Run: `npx jest src/components/left-panel/run-card/run-card.test.tsx`
Expected: PASS, all tests in the file.

**Step 5: Commit**

```bash
git add src/components/left-panel/run-card/run-card.tsx src/components/left-panel/run-card/run-card.scss src/components/left-panel/run-card/run-card.test.tsx
```
```bash
git commit -m "Show the run letter in the run card."
```

---

### Task 3: `zIndexOffset` pass-through on LeafletCustomMarker

Track ends can overlap (duplicated runs diverge late), so the selected run's label has to
draw above the others. Leaflet stacks markers by latitude unless given a `zIndexOffset`,
and `LeafletCustomMarker` does not currently forward one.

**Files:**
- Modify: `src/components/leaflet-custom-marker.tsx:9-16`, `:45-57`

**Step 1: Add the prop**

In the `IProps` interface, after `draggable?: boolean;`:

```tsx
  zIndexOffset?: number;
```

**Step 2: Forward it to the Marker**

Add `zIndexOffset` to the destructure on line 28:

```tsx
    const { children, position, onDrag, onDragEnd, draggable, zIndexOffset } = this.props;
```

and to the `<Marker>` element, after `draggable={draggable}`:

```tsx
          zIndexOffset={zIndexOffset}
```

**Step 3: Verify nothing regressed**

Run: `npx jest src/components`
Expected: PASS — this is a purely additive optional prop, so every existing component test
still passes.

**Step 4: Commit**

```bash
git add src/components/leaflet-custom-marker.tsx
```
```bash
git commit -m "Let LeafletCustomMarker take a zIndexOffset."
```

---

### Task 4: The `RunTrackLabel` component

A presentational component only — `RunTracks` owns the state and the handlers. The selected
run's label is passed no handlers at all, because re-selecting it is already a no-op.

**Files:**
- Create: `src/components/run-track-label.tsx`
- Create: `src/components/run-track-label.scss`

**Step 1: Write the component**

`src/components/run-track-label.tsx`:

```tsx
import { clsx } from "clsx";
import React from "react";

import { ICoordinates } from "../types";
import { LeafletCustomMarker } from "./leaflet-custom-marker";

import css from "./run-track-label.scss";

// Leaflet stacks markers by latitude, so the selected label needs an offset larger than any
// pixel position on the map to be sure of drawing above the other labels.
const selectedZIndexOffset = 1000000;

interface IProps {
  letter: string;
  position: ICoordinates;
  selected: boolean;
  hovered?: boolean;
  onSelect?: () => void;
  onHoverStart?: () => void;
  onHoverEnd?: () => void;
}

export function RunTrackLabel({
  letter, position, selected, hovered, onSelect, onHoverStart, onHoverEnd
}: IProps) {
  return (
    <LeafletCustomMarker position={position} zIndexOffset={selected ? selectedZIndexOffset : 0}>
      <div
        className={clsx(css.runTrackLabel, { [css.selected]: selected, [css.hovered]: hovered })}
        data-test="run-track-label"
        onClick={onSelect}
        onMouseEnter={onHoverStart}
        onMouseLeave={onHoverEnd}
      >
        {letter}
      </div>
    </LeafletCustomMarker>
  );
}
```

Check `src/types.ts` for the exported name of the lat/lng type before writing the import —
`run-tracks.tsx` and `hurricane-track.tsx` both use `ICoordinates` from `"../types"`.

**Step 2: Write the styles**

`src/components/run-track-label.scss`:

```scss
@use "common" as *;

.runTrackLabel {
  align-items: center;
  background-color: #ccc;
  border: 2px solid white;
  border-radius: 5px;
  box-sizing: border-box;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.45);
  color: $charcoal;
  cursor: pointer;
  display: flex;
  font-family: $mainFont;
  font-size: 18px;
  font-weight: bold;
  height: 28px;
  justify-content: center;
  // Leaflet anchors the default 12px DivIcon 6px off-center, so the badge is pulled back
  // by half its own size less those 6px to sit on the track's end point.
  transform: translate(-8px, -8px);
  width: 28px;

  &.hovered {
    background-color: $secondaryColorHover;
  }

  &.selected {
    background-color: $secondaryColor;
    cursor: default;
  }
}
```

**Step 3: Verify it compiles and lints**

Run: `npm run lint`
Expected: no errors for the new files.

**Step 4: Commit**

```bash
git add src/components/run-track-label.tsx src/components/run-track-label.scss
```
```bash
git commit -m "Add the RunTrackLabel component."
```

---

### Task 5: Render the labels from RunTracks

**Files:**
- Modify: `src/components/run-tracks.tsx`
- Test: `src/components/run-tracks.test.tsx`

**Step 1: Write the failing tests**

`LeafletCustomMarker` renders its children through a portal that only exists after a second
render pass (it schedules a `forceUpdate` on a 1ms timeout), so every label assertion must
use an `await find*` query rather than a synchronous `get*`.

Add to `src/components/run-tracks.test.tsx`. Note the existing `renderRunTracks` helper
selects `"run-2"`, so `run-1` is the unselected one and letters are A for `run-1`, B for
`run-2`:

```tsx
  it("labels each complete run at the end of its track", async () => {
    renderRunTracks(stores);
    const labels = await screen.findAllByTestId("run-track-label");
    expect(labels.map(label => label.textContent)).toEqual(["A", "B"]);
  });

  it("marks the selected run's label as selected", async () => {
    renderRunTracks(stores);
    const labels = await screen.findAllByTestId("run-track-label");
    expect(labels[0]).not.toHaveClass("selected");
    expect(labels[1]).toHaveClass("selected");
  });

  it("does not label an incomplete run", async () => {
    const incomplete = defaultSimulationState();
    stores.runs.setRuns([finishedRun("run-1"), { id: "run-2", simulation: incomplete }], "run-1");
    render(
      <MapContainer center={[30, -45]} zoom={4}>
        <StoresContext.Provider value={stores}>
          <RunTracks />
        </StoresContext.Provider>
      </MapContainer>
    );
    const labels = await screen.findAllByTestId("run-track-label");
    expect(labels.map(label => label.textContent)).toEqual(["A"]);
  });

  it("selects a run when its label is clicked", async () => {
    renderRunTracks(stores);
    const labels = await screen.findAllByTestId("run-track-label");

    fireEvent.click(labels[0]);
    expect(stores.runs.selectedRunId).toBe("run-1");
  });

  it("highlights the track when its label is hovered", async () => {
    const { container } = renderRunTracks(stores);
    const labels = await screen.findAllByTestId("run-track-label");
    const trackColor = () =>
      container.querySelectorAll(".leaflet-unselectedTracks-pane path")[1].getAttribute("stroke");

    const unhovered = trackColor();
    fireEvent.mouseEnter(labels[0]);
    expect(trackColor()).not.toBe(unhovered);

    fireEvent.mouseLeave(labels[0]);
    expect(trackColor()).toBe(unhovered);
  });
```

Add `fireEvent` and `screen` to the existing `@testing-library/react` import at the top of
the file.

**Step 2: Run the tests to verify they fail**

Run: `npx jest src/components/run-tracks.test.tsx`
Expected: FAIL — no element with test id `run-track-label`.

**Step 3: Write the implementation**

Rewrite `src/components/run-tracks.tsx`. `selectRun` is pulled out of `eventHandlers` so the
label and the polyline share one selection path, and the labels render outside the
`unselectedTracks` pane so they land in Leaflet's marker pane, above every track:

```tsx
import { observer } from "mobx-react";
import React, { Fragment, useEffect, useState } from "react";
import { Pane, Polyline } from "react-leaflet";

import { log } from "../log";
import { IRunState } from "../types/interactive-state";
import { useStores } from "../stores-context";
import { RunTrackLabel } from "./run-track-label";

import css from "./run-tracks.scss";

const trackWeight = 5;
const borderWeight = 7;

export const RunTracks = observer(function RunTracks() {
  const { runs, simulation, ui } = useStores();
  const [hoveredRunId, setHoveredRunId] = useState<string | null>(null);

  const finishedRuns = runs.runs.filter(run => runs.isRunComplete(run));
  const unselectedFinishedRuns = finishedRuns.filter(run => !runs.isSelected(run.id));

  // Leaflet fires no mouseout for removed layers, so clear hover state when the
  // hovered run leaves the list (selection via map or panel, or deletion).
  const clearHoverId = hoveredRunId != null && !unselectedFinishedRuns.some(run => run.id === hoveredRunId);
  useEffect(() => {
    if (clearHoverId) {
      setHoveredRunId(null);
    }
  }, [clearHoverId]);

  const positions = (run: IRunState) => {
    const simulationState = runs.getSimulation(run);
    return [
      ...simulationState.hurricaneTrack.map(point => point.position),
      simulationState.hurricane.center
    ];
  };

  const selectRun = (run: IRunState) => {
    if (simulation.inProgress && !ui.isReadOnly) simulation.restart();
    runs.selectRun(run.id);
    ui.setNorthAtlanticView();
    log("RunSelected", { runId: run.id, via: "map" });
  };

  const startHover = (run: IRunState) => setHoveredRunId(run.id);
  const endHover = (run: IRunState) => setHoveredRunId(current => (current === run.id ? null : current));

  const eventHandlers = (run: IRunState) => ({
    click: () => selectRun(run),
    mouseover: () => startHover(run),
    mouseout: () => endHover(run)
  });

  return (
    <>
      {/* Above overlayPane (z 400) and below the pane holding the selected run's track (z 430) and shadowPane (z 500). */}
      <Pane name="unselectedTracks" style={{ zIndex: 410 }}>
        {unselectedFinishedRuns.map(run =>
          <Fragment key={run.id}>
            <Polyline
              positions={positions(run)}
              eventHandlers={eventHandlers(run)}
              pathOptions={{
                bubblingMouseEvents: false,
                color: css.borderColor,
                weight: borderWeight
              }}
            />
            <Polyline
              positions={positions(run)}
              eventHandlers={eventHandlers(run)}
              pathOptions={{
                bubblingMouseEvents: false,
                color: hoveredRunId === run.id ? css.trackHoverColor : css.trackColor,
                weight: trackWeight
              }}
            />
          </Fragment>
        )}
      </Pane>
      {/* The selected run's track is drawn by HurricaneTrack, but its label belongs here with the
          other labels so hovering a label and hovering a track share one piece of state. */}
      {finishedRuns.map(run => {
        const selected = runs.isSelected(run.id);
        const trackPositions = positions(run);
        return (
          <RunTrackLabel
            key={run.id}
            letter={runs.runLetter(run)}
            position={trackPositions[trackPositions.length - 1]}
            selected={selected}
            hovered={hoveredRunId === run.id}
            onSelect={selected ? undefined : () => selectRun(run)}
            onHoverStart={selected ? undefined : () => startHover(run)}
            onHoverEnd={selected ? undefined : () => endHover(run)}
          />
        );
      })}
    </>
  );
});
```

**Step 4: Run the tests to verify they pass**

Run: `npx jest src/components/run-tracks.test.tsx`
Expected: PASS, both the new tests and the two pre-existing pane tests.

If the `find*` queries time out, the portal is the cause — confirm by checking that the
`leaflet-marker-pane` exists in the container, and if `LeafletCustomMarker`'s deferred
portal genuinely never flushes under the test's timers, wrap the render in
`await waitFor(() => expect(...).toBeInTheDocument())` rather than changing the component.

**Step 5: Commit**

```bash
git add src/components/run-tracks.tsx src/components/run-tracks.test.tsx
```
```bash
git commit -m "Label run tracks with their letters on the map."
```

---

### Task 6: Full verification

**Step 1: Run the whole suite**

Run: `npm test`
Expected: PASS, no failures anywhere. `map-view.test.tsx` and any snapshot-style tests that
touch `RunTracks` are the likely places for fallout from the fragment/pane restructure — fix
the source, not the assertion, if one breaks.

**Step 2: Lint**

Run: `npm run lint`
Expected: no errors.

**Step 3: Unused locals**

Run: `npm run lint:unused`
Expected: no errors — this catches the `runNumber` local if it was left behind in Task 2.

**Step 4: Check it in the browser**

Run: `npm start`, then confirm by eye:
- A completed run shows an orange letter at the end of its track; unselected complete runs
  show grey ones; a run that has not finished shows none.
- Hovering an unselected letter lightens it *and* darkens its track; hovering the track does
  the same to the letter.
- Clicking a letter selects that run.
- Deleting run A promotes B to A on both the map and the card.

**Step 5: Commit any fixes**

```bash
git add -A
```
```bash
git commit -m "Fix up run letter labels."
```
(Skip this step if nothing needed fixing.)
