import * as React from "react";
import { inject, observer } from "mobx-react";
import { BaseComponent, IBaseProps } from "./base";
import { PressureSystem } from "../models/pressure-system";
import Slider, { SliderThumb } from "@mui/material/Slider";
import VerticalHandle from "../assets/slider-vertical.svg";
import High from "../assets/high.svg";
import Low from "../assets/low.svg";
import config from "../config";
import { log } from "../log";
import { minStrength, maxStrength, mbLabelRange, strengthToMb } from "../utils/pressure";
import { DraggableMapIcon } from "./draggable-map-icon";
import css from "./pressure-system-icon.scss";

// Re-exported from utils/pressure (the single source) so existing imports of these keep working.
export { minStrength, maxStrength, mbLabelRange };

const VerticalThumb = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  (props, ref) => {
    const { children, ...other } = props;
    return (
      <SliderThumb ref={ref} {...other}>
        {children}
        <VerticalHandle />
      </SliderThumb>
    );
  }
);

interface IProps extends IBaseProps {
  model: PressureSystem;
  // Per-type label (H1, H2, L1, L2…) shown as a small badge on the letter, matching the run cards.
  systemNumber?: number;
  dimmed?: boolean;
  disabled?: boolean;
  onSliderDrag?: () => void;
  onSliderDragEnd?: () => void;
}
interface IState {}

const getPressureLabel = (model: PressureSystem) => strengthToMb(model.type, model.strength) + " mb";

@inject("stores")
@observer
export class PressureSystemIcon extends BaseComponent<IProps, IState> {

  public render() {
    const { model, systemNumber, dimmed, disabled } = this.props;
    const strengthNorm = (model.strength - minStrength) / (maxStrength - minStrength) - 0.5; // [-0.5, 0.5]
    const letterScale = 1 + strengthNorm * 0.3; // adjust level of visual scaling
    const letterStyle = { transform: `scale3d(${letterScale},${letterScale},${letterScale})` };
    const uiDisabled = disabled ?? false;

    return (
      <DraggableMapIcon
        dataTest="pressure-system-icon"
        dimmed={dimmed}
        disabled={uiDisabled}
        label={this.renderLabel()}
      >
        <span className={css.letterWrap}>
          {
            model.type === "high" ?
              <High className={css.letter} style={letterStyle} /> :
              <Low className={css.letter} style={letterStyle} />
          }
          {systemNumber != null &&
            <span
              className={model.type === "high" ? `${css.systemBadge} ${css.high}` : `${css.systemBadge} ${css.low}`}
              data-test="pressure-system-number"
            >
              {systemNumber}
            </span>
          }
        </span>
        {
          !config.pressureSystemsLocked &&
          <div
            className={css.sliderContainer}
            onMouseDown={this.stopPropagation}
            onTouchStart={this.stopPropagation}
          >
            <Slider
              classes={{ thumb: css.thumb, track: css.track, rail: css.rail, disabled: css.disabled }}
              value={model.type === "high" ? model.strength : maxStrength + minStrength - model.strength}
              min={minStrength}
              max={maxStrength}
              onChange={this.handleStrengthChange}
              onChangeCommitted={this.handleSliderDragEnd}
              orientation="vertical"
              slots={{ thumb: VerticalThumb }}
              disabled={uiDisabled}
              data-test="pressure-system-slider"
            />
          </div>
        }
      </DraggableMapIcon>
    );
  }

  public renderLabel() {
    const { model } = this.props;
    return getPressureLabel(model);
  }

  public handleStrengthChange = (e: any, value: number | number[]) => {
    const { model, onSliderDrag } = this.props;
    if (onSliderDrag) {
      onSliderDrag();
    }
    const numericValue = Array.isArray(value) ? value[0] : value;
    if (model.type === "low") {
      model.setStrength(maxStrength + minStrength - numericValue);
    } else {
      model.setStrength(numericValue);
    }
  }

  public stopPropagation = (e: React.SyntheticEvent) => {
    e.stopPropagation();
  }

  public handleSliderDragEnd = () => {
    const { onSliderDragEnd, model } = this.props;
    if (onSliderDragEnd) {
      onSliderDragEnd();
    }
    log("PressureSystemStrengthUpdated", {
      type: model.type,
      lat: model.center.lat,
      lng: model.center.lng,
      value: getPressureLabel(model)
    });
  }
}
