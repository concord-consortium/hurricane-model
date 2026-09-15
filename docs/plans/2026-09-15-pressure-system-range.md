# Wider Pressure System Ranges Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extend the strongest pressure system settings so high pressure reaches 1030 mb and low pressure reaches 990 mb, with real physics behind the change rather than a relabeling.

**Architecture:** `strength` (m/s) is the only quantity the simulation uses; the mb value shown on map markers is a label derived from it. Today one shared `[minStrength, maxStrength]` pair and one shared `mbLabelRange` serve both system types. The requested ranges are asymmetric (high spans 15 mb, low spans 20 mb), so these constants split into per-type strength and mb ranges. Each type's new strength maximum is chosen so the mb-per-m/s slope is unchanged, which means every existing preset and every saved student run keeps the label and the behavior it already had — only the top of the slider extends.

**Tech Stack:** TypeScript, React, MobX 6 (class decorators), Material-UI Slider, Jest + React Testing Library.

**Design doc:** [2026-09-15-pressure-system-range-design.md](./2026-09-15-pressure-system-range-design.md)

**The target mapping:**

| type | strength (m/s) | mb |
| --- | --- | --- |
| high | 3 → 22.6 (was 20) | 1015 → 1030 (was 1028) |
| low  | 3 → 29.2 (was 20) | 1010 → 990 (was 997)  |

The maxima look arbitrary but are not. The slider has no `step` prop, so MUI defaults to 1 and saved student strengths are the integers 3..20. 22.6 and 29.2 are the tidiest values that keep every one of those positions — and every preset — on the label it already had, while still landing exactly on 1030 and 990. The rounder 22.5 and 29 both flip strength 18 by 1 mb.

---

### Task 1: Per-type strength and mb ranges

Replace the three shared constants (`minStrength`, `maxStrength`, `mbLabelRange`) with two per-type range objects, and rewrite `strengthToMb` to interpolate between them. The `high ? … : …` branch disappears: the sign flip for lows falls out of `mbRange.low` being a descending range.

**Files:**
- Modify: `src/utils/pressure-systems.ts:6-17`
- Test: `src/utils/pressure-systems.test.ts:3-19`, `:61`

**Step 1: Write the failing tests**

Replace the `strengthToMb` describe block at `src/utils/pressure-systems.test.ts:5-19` with:

```ts
describe("strengthToMb", () => {
  it("maps high-pressure strength to 1015..1030 mb", () => {
    expect(strengthToMb("high", strengthRange.high.weak)).toBe(1015);
    expect(strengthToMb("high", strengthRange.high.strong)).toBe(1030);
    expect(strengthToMb("high", 19.5)).toBe(1028);
    expect(strengthToMb("high", 13.6)).toBe(1023);
  });

  it("maps low-pressure strength to 1010..990 mb (stronger = lower)", () => {
    expect(strengthToMb("low", strengthRange.low.weak)).toBe(1010);
    expect(strengthToMb("low", strengthRange.low.strong)).toBe(990);
    expect(strengthToMb("low", 6)).toBe(1008);
    expect(strengthToMb("low", 7)).toBe(1007);
  });

  it("keeps the old mb labels at strengths 18 and 20", () => {
    expect(strengthToMb("high", 20)).toBe(1028);
    expect(strengthToMb("low", 20)).toBe(997);
    expect(strengthToMb("high", 18)).toBe(1026);
    expect(strengthToMb("low", 18)).toBe(999);
  });
});
```

Update the import on line 3 — `minStrength` and `maxStrength` are gone:

```ts
import { pressureSystemReport, strengthRange, strengthToMb } from "./pressure-systems";
```

And line 61, which used `minStrength` on a high-pressure system:

```ts
    systems[0].strength = strengthRange.high.weak;
```

Leave the rest of `pressureReport` alone. Its expected values (`1023`, `1028`, `1008`, `1007` at lines 45-48) are deliberately unchanged — if they start failing, the slope was not preserved and the implementation is wrong.

**Step 2: Run the tests to verify they fail**

```bash
npx jest src/utils/pressure-systems.test.ts
```

Expected: FAIL — TypeScript cannot resolve `strengthRange` from `./pressure-systems`.

**Step 3: Write the implementation**

Replace `src/utils/pressure-systems.ts:6-17` with:

