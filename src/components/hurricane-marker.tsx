import * as React from "react";
import { inject, observer } from "mobx-react";
import { BaseComponent, IBaseProps } from "./base";
import { LeafletCustomMarker } from "./leaflet-custom-marker";
import HurricaneIconSVG from "../assets/hurricane.svg";
import * as HurricaneImageSrc from "../assets/hurricane-image.png";
import CategoryMarkerSVG from "../assets/category-marker.svg";
import config from "../config";
import { ITrackPoint } from "../types";

import * as css from "./hurricane-marker.scss";

interface IProps extends IBaseProps { }
interface ICategoryMarkerProps extends IProps {
  point: ITrackPoint;
}
interface IState {}

// Realistic hurricane image size can be adjusted here or in CSS. Really small values in CSS
// cause that the image drifts slightly off center. That's why it's better to keep smaller scale value.
const HURRICANE_IMG_SCALE_FACTOR = 0.05;

@inject("stores")
@observer
export class HurricaneMarker extends BaseComponent<IProps, IState> {
  public render() {
    const hurricane = this.stores.simulation.hurricane;
    return (
      <LeafletCustomMarker position={hurricane.center} draggable={false}>
        <HurricaneIcon />
      </LeafletCustomMarker>
    );
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
      <div className={`${css.hurricaneIcon} ${categoryCssClass}`}>
        <div className={css.svgContainer} style={{ opacity }}>
          {
            hurricaneImage ?
              <img src={HurricaneImageSrc} style={{ transform: `scale(${hurricaneImageScale})` }} /> :
              <HurricaneIconSVG />
          }
        </div>
        <div className={css.categoryNumber} data-test="hurricane-category" style={{ opacity }}>
          { hurricane.category === 0 ? "TS" : hurricane.category }
        </div>
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

export class HurricaneCategoryMarker extends BaseComponent<ICategoryMarkerProps, IState> {
  public render() {
    const categoryChangePoint = this.props.point;
    const categoryCssClass = css["category" + categoryChangePoint.category];
    return (
      <LeafletCustomMarker position={categoryChangePoint.position} draggable={false}>
        <div className={`${css.hurricaneIcon} ${categoryCssClass}`}>
          <div className={css.svgContainer}>
            <CategoryMarkerSVG />
          </div>
          <div className={css.categoryNumber} data-test="hurricane-category">
            { categoryChangePoint.category === 0 ? "TS" : categoryChangePoint.category }
          </div>
        </div>
      </LeafletCustomMarker>
    );
  }
}
