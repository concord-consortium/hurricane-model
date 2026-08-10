import { clsx } from "clsx";
import * as React from "react";
import { Polyline } from "react-leaflet";
import { ITrackPoint } from "../types";
import css from "./static-track.scss";

interface IStaticTrackProps {
  track: ITrackPoint[];
  // Selected runs are drawn "lit up" in category color (above the grey ghost tracks); unselected
  // runs are drawn grey.
  selected?: boolean;
  onClick?: () => void;
}

/**
 * A saved run's track drawn on the map. Selected -> category-colored (matching the active track's
 * look), on "shadowPane" so it sits above the grey ghost tracks. Unselected -> grey, on
 * "overlayPane". Both sit below all markers.
 */
export function StaticTrack({ track, selected, onClick }: IStaticTrackProps) {
  const eventHandlers = onClick ? { click: onClick } : undefined;

  // Unselected (grey) ghost track: a single color, so draw it as one continuous polyline (border +
  // fill over the full path) rather than per-segment — no "pill" joints where segments meet.
  if (!selected) {
    const positions = track.map((point: ITrackPoint) => point.position);
    return (
      <>
        <Polyline
          className={css.savedTrackBorder}
          pane="overlayPane"
          positions={positions}
          weight={7}
          interactive={false}
        />
        <Polyline
          className={css.savedTrack}
          pane="overlayPane"
          positions={positions}
          weight={5}
          eventHandlers={eventHandlers}
        />
      </>
    );
  }

  // Selected ("lit up") track: each segment is colored by its category, so it must be per-segment.
  return (
    <>
      {track.map((point: ITrackPoint, idx: number) => {
        if (idx + 1 >= track.length) return null;
        const positions = [point.position, track[idx + 1].position];
        return (
          <React.Fragment key={idx}>
            <Polyline
              className={css.selectedBorder}
              pane="overlayPane"
              positions={positions}
              weight={7}
              interactive={false}
            />
            <Polyline
              className={clsx(css.selectedSegment, css["cat" + point.category])}
              pane="shadowPane"
              positions={positions}
              weight={5}
              eventHandlers={eventHandlers}
            />
          </React.Fragment>
        );
      })}
    </>
  );
}