```ts
// Strength (m/s) -> barometric-pressure label (mb): the user-facing unit shown on the map markers.
// High pressure reads 1015..1030 mb (stronger = higher); low reads 1010..990 mb (stronger = lower).
interface IRange {
  weak: number;
  strong: number;
}

export const strengthRange: Record<PressureSystemType, IRange> = {
  high: { weak: 3, strong: 22.6 },
  low: { weak: 3, strong: 29.2 }
};

export const mbRange: Record<PressureSystemType, IRange> = {
  high: { weak: 1015, strong: 1030 },
  low: { weak: 1010, strong: 990 }
};

export function strengthToMb(type: PressureSystemType, strength: number): number {
  const strengthBounds = strengthRange[type];
  const mbBounds = mbRange[type];
  const norm = (strength - strengthBounds.weak) / (strengthBounds.strong - strengthBounds.weak);
  return Math.round(mbBounds.weak + norm * (mbBounds.strong - mbBounds.weak));
}
```

The fields are `weak`/`strong` rather than `min`/`max` because `min`/`max` cannot be truthful for both types — a low's strong end is 990, the *smaller* number. `mbRange` is exported, so a consumer writing the obvious clamp against a lying `max` would get silent nonsense. Do not add `as const` or `readonly`: no Record-typed constant in this codebase is frozen.
```

**Step 4: Run the tests to verify they pass**

```bash
npx jest src/utils/pressure-systems.test.ts
```

Expected: PASS, all describe blocks. `pressureSystemReport` in particular must still report `H1: Default, 1023 mb` / `H2: Default, 1028 mb` / `L1: Default, 1008 mb` / `L2: Default, 1007 mb`.

**Step 5: Commit**

```bash
git add src/utils/pressure-systems.ts src/utils/pressure-systems.test.ts && git commit -m "Give high and low pressure systems their own strength and mb ranges."
```

---

### Task 2: Per-type ranges in the icon component

`PressureSystemIcon` reads the shared constants in four places. Each needs the range for the model's own type. Note the low-pressure slider is inverted — dragging up means a *lower* mb value — via `strong + weak - strength`, and that inversion appears twice (rendering the value, and reading it back).

**A decision this task carries, already made — do not revisit.** One of those four call sites is `strengthNorm`, which sizes the H/L letter rather than labeling anything. Per-type ranges mean the letter tracks the slider handle: dragged to the top always looks maximal, whichever type it is. The accepted cost is that every existing system's letter renders slightly smaller than before (a default low at 15 m/s shrinks about 7%, a high about 3%), and an L and an H at the same wind speed no longer render at the same size. That shrink is intended. Do not "fix" it, and do not introduce a separate fixed reference to preserve the old sizes.

**Files:**
- Modify: `src/components/pressure-system-icon.tsx:13`, `:45`, `:80-82`, `:101-112`
- Test: `src/components/pressure-system-icon.test.tsx:6`, `:24-48`

**Step 1: Write the failing tests**

The two label tests currently set absurd strengths (`1500000`) and re-derive the expected label with a copy of the production formula — which means they would pass even if the formula were wrong. Replace lines 24-48 with tests that pin the actual new endpoints:

```ts
  it("label renders pressure in mb (high)", () => {
    const model = stores.simulation.pressureSystemsSetup[0];
    model.type = "high";
    model.setStrength(strengthRange.high.strong);
    render(
      <Provider stores={stores}>
        <PressureSystemIcon model={model}/>
      </Provider>
    );
    expect(screen.getByText("1030mb")).toBeInTheDocument();
  });

  it("label renders pressure in mb (low)", () => {
    const model = stores.simulation.pressureSystemsSetup[0];
    model.type = "low";
    model.setStrength(strengthRange.low.strong);
    render(
      <Provider stores={stores}>
        <PressureSystemIcon model={model}/>
      </Provider>
    );
    expect(screen.getByText("990mb")).toBeInTheDocument();
  });

  it("gives each pressure system type its own slider bounds", () => {
    const model = stores.simulation.pressureSystemsSetup[0];
    model.type = "low";
    model.setStrength(strengthRange.low.strong);
    render(
      <Provider stores={stores}>
        <PressureSystemIcon model={model}/>
      </Provider>
    );
    // The low slider is inverted: the strongest system sits at the top of its travel.
    const slider = screen.getByTestId("pressure-system-slider").querySelector("input");
    expect(slider).toHaveAttribute("max", String(strengthRange.low.strong));
    expect(slider).toHaveValue(String(strengthRange.low.weak));
  });
