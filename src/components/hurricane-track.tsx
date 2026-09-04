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
// the number of category changes rather than the length of the track. Each point colors the edge
// leaving it — the hurricane only reaches the next category at the next point — so a segment ends on
// the first point of the following category, and neighbouring segments join there without a gap.
// The last point starts no segment; the live tail draws its edge to the hurricane's current center.
export const buildSegments = (track: ITrackPoint[]): ISegment[] => {
  const segments: ISegment[] = [];
  for (let i = 0; i < track.length - 1; i++) {
    const last = segments[segments.length - 1];
    if (last && last.category === track[i].category) {
      last.positions.push(track[i + 1].position);
    } else {
      segments.push({ category: track[i].category, positions: [track[i].position, track[i + 1].position] });
    }
  }
  return segments;
};

export const HurricaneTrack = observer(function HurricaneTrack() {
  const { simulation } = useStores();
  const { hurricaneTrack, hurricane } = simulation;
  const trackLength = hurricaneTrack.length;

  // Track points are only ever appended, so the finished segments don't change between renders.
  // Keeping their identity stable keeps Leaflet from redrawing the whole track every frame while the hurricane moves.
  // Appending segements to hurricaneTrack does not cause the memo to update, so we need trackLength as a dependency.
  const segments = useMemo(() => buildSegments(hurricaneTrack.slice(0, trackLength)), [hurricaneTrack, trackLength]);

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
          key={`${idx}-${segment.category}-border`}
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
          key={`${idx}-${segment.category}`}
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
