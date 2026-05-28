import { observer } from "mobx-react";
import React, { useEffect, useState } from "react";

import { useStores } from "../../stores-context";
import { SetupSection } from "./setup-section";

import HurricaneIcon from "../../assets/left-panel/hurricane.svg";

import css from "./storm-location-section.scss";

const hint = "Drag the storm to a starting position within the highlighted area on the map, "
  + "or type a latitude and longitude below.";

const formatCoord = (value: number) => value.toFixed(2);

export const StormLocationSection = observer(function StormLocationSection() {
  const stores = useStores();
  const center = stores?.simulation.hurricane.center;
  const lat = center?.lat ?? 0;
  const lng = center?.lng ?? 0;

  const [latText, setLatText] = useState(formatCoord(lat));
  const [lngText, setLngText] = useState(formatCoord(lng));

  // Keep inputs synced to the model on every model change — including while
  // focused, so drag updates the focused input live.
  useEffect(() => {
    setLatText(formatCoord(lat));
  }, [lat]);
  useEffect(() => {
    setLngText(formatCoord(lng));
  }, [lng]);

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
          data-test="storm-location-lat-input"
        />
        <label className={css.label} htmlFor="storm-location-lng">Longitude</label>
        <input
          id="storm-location-lng"
          className={css.input}
          type="text"
          value={lngText}
          onChange={e => setLngText(e.target.value)}
          data-test="storm-location-lng-input"
        />
      </div>
    </SetupSection>
  );
});
