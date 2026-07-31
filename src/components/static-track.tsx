import * as React from "react";
import { Polyline } from "react-leaflet";
import { ITrackPoint } from "../types";
import css from "./static-track.scss";

interface IStaticTrackProps {
  track: ITrackPoint[];
  onClick?: () => void;
}

/**
 * A saved run's track drawn as a static, greyed, clickable polyline. Rendered on "overlayPane"
 * so it sits beneath the active <HurricaneTrack> (which draws its colored line on "shadowPane")
 * and beneath all markers. Mirrors the double-stroke (border + line) look of the active track.
 */
export function StaticTrack({ track, onClick }: IStaticTrackProps) {
  const eventHandlers = onClick ? { click: onClick } : undefined;
  return (
    <>
      {track.map((point: ITrackPoint, idx: number) => {
        if (idx + 1 >= track.length) return null;
        const positions = [point.position, track[idx + 1].position];
        return (
          <React.Fragment key={idx}>
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
          </React.Fragment>
        );
      })}
    </>
  );
}
