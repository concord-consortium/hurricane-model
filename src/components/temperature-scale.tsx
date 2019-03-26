import * as React from "react";
import Draggable from "react-draggable";
import DragIcon from "../assets/drag.svg";
import * as css from "./temperature-scale.scss";
import { temperatureScale } from "../temperature-scale";

interface IProps {}
interface IState {
  expanded: boolean;
}

const getFahrenheit = (celsius: number) => {
  return (celsius * 9 / 5) + 32;
};

const renderTemperatureLabels = (increments: number) => {
  const celsiusLabels = [];
  const fahrenheitLabels = [];
  const keyColorGradientStops = [];
  for (let i = 0; i < increments; i++) {
    const celsiusValue = i * 4;
    const symbol = i === 0 ? <span>&lt;</span> : i === (increments - 1) ? <span>&ge;</span> : "";
    keyColorGradientStops.push(temperatureScale(celsiusValue));

    fahrenheitLabels.push(
      <div key={"fahrenheit" + i} className={css.temperatureContainer}>
        <div className={css.temperatureRange}>
          {symbol}
          {getFahrenheit(celsiusValue)}
        </div>
        <div className={css.dot}>.</div>
      </div>);

    celsiusLabels.push(
      <div key={"celsius" + i} className={css.temperatureContainer}>
        <div className={css.dot}>.</div>
        <div className={css.temperatureRange}>
          {symbol}
          {celsiusValue}{".0"}
        </div>
      </div>);
  }
  celsiusLabels.push(
    <div key={"celsiusUnits"} className={css.temperatureUnitsContainer}>
      <div className={css.temperatureUnitsC}>&deg;C</div>
    </div>);
  fahrenheitLabels.push(
    <div key={"fahrenheitUnits"} className={css.temperatureUnitsContainer}>
      <div className={css.temperatureUnitsF}>&deg;F</div>
    </div>);

  // build gradient
  const gradientStyle = { background: `linear-gradient(90deg, ${keyColorGradientStops.join(", ")})` };

  return <div className={css.scaleContainer}>
    {fahrenheitLabels}
    <div data-test="sea-temp-color-gradient"
      className={css.scaleGradient} style={gradientStyle} />
    {celsiusLabels}
  </div>;
};

export class TemperatureScale extends React.PureComponent<IProps, IState> {
  constructor(props: IProps) {
    super(props);
    this.state = { expanded: false };
  }
  public render() {
    const { expanded } = this.state;

    return (
      <div className={css.temperatureContainer} data-test="temperature-scale-key">
        <Draggable
          axis="both"
          bounds="#mapView"
          handle="strong"
        >
          <div className={`${css.temperatureScale} ${expanded ? css.expanded : ""}`}>
            <div className={css.header}>
              KEY: Sea Surface Temperature
              <strong className={css.dragIcon}><DragIcon /></strong>
              <div className={`${css.minMax} ${expanded ? css.expanded : ""}`}
                data-test="key-toggle-visible"
                onClick={this.toggleExpanded} >
                <div className={css.minMaxIcon} />
              </div>
            </div>
            {expanded && renderTemperatureLabels(8)}
          </div>
        </Draggable>
      </div>
    );
  }
  public toggleExpanded = () => {
    this.setState({ expanded: !this.state.expanded });
  }
}
