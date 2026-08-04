import { observer } from "mobx-react";
import React from "react";

import { sstImages } from "../../models/simulation";
import { useStores } from "../../stores-context";
import { namedRegions } from "../../types";
import { ISimulationState } from "../../types/interactive-state";
import { anomalyFillColor, temperatureAnomalyRegions } from "../../utils/regions";
import { CATEGORY_COLORS } from "./run-summary";

import satelliteImg from "../../assets/basemap-thumbs/satellite.png";
import reliefImg from "../../assets/basemap-thumbs/relief.png";
import streetImg from "../../assets/basemap-thumbs/street.png";

import css from "./run-thumbnail.scss";

// A simplified mini-map of a run's result — a thumbnail of "what we saw on the map": the current
// base map (Satellite/Relief/Street) as the ground, the season sea-surface-temperature image as a
// semi-transparent overlay when the SST overlay is on (with anomaly hints), the category-colored
// track, and the H/L pressure systems.

// The app map, base maps, and SST PNGs are all Web Mercator (EPSG:3857 — see simulation.ts's
// seaSurfaceTempAt), so the thumbnail projects everything in Mercator too, over this North Atlantic
// window (a bit wider than the app's map bounds so edge tracks/markers aren't clipped).
const LAT_MAX = 54, LAT_MIN = 2, LNG_MIN = -90, LNG_MAX = -10;
// Normalized Web Mercator (0..1 over the whole world), matching the full-world square SST PNGs.
const mx = (lng: number) => (lng + 180) / 360;
const my = (lat: number) => (1 - Math.asinh(Math.tan((lat * Math.PI) / 180)) / Math.PI) / 2;
const MX0 = mx(LNG_MIN), MX1 = mx(LNG_MAX), MY0 = my(LAT_MAX), MY1 = my(LAT_MIN);
const W = 100, H = Math.round((W * (MY1 - MY0)) / (MX1 - MX0)); // ~78
const px = (lng: number) => ((mx(lng) - MX0) / (MX1 - MX0)) * W;
const py = (lat: number) => ((my(lat) - MY0) / (MY1 - MY0)) * H;

// The base-map images are Mercator crops of exactly this window (fill the viewBox). The full-world
// Mercator SST PNGs are placed so their North Atlantic crop fills the same viewBox.
const IMG_W = W / (MX1 - MX0);
const IMG_H = H / (MY1 - MY0);
const IMG_X = -MX0 * IMG_W;
const IMG_Y = -MY0 * IMG_H;

const BASE_IMAGES: Record<string, string> = {
  satellite: satelliteImg,
  street: streetImg,
  relief: reliefImg
};

export const RunThumbnail = observer(function RunThumbnail({ sim }: { sim: ISimulationState }) {
  const { ui } = useStores();
  const baseImg = BASE_IMAGES[ui.baseMap] || satelliteImg;
  const showSST = ui.overlay === "sst";

  const track = sim.hurricaneTrack || [];
  const casing = track.map(p => `${px(p.position.lng).toFixed(1)},${py(p.position.lat).toFixed(1)}`).join(" ");
  const anomalies = namedRegions
    .map(r => ({ anchor: temperatureAnomalyRegions[r].anchor, v: sim.temperatureAnomalies?.[r] ?? 0 }))
    .filter(a => a.v !== 0);

  return (
    <svg className={css.thumb} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
      role="img" aria-label="Run result map">
      {/* Base map ground (reflects the current Satellite / Relief / Street choice). */}
      <image href={baseImg} x={0} y={0} width={W} height={H} preserveAspectRatio="none" />

      {/* Season sea-surface-temperature overlay (semi-transparent), only when the SST overlay is on.
          It's transparent over land, so the base map's continents still show through. */}
      {showSST && (
        <image href={sstImages[sim.season]} x={IMG_X} y={IMG_Y} width={IMG_W} height={IMG_H}
          preserveAspectRatio="none" opacity={0.72} />
      )}

      {/* SST anomaly hints at each region's anchor: colored by the anomaly, labeled with its value
          (only meaningful with the SST overlay on). */}
      {showSST && anomalies.map((a, i) => {
        // Keep the marker fully inside the frame even when a region anchor sits near an edge.
        const x = Math.max(7.5, Math.min(W - 7.5, px(a.anchor.lng)));
        const y = Math.max(7.5, Math.min(H - 7.5, py(a.anchor.lat)));
        return (
          <g key={`sst-${i}`}>
            <circle cx={x} cy={y} r={6.6} fill={anomalyFillColor(a.v)} opacity={0.92}
              stroke="#fff" strokeWidth={0.7} />
            <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={6}
              fontWeight={700} fill="#fff" stroke="#1a1a1a" strokeWidth={0.4} paintOrder="stroke">
              {(a.v > 0 ? "+" : "−") + Math.abs(a.v)}
            </text>
          </g>
        );
      })}

      {/* Track: dark casing under category-colored segments for contrast. */}
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
});
