import * as React from "react";
import Draggable from "react-draggable";

import DragIcon from "../assets/drag.svg";
import * as css from "./temperature-scale.scss";

interface IProps {}
interface IState {}

const surfaceTemperature: { [key: number]: number } = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32
};
const getFahrenheit = (celcius: number) => {
  return Math.round((celcius * 9 / 5) + 32);
};

const renderTemperature = (temperature: number) => {
  const barClass = `${css.bar} ${css[`barTemperature${temperature}`]}`;
  return (
    <div key={temperature} className={css.temperatureContainer}>
      <div className={css.temperatureValue}>{ getFahrenheit(surfaceTemperature[temperature]) }</div>
      <div className={barClass} />
      <div className={css.dot}>.</div>
      <div className={css.temperatureRange}>{ surfaceTemperature[temperature] }</div>
    </div>
   );
};

export class TemperatureScale extends React.PureComponent<IProps, IState> {
  public render() {
    const temperatures = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    return (
      <Draggable
        axis="both"
        bounds={"body"}
        handle="strong"
       >
        <div className={css.temperatureScale}>

          <div className={css.header}>
            Key: Sea Surface Temperature
            <strong className={css.dragIcon}><DragIcon /></strong>
          </div>
          <div className={css.scaleContainer}>
            <div className={css.subheaders}>
              <div className={css.temperatureFLabel}>Temperature (F)</div>
              <div className={css.temperatureCLabel}>Temperature (C)</div>
            </div>
            { temperatures.map(temp => renderTemperature(temp)) }
            <div className={css.degC}>&deg;C</div>
          </div>
        </div>
      </Draggable>
    );
  }
}
