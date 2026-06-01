import React, { useState } from "react";
import * as Leaflet from "leaflet";
import { observer } from "mobx-react";

import HurricaneIconSVG from "../assets/hurricane.svg";
import config from "../config";
import { log } from "../log";
import { useStores } from "../stores-context";
import { getDirectionLetter } from "../utils/lat-long";
import { clampToRegion } from "../utils/region";
import { stormPlacementRegion } from "../utils/storm-placement-region";
import { CategoryNumber } from "./category-number";
import { DraggableMapIcon } from "./draggable-map-icon";
import { LeafletCustomMarker } from "./leaflet-custom-marker";

import HurricaneImageSrc from "../assets/hurricane-image.png";

import categoryCss from "./hurricane-category.scss";
import css from "./hurricane-marker.scss";

// Realistic hurricane image size can be adjusted here or in CSS. Really small values in CSS
// cause that the image drifts slightly off center. That's why it's better to keep smaller scale value.
const HURRICANE_IMG_SCALE_FACTOR = 0.05;

export const HurricaneMarker = observer(function HurricaneMarker() {
  const [dragging, setDragging] = useState(false);
  const stores = useStores();

  const { ui, simulation } = stores;
  const { hurricane, simulationStarted } = simulation;
  const draggable = ui.setupMode === "stormLocation" && !simulationStarted;

  const handleDrag = (e: Leaflet.LeafletEvent) => {
    const { hurricane, pressureSystems } = stores.simulation;
    const marker = e.target as Leaflet.Marker;
    const raw = marker.getLatLng();
    const clamped = clampToRegion({ lat: raw.lat, lng: raw.lng }, stormPlacementRegion);
    hurricane.setCenter(clamped, pressureSystems);
    if (clamped.lat !== raw.lat || clamped.lng !== raw.lng) {
      marker.setLatLng(clamped);
    }
    setDragging(true);
  }

  const handleDragEnd = (e: Leaflet.DragEndEvent) => {
    const { lat, lng } = (e.target as Leaflet.Marker).getLatLng();
    const startLocation = { lat, lng };
    stores.simulation.setStartLocation(startLocation);
    log("StartLocationChanged", { startLocation });
    setDragging(false);
  }

  return (
    <LeafletCustomMarker
      position={hurricane.center}
      draggable={draggable}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
    >
      <HurricaneIcon dragging={dragging} />
    </LeafletCustomMarker>
  );
});

const hurrStrengthToOpacity = (strength: number) => {
  // Gradually fade away hurricane when it gets really weak and it's going to disappear soon.
  const range = 5;
  const threshold = config.minHurricaneStrength + range;
  if (strength < threshold) {
    return 1 - (threshold - strength) / range;
  }
  return 1;
};

// Keep it as separate class so it's easier to test it.
// Note that LeafletCustomMarker does rendering in a pretty awkward way, so it's hard to test these components together.
interface IHurricaneIconProps {
  dragging?: boolean;
}
export const HurricaneIcon = observer(function HurricaneIcon({ dragging }: IHurricaneIconProps) {
  const stores = useStores();

  const hurricane = stores.simulation.hurricane;
  const categoryCssClass = categoryCss["category" + hurricane.category];
  const temp = stores.simulation.seaSurfaceTempAt(hurricane.center);
  const opacity = hurrStrengthToOpacity(hurricane.strength);

  const { hurricaneImage, mapZoom, setupMode } = stores.ui;
  const dimmed = !!setupMode && setupMode !== "stormLocation";
  const draggable = setupMode === "stormLocation";

  const getLabel = () => {
    if (dragging) {
      const { lat, lng } = hurricane.center;
      const latL = getDirectionLetter(lat, "lat");
      const lngL = getDirectionLetter(lng, "lng");
      return `${Math.abs(lat).toFixed(2)}°${latL}, ${Math.abs(lng).toFixed(2)}°${lngL}`;
    } else if (temp !== null) {
      return `Sea Surface Temp: ${temp.toFixed(1)} °C`;
    }

    return "";
  };
  const label = getLabel();

  // Note that the realistic hurricane image should scale with the map. This is simplified scaling that only uses
  // the map zoom. The real one should also take into account the map projection. But since it's a simplified view
  // anyway, I don't think we want distract users with hurricane changing its size only because it moved on the map.
  const hurricaneImageScale = Math.pow(2, mapZoom) * HURRICANE_IMG_SCALE_FACTOR;
  return (
    <DraggableMapIcon dimmed={dimmed} disabled={!draggable} label={label}>
      <div className={css.hurricaneMarker}>
        <div className={`${css.svgContainer} ${categoryCssClass}`} style={{ opacity }}>
          {
            hurricaneImage ?
              <img
                data-test="hurricane-image"
                src={HurricaneImageSrc}
                style={{ transform: `scale(${hurricaneImageScale})` }}
              /> :
              <HurricaneIconSVG />
          }
        </div>
        <CategoryNumber className="hurricaneMarker" value={hurricane.category} />
      </div>
    </DraggableMapIcon>
  );
});
