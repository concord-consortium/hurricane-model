import { clsx } from "clsx";
import React from "react";

import { ICoordinates } from "../types";
import { LeafletCustomMarker } from "./leaflet-custom-marker";

import css from "./run-track-label.scss";

// Leaflet stacks markers by latitude, so the selected label needs an offset larger than any
// pixel position on the map to be sure of drawing above the other labels.
const selectedZIndexOffset = 1000000;

interface IProps {
  letter: string;
  position: ICoordinates;
  selected: boolean;
  hovered: boolean;
  onSelect: () => void;
  onHoverStart: () => void;
  onHoverEnd: () => void;
}

export function RunTrackLabel({
  letter, position, selected, hovered, onSelect, onHoverStart, onHoverEnd
}: IProps) {
  return (
    <LeafletCustomMarker position={position} zIndexOffset={selected ? selectedZIndexOffset : undefined}>
      <div
        aria-hidden="true"
        className={clsx(css.runTrackLabel, { [css.selected]: selected, [css.hovered]: hovered })}
        data-test="run-track-label"
        onClick={selected ? undefined : onSelect}
        onMouseEnter={selected ? undefined : onHoverStart}
        onMouseLeave={selected ? undefined : onHoverEnd}
      >
        {letter}
      </div>
    </LeafletCustomMarker>
  );
}
