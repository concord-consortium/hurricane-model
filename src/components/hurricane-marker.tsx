import * as React from "react";
import { inject, observer } from "mobx-react";
import { BaseComponent, IBaseProps } from "./base";
import { LeafletCustomMarker } from "./leaflet-custom-marker";
import HurricaneSVG from "../assets/hurricane.svg";
import CategoryMarkerSVG from "../assets/category-marker.svg";
import * as css from "./hurricane-marker.scss";
import config from "../config";
import { ITrackPoint } from "../types";

interface IProps extends IBaseProps { }
interface ICategoryMarkerProps extends IProps {
  point: ITrackPoint;
}
interface IState {}

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
    return (
      <div className={`${css.hurricaneIcon} ${categoryCssClass}`}>
        <div className={css.svgContainer} style={{ opacity }}>
          <HurricaneSVG />
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
