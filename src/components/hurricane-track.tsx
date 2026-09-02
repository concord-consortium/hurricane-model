import { clsx } from "clsx";
import React, { useMemo } from "react";
import { observer } from "mobx-react";
import { Pane, Polyline } from "react-leaflet";
import { useStores } from "../stores-context";
import { ICoordinates, ITrackPoint } from "../types";
import css from "./hurricane-track.scss";

interface ISegment {
  category: number;
  positions: ICoordinates[];
}

// Consecutive points of the same category share a polyline, so the number of rendered paths follows
// the number of category changes rather than the length of the track.
export const buildSegments = (track: ITrackPoint[]): ISegment[] => {
  const segments: ISegment[] = [];
  track.forEach(point => {
    const last = segments[segments.length - 1];
    if (last && last.category === point.category) {
      last.positions.push(point.position);
    } else {
      // Repeat the previous point so neighbouring segments join without a gap.
      const start = last ? [last.positions[last.positions.length - 1]] : [];
      segments.push({ category: point.category, positions: [...start, point.position] });
    }
  });
  return segments;
};

export const HurricaneTrack = observer(function HurricaneTrack() {
  const { simulation } = useStores();
  const { hurricaneTrack, hurricane } = simulation;
  const trackLength = hurricaneTrack.length;

  // Track points are only ever appended, so the finished segments don't change between renders.
  // Keeping their identity stable keeps Leaflet from redrawing the whole track every frame while the hurricane moves.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const segments = useMemo(() => buildSegments(hurricaneTrack), [trackLength]);

  // Only the tail follows the live hurricane position.
  const lastPoint = trackLength > 0 ? hurricaneTrack[trackLength - 1] : null;
  const tail = lastPoint ? [lastPoint.position, hurricane.center] : [];

  const segmentClass = (category: number) => clsx(css.segment, css["segmentCategory" + category]);

  return (
    // The border pane sits above the unselected runs' track pane (z 410) and below
    // "shadowPane" (z 500), so the selected track keeps its outline where other tracks cross it.
    <Pane name="selectedTrack" style={{ zIndex: 430 }}>
      {segments.map((segment, idx) =>
        <Polyline
          key={`${idx}-border`}
          className={css.hurricaneTrackBorder}
          positions={segment.positions}
          weight={7}
        />
      )}
      {lastPoint &&
        <Polyline
          key="tail-border"
          className={css.hurricaneTrackBorder}
          positions={tail}
          weight={7}
        />
      }
      {segments.map((segment, idx) =>
        <Polyline
          key={`${idx}`}
          className={segmentClass(segment.category)}
          pane="shadowPane"
          positions={segment.positions}
          weight={5}
        />
      )}
      {lastPoint &&
        <Polyline
          key="tail"
          className={segmentClass(lastPoint.category)}
          pane="shadowPane"
          positions={tail}
          weight={5}
        />
      }
    </Pane>
  );
});
