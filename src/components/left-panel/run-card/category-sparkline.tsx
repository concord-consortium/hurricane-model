import React, { useId } from "react";

import { categoryColors } from "../../../utils/hurricane-categories";

import commonCss from "../../common.scss";
import css from "./category-sparkline.scss";

const minWidth = 8;
const height = parseFloat(commonCss.sparklineHeight);
const pad = 2;

const SPARK_STROKE = ["#9a9a9a", "#c9a400", "#e0a020", "#d97a1e", "#c85a10", "#e03b3b"];

interface ICategorySparklineProps {
  series: number[];
  widthPx: number;
}

export function CategorySparkline({ series, widthPx }: ICategorySparklineProps) {
  const sparklineId = useId();

  const { length } = series;
  if (length === 0) return <span className={css.noData}>—</span>;

  const width = Math.max(minWidth, widthPx);
  const x = (i: number) => length <= 1 ? width / 2 : pad + (i / (length - 1)) * (width - 2 * pad);
  const y = (category: number) => height - pad - (category / 5) * (height - 2 * pad);
  const points = series.map((category, i) => `${x(i).toFixed(1)},${y(category).toFixed(1)}`).join(" ");
  const area = `${pad},${height - pad} ${points} ${(width - pad)},${height - pad}`;
  const strokeId = `spk-s-${sparklineId}`;
  const fillId = `spk-f-${sparklineId}`;

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
      <polyline className={css.sparklineBorder} points={points} stroke={`url(#${strokeId})`} />
    </svg>
  );
}
