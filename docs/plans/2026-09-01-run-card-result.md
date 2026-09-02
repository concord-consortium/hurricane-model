# Run Card RESULT Column Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fill in the run card's RESULT column: a mini-map thumbnail of the run (track, H/L systems, base map + SST overlay) and three read-outs — peak category, landfall count, and a category-over-time sparkline.

**Architecture:** Ported from the Storm Explorer prototype (PR #151, branch `storm-explorer-multirun-prototype`), adapted to the run-card directory and this codebase's stores. Pure outcome metrics live in `src/utils/run-outcomes.ts`. Three presentational components go in `src/components/left-panel/run-card/`: `RunThumbnail` (Mercator mini-map SVG), `CategorySparkline`, and `RunResult` (the three read-out rows). `RunCard` supplies the sim state — the live `SimulationModel` for the selected run, the stored record otherwise — and shows real values only when the run is complete (dashes before). **Per Teale: the thumbnail must NOT show the SST anomaly markers (±N circles) the prototype draws.**

**Tech Stack:** React + `mobx-react` `observer` (thumbnail reads `ui.baseMap` / `ui.overlay` / `ui.sstOverlay`), inline SVG, SCSS modules with `:export`ed category colors, Jest + Testing Library.

**Already committed** (`421ef15`): result icons (`peak-category.svg`, `landfall.svg`, `category-over-time.svg`), `src/assets/basemap-thumbs/{satellite,relief,street}.png`, `scripts/gen-basemap-thumbs.py` (regenerates the crops; its bounds must match `run-thumbnail.tsx`), and `cat0Color..cat5Color` in `common.scss`'s `:export` block + `__mocks__/common-scss-mock.js`.

**Already written, uncommitted:** `src/utils/run-outcomes.ts` + `run-outcomes.test.ts` (Task 1 verifies and commits them).

Conventions: minimal comments (non-obvious why only); no `!important`; TDD; one commit per task.

---

### Task 1: Run outcome metrics (`run-outcomes.ts`)

**Files (already written, uncommitted):**
- `src/utils/run-outcomes.ts` — `peakCategory`, `landfallSummary` (count + strongest landfall, `-1` when none), `durationSteps` (track length), `intensitySeries` (category per track point, downsampled to ≤ `max`, default 40). Pure functions over `ISimulationState`; the prototype's unused `runTakeaway` / `pressureSignature` are omitted.
- `src/utils/run-outcomes.test.ts` — covers each function including empty-track/no-landfall cases and downsampling.

**Step 1: Run the tests**

Run: `npx jest src/utils/run-outcomes.test.ts`
Expected: PASS (7 tests).

**Step 2: Commit**

```bash
git add src/utils/run-outcomes.ts src/utils/run-outcomes.test.ts
git commit -m "Add run outcome metrics for the result column."
```

---

### Task 2: Category colors/labels helper + `CategorySparkline`

**Files:**
- Create: `src/components/hurricane-categories.ts`
- Create: `src/components/left-panel/run-card/category-sparkline.tsx`
- Create: `src/components/left-panel/run-card/category-sparkline.scss`
- Create: `src/components/left-panel/run-card/category-sparkline.test.tsx`
- Modify: `src/components/left-panel/run-card/run-setup-summary.tsx` (use `categoryLabel`)

**Step 1: Write the failing tests**

Create `src/components/left-panel/run-card/category-sparkline.test.tsx`:

```tsx
import { render } from "@testing-library/react";
import React from "react";

import { categoryLabel } from "../../hurricane-categories";
import { CategorySparkline } from "./category-sparkline";

describe("categoryLabel", () => {
  it("labels TS and hurricane categories", () => {
    expect(categoryLabel(0)).toBe("TS");
    expect(categoryLabel(3)).toBe("Cat 3");
  });
});

describe("CategorySparkline", () => {
  it("renders a polyline point per series value", () => {
    const { container } = render(<CategorySparkline series={[0, 1, 2, 3]} uid="run-1" widthPx={80} />);
    const polyline = container.querySelector("polyline");
    expect(polyline?.getAttribute("points")?.split(" ").length).toBe(4);
  });

  it("renders unique gradient ids for two sparklines of the same run", () => {
    const { container } = render(
      <>
        <CategorySparkline series={[0, 1]} uid="run-1" widthPx={80} />
        <CategorySparkline series={[0, 1]} uid="run-1" widthPx={80} />
      </>
    );
    const ids = [...container.querySelectorAll("linearGradient")].map(g => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
```

**Step 2: Run to verify it fails** — `npx jest src/components/left-panel/run-card/category-sparkline.test.tsx` → module not found.

**Step 3: Implement**

Create `src/components/hurricane-categories.ts`:

```ts
import commonCss from "./common.scss";

// Saffir–Simpson fills indexed by category (TS..Cat 5) — the single source is common.scss.
export const categoryColors: string[] = [
  commonCss.cat0Color, commonCss.cat1Color, commonCss.cat2Color,
  commonCss.cat3Color, commonCss.cat4Color, commonCss.cat5Color
];

export function categoryLabel(category: number): string {
  return category === 0 ? "TS" : `Cat ${category}`;
}
```

Create `src/components/left-panel/run-card/category-sparkline.tsx` (from the prototype; `categoryColors` import swapped in):

```tsx
import React, { useRef } from "react";

import { categoryColors } from "../../hurricane-categories";

import css from "./category-sparkline.scss";

let sparklineSeq = 0;

const maxWidth = 8;
const height = 22;
const pad = 2;

const SPARK_STROKE = ["#9a9a9a", "#c9a400", "#e0a020", "#d97a1e", "#c85a10", "#e03b3b"];

interface ICategorySparklineProps {
  series: number[];
  uid: string;
  widthPx: number;
}

export function CategorySparkline({ series, uid, widthPx }: ICategorySparklineProps) {
  const seqRef = useRef<number>(0); // 0 = unassigned; the counter starts at 1

  const { length } = series;
  if (length === 0) return <span className={css.noData}>—</span>;

  if (seqRef.current === 0) seqRef.current = ++sparklineSeq;

  const width = Math.max(maxWidth, widthPx);
  const x = (i: number) => length <= 1 ? width / 2 : pad + (i / (length - 1)) * (width - 2 * pad);
  const y = (category: number) => height - pad - (category / 5) * (height - 2 * pad);
  const points = series.map((category, i) => `${x(i).toFixed(1)},${y(category).toFixed(1)}`).join(" ");
  const area = `${pad},${height - pad} ${points} ${(width - pad)},${height - pad}`;
  const strokeId = `spk-s-${uid}-${seqRef.current}`;
  const fillId = `spk-f-${uid}-${seqRef.current}`;

  const grad = (id: string, palette: string[]) => {
    const color = palette[Math.max(0, Math.min(palette.length - 1, Math.round(category)))];

    // userSpaceOnUse so the stroke and fill gradients share the same x-mapping (offset i/(length-1) == x(i)).
    return (
      <linearGradient id={id} gradientUnits="userSpaceOnUse" x1={pad} y1="0" x2={width - pad} y2="0">
        {series.map((c, i) => (
          <stop key={i} offset={length <= 1 ? 0 : i / (length - 1)} stopColor={color} />
        ))}
      </linearGradient>
    );
  }

  return (
    <svg className={css.spark} width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <defs>
        {grad(strokeId, SPARK_STROKE)}
        {grad(fillId, categoryColors)}
      </defs>
      <polygon points={area} fill={`url(#${fillId})`} opacity={0.75} />
      <polyline
        points={points}
        fill="none"
        stroke={`url(#${strokeId})`}
        strokeWidth={1.75}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
```

Create `src/components/left-panel/run-card/category-sparkline.scss`:

```scss
@use "../../common.scss" as *;

.spark { display: block; }
.noData { color: $charcoal; }
```

In `run-setup-summary.tsx`, replace the inline `category === 0 ? "TS" : \`Cat ${category}\`` with `categoryLabel(category)` (import from `../../hurricane-categories`).

**Step 4: Run** — sparkline tests + `run-setup-summary.test.tsx` → PASS.

**Step 5: Commit** — `"Add category sparkline and shared category color/label helpers."`

---

### Task 3: `RunThumbnail` mini-map

**Files:**
- Create: `src/components/left-panel/run-card/run-thumbnail.tsx`
- Create: `src/components/left-panel/run-card/run-thumbnail.scss`
- Create: `src/components/left-panel/run-card/run-thumbnail.test.tsx`

Ported from the prototype with two changes: **no SST anomaly markers**, and store access via this codebase's `ui.sstOverlay.accessibleSSTScale`.

**Step 1: Write the failing tests**

```tsx
import { render, screen } from "@testing-library/react";
import React from "react";

import { createStores, IStores } from "../../../models/stores";
import { defaultSimulationState } from "../../../models/simulation-serialization";
import { StoresContext } from "../../../stores-context";
import { RunThumbnail } from "./run-thumbnail";

const renderThumb = (stores: IStores, sim = defaultSimulationState()) =>
  render(
    <StoresContext value={stores}>
      <RunThumbnail sim={sim} />
    </StoresContext>
  );

describe("RunThumbnail", () => {
  let stores: IStores;
  beforeEach(() => { stores = createStores(); });

  it("renders an accessible mini-map", () => {
    renderThumb(stores);
    expect(screen.getByRole("img", { name: "Run result map" })).toBeInTheDocument();
  });

  it("draws a track segment per point after the first", () => {
    const sim = defaultSimulationState();
    sim.hurricaneTrack = [
      { position: { lat: 20, lng: -40 }, category: 1 },
      { position: { lat: 22, lng: -42 }, category: 2 },
      { position: { lat: 24, lng: -44 }, category: 2 }
    ];
    const { container } = renderThumb(stores, sim);
    expect(container.querySelectorAll("line").length).toBe(2);
  });

  it("marks each pressure system with an H or L", () => {
    const { container } = renderThumb(stores);
    const letters = [...container.querySelectorAll("text")].map(t => t.textContent);
    expect(letters.filter(l => l === "H").length).toBe(2);
    expect(letters.filter(l => l === "L").length).toBe(2);
  });

  it("shows the SST overlay images only when the overlay is on", () => {
    const sim = defaultSimulationState();
    const { container, rerender } = renderThumb(stores, sim);
    expect(container.querySelectorAll("image").length).toBe(1); // base map only
    stores.ui.setOverlay("sst");
    rerender(
      <StoresContext value={stores}>
        <RunThumbnail sim={sim} />
      </StoresContext>
    );
    expect(container.querySelectorAll("image").length).toBe(3); // + both SST scale images
  });

  it("does not draw SST anomaly markers even when anomalies are set", () => {
    stores.ui.setOverlay("sst");
    const sim = defaultSimulationState();
    sim.temperatureAnomalies = { caribbean: 2 };
    const { container } = renderThumb(stores, sim);
    expect(container.querySelectorAll("circle").length).toBe(0);
  });
});
```

(Adjust `setOverlay` to the UI model's actual setter name; verify with `grep -n "overlay" src/models/ui.ts`.)

**Step 2: Run to verify failure.**

**Step 3: Implement**

`run-thumbnail.tsx` — the prototype file with these edits:
- imports: `useStores` from `../../../stores-context`, `sstImages` from `../../../models/sst-overlay`, `config` from `../../../config`, `namedRegions` removed, `anomalyFillColor`/`temperatureAnomalyRegions`/`temperatureAnomalyMax/Min` removed, `categoryColors` from `../../hurricane-categories`, images from `../../../assets/basemap-thumbs/*.png`.
- `accessibleSST` reads `ui.sstOverlay.accessibleSSTScale`.
- Delete the entire `{showSST && anomalies.map(...)}` block and the `anomalies` computation.
- Keep: Mercator constants and projection helpers, base image, stacked SST images with cross-fade opacity, track casing + per-segment category-colored lines (`categoryColors[p.category] || "#ffffff"`), H/L letters (`fontSize 15`, `#327cfc` / `#fc542d`, white halo via `paintOrder="stroke"`), `role="img"` `aria-label="Run result map"`, `preserveAspectRatio="none"`, `viewBox 0 0 100 ~78`.

`run-thumbnail.scss` — prototype's, with the anomaly `.sstLabel` rule removed:

```scss
// The two SST scale images (default + accessible) are stacked; toggling the accessible key fades
// their opacities so the swap cross-fades instead of hard-cutting.
.sstLayer {
  transition: opacity 0.2s ease;
}
@media (prefers-reduced-motion: reduce) {
  .sstLayer {
    transition: none;
  }
}

.thumb {
  display: block;
  // 5px wider than the .thumbCrop frame and pulled back so ~2.5px is clipped off each side, keeping
  // the map's proportions un-squished in the narrower frame. Border/radius live on .thumbCrop.
  width: calc(100% + 5px);
  aspect-ratio: 100 / 78;
  margin: -2px -2.5px;
}
```

**Step 4: Run tests** → PASS.

**Step 5: Commit** — `"Add run result mini-map thumbnail."`

---

### Task 4: `RunResult` read-out rows

**Files:**
- Create: `src/components/left-panel/run-card/run-result.tsx`
- Create: `src/components/left-panel/run-card/run-result.scss`
- Create: `src/components/left-panel/run-card/run-result.test.tsx`

**Step 1: Write the failing tests**

```tsx
import { render, screen } from "@testing-library/react";
import React from "react";

import { defaultSimulationState } from "../../../models/simulation-serialization";
import { RunResult } from "./run-result";

const completedSim = () => {
  const sim = defaultSimulationState();
  sim.hurricaneTrack = [
    { position: { lat: 20, lng: -40 }, category: 1 },
    { position: { lat: 22, lng: -42 }, category: 3 }
  ];
  sim.landfalls = [{ position: { lat: 22, lng: -42 }, category: 3 }];
  return sim;
};

describe("RunResult", () => {
  it("shows dashes before a run completes", () => {
    render(<RunResult sim={null} uid="run-1" />);
    expect(screen.getAllByText("—").length).toBe(3);
  });

  it("shows the peak category", () => {
    render(<RunResult sim={completedSim()} uid="run-1" />);
    expect(screen.getByTestId("result-peak-category")).toHaveTextContent("Cat 3");
  });

  it("shows the landfall count", () => {
    render(<RunResult sim={completedSim()} uid="run-1" />);
    expect(screen.getByTestId("result-landfalls")).toHaveTextContent("1×");
  });

  it("shows None when there were no landfalls", () => {
    const sim = completedSim();
    sim.landfalls = [];
    render(<RunResult sim={sim} uid="run-1" />);
    expect(screen.getByTestId("result-landfalls")).toHaveTextContent("None");
  });

  it("renders the category sparkline for a completed run", () => {
    const { container } = render(<RunResult sim={completedSim()} uid="run-1" />);
    expect(container.querySelector("polyline")).toBeInTheDocument();
  });
});
```

**Step 2: Run to verify failure.**

**Step 3: Implement**

`run-result.tsx` — the prototype file adapted: imports from this repo's paths, `categoryLabel`/`categoryColors` helpers, `categoryCss` two-tone peak icon (white before a run via `.fillWhite`, category class after), the measured spark slot (`ResizeObserver` + `LIFE_W_FALLBACK = 83`), `maxDuration` prop scaling the sparkline width, `data-test` attributes `result-peak-category`, `result-landfalls`, `result-category-over-time`.

`run-result.scss` — prototype's file, `@use "../../common.scss" as *;`.

**Step 4: Run tests** → PASS (jsdom has no `ResizeObserver`; if it throws, guard `typeof ResizeObserver !== "undefined"` in the effect).

**Step 5: Commit** — `"Add run result read-outs."`

---

### Task 5: Wire the RESULT column into `RunCard`

**Files:**
- Modify: `src/components/left-panel/run-card/run-card.tsx`
- Modify: `src/components/left-panel/run-card/run-card.scss`
- Modify: `src/components/left-panel/run-card/run-card.test.tsx`

**Step 1: Write the failing tests**

Append to the `describe("setup and result columns", ...)` block:

```tsx
    it("shows dashes in the result column before the run completes", () => {
      renderPanels(stores);
      expect(screen.getAllByText("—").length).toBe(3);
      expect(screen.queryByRole("img", { name: "Run result map" })).not.toBeInTheDocument();
    });

    it("shows the thumbnail and results once the run is complete", () => {
      completeCurrentRun(stores);
      renderPanels(stores);
      expect(screen.getByRole("img", { name: "Run result map" })).toBeInTheDocument();
      expect(screen.getByTestId("result-peak-category")).toHaveTextContent("Cat 2");
      expect(screen.getByTestId("result-landfalls")).toHaveTextContent("None");
    });

    it("summarizes an unselected run's result from its stored record", () => {
      completeCurrentRun(stores);
      stores.runs.addRun();
      renderPanels(stores);
      const peaks = screen.getAllByTestId("result-peak-category");
      expect(peaks[0]).toHaveTextContent("Cat 2");
      expect(peaks[1]).toHaveTextContent("—");
    });
```

**Step 2: Run to verify failure.**

**Step 3: Implement**

In `run-card.tsx`:
- Result sim: `null` when `!complete`. When complete: for the selected run build it from the live simulation (`{ season, hurricaneTrack, landfalls, pressureSystems: simulation.pressureSystems.map(ps => ps.serialize()), temperatureAnomalies }` — the run's own systems, which is what the thumbnail shows); otherwise `run.simulation`. Type it as the subset `RunThumbnail`/`RunResult` need, or as `ISimulationState` via the stored record for unselected and a serialize for selected — prefer the minimal-subset approach mirroring `IRunSetup`.
- `maxDuration`: `Math.max(...runs.runs.map(r => durationSteps(r.id === runs.selectedRunId ? liveSim : r.simulation)))` — compute across the pack so sparkline widths compare between cards.
- Result column becomes:

```tsx
<div className={css.cardColumn}>
  <div className={css.cardColumnHeading}>Result</div>
  {resultSim && (
    <div className={css.thumbCrop}>
      <RunThumbnail sim={resultSim} />
    </div>
  )}
  <RunResult sim={resultSim} uid={run.id} maxDuration={maxDuration} />
</div>
```

In `run-card.scss`, inside `.runCardBody`:

```scss
      .thumbCrop {
        width: 100%;
        aspect-ratio: 100 / 78;
        box-sizing: border-box;
        overflow: hidden;
        border: 1px solid rgba(0, 0, 0, 0.25);
        border-radius: 4px;
        background: #14304a;
      }
```

**Step 4: Run** — `npx jest src/components/left-panel/run-card/` → all pass.

**Step 5: Visual check** — `npm start`; run a storm, verify the thumbnail (track colors, H/L letters, no anomaly circles), read-outs, and the incomplete card's dashes; toggle base map + SST overlay and confirm the thumbnail follows. Kill the server when done.

**Step 6: Commit** — `"Fill in the run card result column."`

---

### Task 6: Full verification

1. `npm test` → all suites pass.
2. `npm run lint` and `npm run lint:unused` → no new errors.
3. Commit any fixes.
