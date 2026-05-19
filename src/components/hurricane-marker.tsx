import * as React from "react";
import * as Leaflet from "leaflet";
import { inject, observer } from "mobx-react";
import { BaseComponent, IBaseProps } from "./base";
import { LeafletCustomMarker } from "./leaflet-custom-marker";
import HurricaneIconSVG from "../assets/hurricane.svg";
import config from "../config";
import { CategoryNumber } from "./category-number";
import { clampToRegion } from "../utils/region";
import { stormPlacementRegion } from "../utils/storm-placement-region";
import { log } from "../log";

import HurricaneImageSrc from "../assets/hurricane-image.png";
import css from "./hurricane-marker.scss";

interface IProps extends IBaseProps { }
interface IState {}

// Realistic hurricane image size can be adjusted here or in CSS. Really small values in CSS
// cause that the image drifts slightly off center. That's why it's better to keep smaller scale value.
const HURRICANE_IMG_SCALE_FACTOR = 0.05;

@inject("stores")
@observer
export class HurricaneMarker extends BaseComponent<IProps, IState> {
  public render() {
    const { ui, simulation } = this.stores;
    const { hurricane, simulationStarted } = simulation;
    const draggable = ui.setupMode === "stormLocation" && !simulationStarted;
    return (
      <LeafletCustomMarker
        position={hurricane.center}
        draggable={draggable}
        onDrag={this.handleDrag}
        onDragEnd={this.handleDragEnd}
      >
        <HurricaneIcon />
      </LeafletCustomMarker>
    );
  }

  private handleDrag = (e: Leaflet.LeafletEvent) => {
    const marker = e.target as Leaflet.Marker;
    const raw = marker.getLatLng();
    const clamped = clampToRegion({ lat: raw.lat, lng: raw.lng }, stormPlacementRegion);
    if (clamped.lat !== raw.lat || clamped.lng !== raw.lng) {
      marker.setLatLng(clamped);
    }
  }

  private handleDragEnd = (e: Leaflet.DragEndEvent) => {
    const { lat, lng } = (e.target as Leaflet.Marker).getLatLng();
    const startLocation = { lat, lng };
    this.stores.simulation.setStartLocation(startLocation);
    log("StartLocationChanged", { startLocation });
  }
}

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
@inject("stores")
@observer
export class HurricaneIcon extends BaseComponent<IProps, IState> {
  public render() {
    const hurricane = this.stores.simulation.hurricane;
    const categoryCssClass = css["category" + hurricane.category];
    const temp = this.stores.simulation.seaSurfaceTempAt(hurricane.center);
    const opacity = hurrStrengthToOpacity(hurricane.strength);

    const hurricaneImage = this.stores.ui.hurricaneImage;
    const mapZoom = this.stores.ui.mapZoom;
    // Note that the realistic hurricane image should scale with the map. This is simplified scaling that only uses
    // the map zoom. The real one should also take into account the map projection. But since it's a simplified view
    // anyway, I don't think we want distract users with hurricane changing its size only because it moved on the map.
    const hurricaneImageScale = Math.pow(2, mapZoom) * HURRICANE_IMG_SCALE_FACTOR;
    return (
      <div className={`${css.hurricaneIcon}`}>
        <div className={`${css.svgContainer} ${categoryCssClass}`} style={{ opacity }}>
          {
            hurricaneImage ?
              <img src={HurricaneImageSrc} style={{ transform: `scale(${hurricaneImageScale})` }} /> :
              <HurricaneIconSVG />
          }
        </div>
        <CategoryNumber value={hurricane.category} />
        {
          temp !== null &&
          <div className={css.temp}>
            Sea Surface Temp: { temp.toFixed(1) } °C
          </div>
        }
      </div>
    );
  }
}
