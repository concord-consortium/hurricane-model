import * as React from "react";
import { inject, observer } from "mobx-react";
import { BaseComponent, IBaseProps } from "./base";
import { LeafletCustomMarker } from "./leaflet-custom-marker";
import * as css from "./hurricane-marker.scss";
import config from "../config";

interface IProps extends IBaseProps {}
interface IState {}

const hurricaneSVGIcon = (
  <svg width="200" height="200" viewBox="0,0,200,200">
    <g transform="matrix(1.407407,0,0,1.333333,120.3704,-276.4967)">
      <path
        d={"M 21.05263,282.71812 C 21.05263,263.14772 5.13832,247.26423 -14.46943,247.26423 C -20.99403," +
        "247.26423 -27.10709,249.01667 -32.36199,252.08515 C -25.97086,231.2175 -15.39876,214.28402 " +
        "-1.84069,207.37258 C -28.92355,216.4934 -47.76995,248.20401 -50,282.68374 C -50,302.25413 " +
        "-34.07718,318.17761 -14.46943,318.1776 C -8.02952,318.1776 -1.98598,316.46325 3.22446,313.46822 " +
        " C -3.19061,334.0152 -13.85506,350.53308 -27.272,357.37258 C -0.62131,348.3973 18.34408,316.45182 " +
        "21.05263,282.71812 z"}
      />
    </g>
  </svg>
);

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
          { hurricaneSVGIcon }
        </div>
        <div className={css.categoryNumber} data-test="hurricane-category" style={{ opacity }}>
          { hurricane.category }
        </div>
        {
          temp !== null &&
          <div className={css.temp}>
            sea temp: { temp.toFixed(2) }°C
          </div>
        }
      </div>
    );
  }
}