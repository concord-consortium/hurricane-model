import * as React from "react";
import * as genericKeyCss from "./map-button-key.scss";
import * as css from "./sst-key.scss";
import {temperatureScale} from "../temperature-scale";

const getFahrenheit = (celsius: number) => {
  return (celsius * 9 / 5) + 32;
};

const renderTemperatureLabels = (increments: number) => {
  const celsiusLabels = [];
  const fahrenheitLabels = [];
  const keyColorGradientStops = [];
  for (let i = increments - 1; i >= 0; i--) {
    const celsiusValue = i * 4;
    const symbol = i === 0 ? <span>&lt;</span> : i === (increments - 1) ? <span>&ge;</span> : "";
    keyColorGradientStops.push(temperatureScale(celsiusValue));
    fahrenheitLabels.push(
      <div key={"fahrenheit" + i} className={css.temperatureContainer}>
        <div className={css.temperatureRange}>
          {symbol}
          {getFahrenheit(celsiusValue).toFixed(1)}
        </div>
      </div>);
    celsiusLabels.push(
      <div key={"celsius" + i} className={css.temperatureContainer}>
        <div className={css.temperatureRange}>
          {symbol}
          {celsiusValue.toFixed(1)}
        </div>
      </div>);
  }
  const gradientStyle = { background: `linear-gradient(-180deg, ${keyColorGradientStops.join(", ")})` };

  return <div className={css.scaleContainer}>
    <div className={css.column}>{celsiusLabels}</div>
    <div className={css.column}>
      <div data-test="sea-temp-color-gradient" className={css.scaleGradient} style={gradientStyle} />
    </div>
    <div className={css.column}>{fahrenheitLabels}</div>
  </div>;
};

export class SSTKey extends React.Component {
  public render() {
    return (
      <div>
        <div className={`${genericKeyCss.keySubheader} ${css.units}`}><span>°C</span><span>°F</span></div>
        <div className={genericKeyCss.keyContent}>
          { renderTemperatureLabels(9) }
        </div>
      </div>
    );
  }
}
