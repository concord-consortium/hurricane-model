import { observer } from "mobx-react";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";

import { useStores } from "../../stores-context";
import { ICoordinates } from "../../types";
import { clampToRegion, snapToRegionPreservingAxis } from "../../utils/region";
import { stormPlacementRegion } from "../../utils/storm-placement-region";
import { SetupSection } from "./setup-section";

import StormLocationIcon from "../../assets/left-panel/storm-location.svg";

import css from "./storm-location-section.scss";

const hint = "Drag the storm to a starting position within the highlighted area on the map, "
  + "or type a latitude and longitude below.";

type Axis = "lat" | "lng";

const getClosestPoint = (axis: Axis, target: ICoordinates): ICoordinates => {
  // If there's any legal point that includes the lat/long that just changed, use that.
  // This ensures the number just entered is preserved if possible.
  const preserved = snapToRegionPreservingAxis(stormPlacementRegion, axis, target);
  if (preserved) return preserved;

  // Otherwise, return the closest point.
  return clampToRegion(target, stormPlacementRegion);
};

interface ICoordinateInputProps {
  axis: Axis;
}
const CoordinateInput = observer(function CoordinateInput({ axis }: ICoordinateInputProps) {
  const stores = useStores();
  const { center } = stores.simulation.hurricane;
  // lng is stored as a negative number, but displayed as a positive W value.
  const coord = axis === "lat" ? center.lat : Math.abs(center.lng);
  const formattedCoord = coord.toFixed(2);
  const [text, setText] = useState(formattedCoord);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reselect the text if the input field was focused and the value changed via another source.
  // This only happens when tabbing between the two inputs, when changes to one triggers a change in the other.
  const reselect = useRef(false);
  useLayoutEffect(() => {
    if (reselect.current && inputRef.current && document.activeElement === inputRef.current) {
      inputRef.current.select();
    }
    reselect.current = false;
  });

  // Update the input when the coordinate changes from another source, like the marker being dragged.
  useEffect(() => {
    // Skips the initial mount, where text already equals formattedCoord —
    // without it the reselect flag sticks around and triggers the above useLayoutEffect on the first keystroke.
    if (text === formattedCoord) return;

    reselect.current = true;
    setText(formattedCoord);

    // Exclude text because we only want to check this when the model changes from under the input field.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formattedCoord]);

  const revert = () => setText(formattedCoord);

  const commit = (e: React.FocusEvent<HTMLInputElement>) => {
    const newText = e.target.value;
    const parsed = parseFloat(newText);

    // If the value isn't a legal number, revert and bail.
    if (!isFinite(parsed)) {
      revert();
      return;
    }

    const lat = axis === "lat" ? parsed : center.lat;
    // lng is stored as a negative number, but displayed as a positive W value, so we need to flip the sign.
    const lng = axis === "lat" ? center.lng : -1 * parsed;
    const newPoint = getClosestPoint(axis, { lat, lng });
    stores.simulation.setStartLocation(newPoint);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    } else if (e.key === "Escape") {
      revert();
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.select();
  };

  const id = `storm-location-${axis}`;
  return (
    <div className={css.coordinate}>
      <label className={css.label} htmlFor={id}>{axis === "lat" ? "Lat" : "Lon"}</label>
      <input
        id={id}
        ref={inputRef}
        className={css.input}
        type="text"
        value={text}
        onChange={e => setText(e.target.value)}
        onFocus={handleFocus}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        data-test={`storm-location-${axis}-input`}
      />
      <div>°{axis === "lat" ? "N" : "W"}</div>
    </div>
  );
});

export function StormLocationSection() {
  return (
    <SetupSection
      dataTest="storm-location"
      hint={hint}
      Icon={StormLocationIcon}
      setupMode="stormLocation"
      title="Storm Location"
    >
      <div className={css.coordinates}>
        <CoordinateInput axis="lat" />
        <CoordinateInput axis="lng" />
      </div>
    </SetupSection>
  );
}
