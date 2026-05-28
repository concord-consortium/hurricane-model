import { observer } from "mobx-react";
import React, { useEffect, useState } from "react";

import { ICoordinates } from "../../types";
import { useStores } from "../../stores-context";
import { clampToRegion, snapToRegionPreservingAxis } from "../../utils/region";
import { stormPlacementRegion } from "../../utils/storm-placement-region";
import { SetupSection } from "./setup-section";

import HurricaneIcon from "../../assets/left-panel/hurricane.svg";

import css from "./storm-location-section.scss";

const hint = "Drag the storm to a starting position within the highlighted area on the map, "
  + "or type a latitude and longitude below.";

const formatCoord = (value: number) => value.toFixed(2);

type Axis = "lat" | "lng";

const getClosestPoint = (
  axis: Axis,
  target: number,
  currentOther: number
): ICoordinates => {
  const candidate: ICoordinates = axis === "lat"
    ? { lat: target, lng: currentOther }
    : { lat: currentOther, lng: target };

  // If there's any legal point that includes the lat/long that just changed, use that.
  // This ensures the number just entered is preserved if possible.
  const preserved = snapToRegionPreservingAxis(stormPlacementRegion, axis, candidate);
  if (preserved) return preserved;

  // Otherwise, return the closest point.
  return clampToRegion(candidate, stormPlacementRegion);
};

export const StormLocationSection = observer(function StormLocationSection() {
  const stores = useStores();
  const center = stores?.simulation.hurricane.center;
  const lat = center?.lat ?? 0;
  const lng = center?.lng ?? 0;

  const [latText, setLatText] = useState(formatCoord(lat));
  const [lngText, setLngText] = useState(formatCoord(lng));

  // Keep inputs synced to the model on every model change — including while
  // focused, so drag updates the focused input live.
  useEffect(() => setLatText(formatCoord(lat)), [lat]);
  useEffect(() => setLngText(formatCoord(lng)), [lng]);

  const revert = (axis: Axis) => {
    if (axis === "lat") setLatText(formatCoord(lat));
    else setLngText(formatCoord(lng));
  };

  const commit = (axis: Axis, text: string) => {
    if (!stores) return;
    const parsed = parseFloat(text);

    // If the value isn't a legal number, revert and bail.
    if (!isFinite(parsed)) {
      revert(axis);
      return;
    }

    const currentOther = axis === "lat" ? lng : lat;
    const next = getClosestPoint(axis, parsed, currentOther);
    stores.simulation.setStartLocation(next);
  };

  const handleKeyDown = (axis: Axis) => (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    } else if (e.key === "Escape") {
      revert(axis);
    }
  };

  return (
    <SetupSection
      dataTest="storm-location"
      hint={hint}
      Icon={HurricaneIcon}
      setupMode="stormLocation"
      title="Storm Start Location"
    >
      <div className={css.coordinates}>
        <label className={css.label} htmlFor="storm-location-lat">Latitude</label>
        <input
          id="storm-location-lat"
          className={css.input}
          type="text"
          value={latText}
          onChange={e => setLatText(e.target.value)}
          onBlur={e => commit("lat", e.target.value)}
          onKeyDown={handleKeyDown("lat")}
          data-test="storm-location-lat-input"
        />
        <label className={css.label} htmlFor="storm-location-lng">Longitude</label>
        <input
          id="storm-location-lng"
          className={css.input}
          type="text"
          value={lngText}
          onChange={e => setLngText(e.target.value)}
          onBlur={e => commit("lng", e.target.value)}
          onKeyDown={handleKeyDown("lng")}
          data-test="storm-location-lng-input"
        />
      </div>
    </SetupSection>
  );
});
