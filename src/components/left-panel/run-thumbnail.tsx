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

// Thumbnail viewBox and the North Atlantic geographic window it represents. A bit wider in latitude
// than the app's map bounds so tracks/markers near the edges aren't clipped; H keeps it undistorted.
const LAT_MAX = 54, LAT_MIN = 2, LNG_MIN = -90, LNG_MAX = -10;
const W = 100, H = Math.round((W * (LAT_MAX - LAT_MIN)) / (LNG_MAX - LNG_MIN)); // ~65
const px = (lng: number) => ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * W;
const py = (lat: number) => ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * H;

// The base-map images are equirectangular renders of exactly this window, so they fill the viewBox.
// The SST PNGs are full-world equirectangular; place them so their North Atlantic crop fills it.
const IMG_W = (W * 360) / (LNG_MAX - LNG_MIN);
const IMG_H = (H * 180) / (LAT_MAX - LAT_MIN);
const IMG_X = -((LNG_MIN + 180) / 360) * IMG_W;
const IMG_Y = -((90 - LAT_MAX) / 180) * IMG_H;

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

      {/* SST anomaly hints at each region's anchor (only meaningful with the SST overlay on). */}
      {showSST && anomalies.map((a, i) => (
        <circle key={`sst-${i}`} cx={px(a.anchor.lng)} cy={py(a.anchor.lat)} r={5}
          fill={anomalyFillColor(a.v)} opacity={0.8} stroke="#fff" strokeWidth={0.5} />
      ))}

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
