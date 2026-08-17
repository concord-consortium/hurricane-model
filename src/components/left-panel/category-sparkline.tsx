import React from "react";

import { CATEGORY_COLORS } from "./run-summary";

import css from "./category-sparkline.scss";

// Darker, legible-on-white strokes for the intensity sparkline, indexed by category (the Saffir–
// Simpson fills are too pale to read as a thin line for TS/Cat 1).
const SPARK_STROKE = ["#9a9a9a", "#c9a400", "#e0a020", "#d97a1e", "#c85a10", "#e03b3b"];

// A category sparkline for one run: the storm's category (0..5) at each track point. The line and
// the fill beneath it are colored by category over time (a gradient with a stop per point), so the
// color shifts as the storm strengthens/weakens. Shared by the Compare table and the run cards.
export function CategorySparkline({ series, uid, widthPx }: { series: number[]; uid: string; widthPx: number }) {
  const w = Math.max(8, widthPx), h = 22, pad = 2;
  if (series.length === 0) return <span className={css.noData}>—</span>;
  const n = series.length;
  const x = (i: number) => n <= 1 ? w / 2 : pad + (i / (n - 1)) * (w - 2 * pad);
  const y = (c: number) => h - pad - (c / 5) * (h - 2 * pad);
  const ci = (c: number) => Math.max(0, Math.min(5, Math.round(c)));
  const pts = series.map((c, i) => `${x(i).toFixed(1)},${y(c).toFixed(1)}`).join(" ");
  const area = `${pad},${h - pad} ${pts} ${(w - pad)},${h - pad}`;
  const strokeId = `spk-s-${uid}`, fillId = `spk-f-${uid}`;
  // userSpaceOnUse so the stroke and fill gradients share the same x-mapping (offset i/(n-1) == x(i)).
  const grad = (id: string, palette: string[]) => (
    <linearGradient id={id} gradientUnits="userSpaceOnUse" x1={pad} y1="0" x2={w - pad} y2="0">
      {series.map((c, i) => (
        <stop key={i} offset={n <= 1 ? 0 : i / (n - 1)} stopColor={palette[ci(c)]} />
      ))}
    </linearGradient>
  );
  return (
    <svg className={css.spark} width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <defs>
        {grad(strokeId, SPARK_STROKE)}
        {grad(fillId, CATEGORY_COLORS)}
      </defs>
      <polygon points={area} fill={`url(#${fillId})`} opacity={0.75} />
      <polyline points={pts} fill="none" stroke={`url(#${strokeId})`} strokeWidth={1.75}
        strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
