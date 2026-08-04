import React from "react";

import { sstImages } from "../../models/simulation";
import { namedRegions } from "../../types";
import { ISimulationState } from "../../types/interactive-state";
import { anomalyFillColor, temperatureAnomalyRegions } from "../../utils/regions";
import { CATEGORY_COLORS } from "./run-summary";

import css from "./run-thumbnail.scss";

// A simplified mini-map of a run's result: the season's sea-surface-temperature image cropped to the
// North Atlantic (same region the app map shows), with SST-anomaly hints, the category-colored
// track, and the H/L pressure systems — a thumbnail of "what we saw on the map."

// Thumbnail viewBox and the North Atlantic geographic window it represents (matches config bounds).
const W = 100, H = 56;
const LAT_MAX = 50, LAT_MIN = 5, LNG_MIN = -90, LNG_MAX = -10;
const px = (lng: number) => ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * W;
const py = (lat: number) => ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * H;

// The SST PNGs are full-world equirectangular (lng -180..180, lat -90..90). Place the image so its
// North Atlantic crop fills the 0..W / 0..H viewBox (the outer <svg> clips the overflow).
const IMG_W = (W * 360) / (LNG_MAX - LNG_MIN);
const IMG_H = (H * 180) / (LAT_MAX - LAT_MIN);
const IMG_X = -((LNG_MIN + 180) / 360) * IMG_W;
const IMG_Y = -((90 - LAT_MAX) / 180) * IMG_H;

export function RunThumbnail({ sim }: { sim: ISimulationState }) {
  const track = sim.hurricaneTrack || [];
  const casing = track.map(p => `${px(p.position.lng).toFixed(1)},${py(p.position.lat).toFixed(1)}`).join(" ");
  const anomalies = namedRegions
    .map(r => ({ anchor: temperatureAnomalyRegions[r].anchor, v: sim.temperatureAnomalies?.[r] ?? 0 }))
    .filter(a => a.v !== 0);

  return (
    <svg className={css.thumb} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
      role="img" aria-label="Run result map">
      {/* Season sea-surface-temperature base map (cropped to the North Atlantic). */}
      <image href={sstImages[sim.season]} x={IMG_X} y={IMG_Y} width={IMG_W} height={IMG_H}
        preserveAspectRatio="none" />

      {/* SST anomaly hints at each region's anchor. */}
      {anomalies.map((a, i) => (
        <circle key={`sst-${i}`} cx={px(a.anchor.lng)} cy={py(a.anchor.lat)} r={5}
          fill={anomalyFillColor(a.v)} opacity={0.75} stroke="#fff" strokeWidth={0.5} />
      ))}

      {/* Track: dark casing under category-colored segments for contrast over the SST colors. */}
      {track.length > 1 && (
        <polyline points={casing} fill="none" stroke="#1a1a1a" strokeOpacity={0.55}
          strokeWidth={2.6} strokeLinejoin="round" strokeLinecap="round" />
      )}
      {track.slice(1).map((p, i) => (
        <line key={`seg-${i}`}
          x1={px(track[i].position.lng)} y1={py(track[i].position.lat)}
          x2={px(p.position.lng)} y2={py(p.position.lat)}
          stroke={CATEGORY_COLORS[p.category] || "#ffffff"} strokeWidth={1.4} strokeLinecap="round" />
      ))}

      {/* Pressure systems: blue H (high) / red L (low), matching the map. */}
      {(sim.pressureSystems || []).map((ps, i) => {
        const x = px(ps.center.lng), y = py(ps.center.lat);
        const high = ps.type === "high";
        return (
          <g key={`ps-${i}`}>
            <circle cx={x} cy={y} r={4.4} fill={high ? "#1f6fb2" : "#c0392b"} stroke="#fff" strokeWidth={0.7} />
            <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={5.4}
              fontWeight={700} fill="#fff">{high ? "H" : "L"}</text>
          </g>
        );
      })}
    </svg>
  );
}