```

Update the import on line 6:

```ts
import { strengthRange } from "../utils/pressure-systems";
```

**Step 2: Run the tests to verify they fail**

```bash
npx jest src/components/pressure-system-icon.test.tsx
```

Expected: FAIL — `strengthRange` is not exported to the component yet and the rendered label still reads `1028mb` / `997mb`.

**Step 3: Write the implementation**

In `src/components/pressure-system-icon.tsx`, change the import on line 13:

```ts
import { strengthRange, strengthToMb } from "../utils/pressure-systems";
```

In `render`, replace line 45 and add the destructure the rest of the method needs:

```ts
    const { weak, strong } = strengthRange[model.type];
    const strengthNorm = (model.strength - weak) / (strong - weak) - 0.5; // [-0.5, 0.5]
```

Replace the three Slider props at lines 80-82:

```tsx
              value={model.type === "high" ? model.strength : strong + weak - model.strength}
              min={weak}
              max={strong}
```

And in `handleStrengthChange`, replace line 108:

```ts
    if (model.type === "low") {
      const { weak, strong } = strengthRange.low;
      model.setStrength(strong + weak - numericValue);
    } else {
```

**Step 4: Run the tests to verify they pass**

```bash
npx jest src/components/pressure-system-icon.test.tsx
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/pressure-system-icon.tsx src/components/pressure-system-icon.test.tsx && git commit -m "Use per-type strength ranges for the pressure system slider."
```

---

### Task 3: Full verification

**Step 1: Confirm nothing else referenced the old constants**

```bash
grep -rn "minStrength\|maxStrength\|mbLabelRange" src cypress
```

Expected: no output. Any hit is a missed call site — fix it before continuing.

**Step 2: Confirm no e2e test hardcodes the old endpoints**

```bash
grep -rn "1028\|997mb\|mb" cypress/e2e
```

Expected: no reference to `1028` or `997`. If a spec asserts on an mb label, update it to the new range.

**Step 3: Run the full suite**

```bash
npm test
```

Expected: PASS. Pay attention to `src/models/simulation-serialization.test.ts` and `src/models/interactive-state.test.ts` — they round-trip `strength` and should be unaffected, since strength is persisted raw and every previously saved value stays inside the new wider range.

**Step 4: Lint**

```bash
npm run lint && npm run lint:unused
```

Expected: clean. `lint:unused` catches the removed constants if an import was left behind.

**Step 5: Commit any fixes**

```bash
git add -A && git commit -m "Fix up remaining references to the shared pressure system range."
```

Skip this step if the working tree is clean.

---

### Task 4: Playtest the range-of-influence risk

This is the one part of the change that the tests cannot settle, and it is the reason to look at the running app before calling this done.

`PressureSystem.range` is derived from strength (`strength * 200000` at `src/models/pressure-system.ts:55-57`), so a max-strength low's radius of influence grows from 4000 km to 5840 km — larger than the ~5000 km visible region. And `SimulationModel.wind` (`src/models/simulation.ts:221-231`) blends overlapping systems with a `1 - dist / range` weight rather than summing them, so a max-strength low does not merely become stronger: it out-weights every other system across nearly the whole map.

**Step 1: Run the app**

```bash
npm start
```

**Step 2: Check the new maximum**

Drag a low pressure system's slider to the top. Confirm the label reads `990mb`.

**Step 3: Judge whether the interplay still reads**

With that low at full strength, check whether the high pressure systems still visibly shape the wind field, or whether the low has flattened everything. Compare against a mid-strength low.

**Step 4: Report, do not silently redesign**

If the strongest low washes out the other systems, say so and stop. The fix is to decouple `range` from `strength` — a cap, or a gentler multiplier — which is a design decision for the project team, not something to fold into this change. Do not walk back the mb numbers to compensate; those are the spec.

---

## Out of scope

Confirmed as deliberately unchanged, so don't "fix" them:

- `config.pressureSystemStrength: 15` — still inside both ranges.
- Preset strengths in `src/config.ts:14-64` — they keep their m/s values, and Task 1's tests assert their labels don't move.
- `migrateState` / `CURRENT_VERSION` in `src/models/interactive-state.ts` — no migration needed, since `strength` is persisted raw and old values remain in range.
- `LOGGED-EVENTS.md` — `PressureSystemStrengthUpdated` logs the mb string; only the range of possible values widens, the event shape is identical.
