import * as React from "react";
import Draggable from "react-draggable";
import DragIcon from "../assets/drag.svg";
import * as scaleKey from "../../sea-surface-temp-img/tempScaleKey.png";
import * as css from "./temperature-scale.scss";

interface IProps { }
interface IState {
  expanded: boolean;
}

const getFahrenheit = (celcius: number) => {
  return Math.round((celcius * 9 / 5) + 32);
};

const renderTemperatureLabels = (increments: number) => {
  const celciusLabels = [];
  const fahrenheitLabels = [];
  for (let i = 0; i < increments; i++) {
    celciusLabels.push(
      <div key={"celcius" + i} className={css.temperatureContainer}>
        <div className={css.temperatureRange}>{i * 4}</div>
        <div className={css.dot}>.</div>
      </div>);
    fahrenheitLabels.push(
      <div key={"fahrenheit" + i} className={css.temperatureContainer}>
        <div className={css.temperatureRange}>{getFahrenheit(i * 4)}</div>
        <div className={css.dot}>.</div>
      </div>);
  }
  celciusLabels.push(<div className={css.temperatureContainer}>
    <div className={css.temperatureValue}>&deg;C</div></div>);
  fahrenheitLabels.push(<div className={css.temperatureContainer}>
                <div className={css.temperatureValue}>&deg;F</div></div>);
  return <div className={css.scaleContainer}>
    {fahrenheitLabels}
    <div className={css.scaleGradient} style={{ backgroundImage: `url(${scaleKey}` }} />
    {celciusLabels}
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
      <div className={css.temperatureContainer}>
        <Draggable
          axis="both"
          bounds="parent"
          handle="strong"
        >
          <div className={`${css.temperatureScale} ${expanded ? css.expanded : ""}`}>
            <div className={css.header}>
              KEY: Sea Surface Temperature
              <strong className={css.dragIcon}><DragIcon /></strong>
              <div className={`${css.minMax} ${expanded ? css.expanded : ""}`} onClick={this.toggleExpanded} >
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
