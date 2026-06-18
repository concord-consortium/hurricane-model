import Checkbox from "@mui/material/Checkbox";
import { observer } from "mobx-react";
import * as React from "react";

import { log } from "../../log";
import { useStores } from "../../stores-context";
import { temperatureScale } from "../../temperature-scale";
import genericKeyCss from "./map-button-key.scss";
import css from "./sst-key.scss";

const getFahrenheit = (celsius: number) => {
  return (celsius * 9 / 5) + 32;
};

const renderTemperatureLabels = (increments: number, tempScaleName: string) => {
  const celsiusLabels = [];
  const fahrenheitLabels = [];
  const keyColorGradientStops = [];
  for (let i = increments - 1; i >= 0; i--) {
    const celsiusValue = i * 4;
    const symbol = i === 0 ? <span>&lt;</span> : i === (increments - 1) ? <span>&ge;</span> : "";
    keyColorGradientStops.push(temperatureScale(celsiusValue, tempScaleName));
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

export const SSTKey = observer(function SSTKey() {
  const stores = useStores();
  const { sstOverlay } = stores.ui;

  const toggleAccessibleKey = (e: React.MouseEvent<HTMLButtonElement>) => {
    const newValue = !sstOverlay.accessibleSSTScale;
    sstOverlay.setAccessibleSSTScale(newValue);
    if (newValue) {
      log("AccessibleSSTScaleEnabled");
    } else {
      log("AccessibleSSTScaleDisabled");
    }
    // This prevents closing the whole map button that also reacts to click event.
    e.stopPropagation();
  }

  return (
    <div>
      <div className={`${genericKeyCss.keySubheader} ${css.units}`}><span>°C</span><span>°F</span></div>
      <div className={genericKeyCss.keyContent}>
        { renderTemperatureLabels(9, sstOverlay.sstScaleName) }
      </div>
      <div className={css.checkbox}>
        <Checkbox
          className={css.checkboxElement}
          checked={sstOverlay.accessibleSSTScale}
          onClick={toggleAccessibleKey}
        /> Accessible Key
      </div>
    </div>
  );
});
