import { observer } from "mobx-react";
import React from "react";

import config from "../../../config";
import { sstImages } from "../../../models/sst-overlay";
import { useStores } from "../../../stores-context";
import { Season } from "../../../types";
import { IRunResult } from "../../../types/interactive-state";
import { categoryColors } from "../../../utils/hurricane-categories";

import reliefImg from "../../../assets/basemap-thumbs/relief.png";
import satelliteImg from "../../../assets/basemap-thumbs/satellite.png";
import streetImg from "../../../assets/basemap-thumbs/street.png";

import commonCss from "../../common.scss";
import css from "./run-thumbnail.scss";

// All maps (the app map, base maps, SST PNGs, and these thumbnails) are all Web Mercator (EPSG:3857 —
// see simulation.ts's seaSurfaceTempAt), over this North Atlantic window (a bit wider than the app's
// map bounds so edge tracks/markers aren't clipped). The base-map crops in basemap-thumbs/ are generated
// to EXACTLY these bounds (via scripts/gen-basemap-thumbs.py), so they must change together.
const latMax = 56.9429;
const latMin = -10.4166;
const lngMin = -102.6667;
const lngMax = 0;

// Normalized Web Mercator (0..1 over the whole world), matching the full-world square SST PNGs.
const normalizeLng = (lng: number) => (lng + 180) / 360;
const normalizeLat = (lat: number) => (1 - Math.asinh(Math.tan((lat * Math.PI) / 180)) / Math.PI) / 2;
const normalizedXMin = normalizeLng(lngMin);
const normalizedXMax = normalizeLng(lngMax);
const normalizedYMin = normalizeLat(latMax);
const normalizedYMax = normalizeLat(latMin);

const pixelWidth = parseFloat(commonCss.thumbnailWidth);
// pixelHeight is defined in css so it is consistent between css and javascript.
// If the width or map aspect ratio changes, the following commented formula will regenerate a new height.
// const pixelHeight = Math.round((pixelWidth * (normalizedYMax - normalizedYMin)) / (normalizedXMax - normalizedXMin));
const pixelHeight = parseFloat(commonCss.thumbnailHeight);

const pixelX = (lng: number) => ((normalizeLng(lng) - normalizedXMin) / (normalizedXMax - normalizedXMin)) * pixelWidth;
const pixelY = (lat: number) =>
  ((normalizeLat(lat) - normalizedYMin) / (normalizedYMax - normalizedYMin)) * pixelHeight;

// The base-map images are Mercator crops of exactly this window (fill the viewBox). The full-world
// Mercator SST PNGs are placed so their North Atlantic crop fills the same viewBox.
const imageWidth = pixelWidth / (normalizedXMax - normalizedXMin);
const imageHeight = pixelHeight / (normalizedYMax - normalizedYMin);
const imageX = -normalizedXMin * imageWidth;
const imageY = -normalizedYMin * imageHeight;

const BASE_IMAGES: Record<string, string> = {
  satellite: satelliteImg,
  street: streetImg,
  relief: reliefImg
};

interface IRunThumbnailProps {
  result: IRunResult | null;
  season: Season;
}

export const RunThumbnail = observer(function RunThumbnail({ result, season }: IRunThumbnailProps) {
  const { ui } = useStores();

  if (!result) return <div className={css.resultPlaceholder}>Run to see result</div>;

  const { hurricane, hurricaneTrack, pressureSystems } = result;
  const baseImage = BASE_IMAGES[ui.baseMapType] || satelliteImg;
  const showSST = ui.overlay === "sst";
  const { accessibleSSTScale } = ui.sstOverlay;
  const defaultSSTUrl = sstImages[config.defaultSSTScale][season];
  const accessibleSSTUrl = sstImages[config.accessibleSSTScale][season];

  const finalCategory = hurricaneTrack[hurricaneTrack.length - 1]?.category ?? 0;
  const allPoints = [...hurricaneTrack, { position: { ...hurricane.center }, category: finalCategory }];
  const casingPoints =
    allPoints.map(p => `${pixelX(p.position.lng).toFixed(1)},${pixelY(p.position.lat).toFixed(1)}`).join(" ");

  return (
    <div className={css.thumbnailCrop}>
      <svg
        className={css.thumb}
        viewBox={`0 0 ${pixelWidth} ${pixelHeight}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="Run result map"
      >
        <image href={baseImage} x={0} y={0} width={pixelWidth} height={pixelHeight} preserveAspectRatio="none" />

        {showSST && (
          <>
            <image
              href={defaultSSTUrl}
              x={imageX}
              y={imageY}
              width={imageWidth}
              height={imageHeight}
              preserveAspectRatio="none"
              className={css.sstLayer}
              style={{ opacity: accessibleSSTScale ? 0 : 0.72 }}
            />
            <image
              href={accessibleSSTUrl}
              x={imageX}
              y={imageY}
              width={imageWidth}
              height={imageHeight}
              preserveAspectRatio="none"
              className={css.sstLayer}
              style={{ opacity: accessibleSSTScale ? 1 : 0 }}
            />
          </>
        )}

        {/* Track: dark casing under category-colored segments for contrast. */}
        {allPoints.length > 1 && <polyline className={css.casing} points={casingPoints} />}
        {allPoints.slice(1).map((p, i) => (
          <line
            className={css.hurricaneTrack}
            key={`seg-${i}`}
            x1={pixelX(allPoints[i].position.lng)}
            y1={pixelY(allPoints[i].position.lat)}
            x2={pixelX(p.position.lng)}
            y2={pixelY(p.position.lat)}
            stroke={categoryColors[allPoints[i].category] || "#ffffff"}
          />
        ))}

        {pressureSystems.map((ps, i) => {
          const x = pixelX(ps.center.lng);
          const y = pixelY(ps.center.lat);
          const high = ps.type === "high";
          return (
            <text
              className={css.pressureSystem}
              key={`ps-${i}`}
              x={x}
              y={y}
              fill={high ? commonCss.highPressureMapColor : commonCss.lowPressureMapColor}
            >
              {high ? "H" : "L"}
            </text>
          );
        })}
      </svg>
    </div>
  );
});
