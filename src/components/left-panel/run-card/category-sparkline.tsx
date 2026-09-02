import React, { useRef } from "react";

import { categoryColors } from "../../../utils/hurricane-categories";

import css from "./category-sparkline.scss";

let sparklineSeq = 0;

const minWidth = 8;
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

  const width = Math.max(minWidth, widthPx);
  const x = (i: number) => length <= 1 ? width / 2 : pad + (i / (length - 1)) * (width - 2 * pad);
  const y = (category: number) => height - pad - (category / 5) * (height - 2 * pad);
  const points = series.map((category, i) => `${x(i).toFixed(1)},${y(category).toFixed(1)}`).join(" ");
  const area = `${pad},${height - pad} ${points} ${(width - pad)},${height - pad}`;
  const strokeId = `spk-s-${uid}-${seqRef.current}`;
  const fillId = `spk-f-${uid}-${seqRef.current}`;

  const stopColor = (palette: string[], category: number) =>
    palette[Math.max(0, Math.min(palette.length - 1, Math.round(category)))];

  // userSpaceOnUse so the stroke and fill gradients share the same x-mapping (offset i/(length-1) == x(i)).
  const grad = (id: string, palette: string[]) => (
    <linearGradient id={id} gradientUnits="userSpaceOnUse" x1={pad} y1="0" x2={width - pad} y2="0">
      {series.map((category, i) => (
        <stop key={i} offset={length <= 1 ? 0 : i / (length - 1)} stopColor={stopColor(palette, category)} />
      ))}
    </linearGradient>
  );

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
