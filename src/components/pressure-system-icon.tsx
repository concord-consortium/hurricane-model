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
import { DraggableMapIcon } from "./draggable-map-icon";
import css from "./pressure-system-icon.scss";

export const minStrength = 3;
export const maxStrength = 20;
export const mbLabelRange = 13;

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
  dimmed?: boolean;
  disabled?: boolean;
  onSliderDrag?: () => void;
  onSliderDragEnd?: () => void;
}
interface IState {}

const getPressureLabel = (model: PressureSystem) => {
  const normalizedStrength = (model.strength - minStrength) / (maxStrength - minStrength);
  if (model.type === "high") {
    return Math.round(1015 + normalizedStrength * mbLabelRange) + " mb";
  } else {
    return Math.round(1010 - normalizedStrength * mbLabelRange) + " mb";
  }
};

@inject("stores")
@observer
export class PressureSystemIcon extends BaseComponent<IProps, IState> {

  public render() {
    const { model, dimmed, disabled } = this.props;
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
        {
          model.type === "high" ?
            <High className={css.letter} style={letterStyle} /> :
            <Low className={css.letter} style={letterStyle} />
        }
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
