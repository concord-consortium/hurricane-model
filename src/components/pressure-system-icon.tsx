import * as React from "react";
import { inject, observer } from "mobx-react";
import { BaseComponent, IBaseProps } from "./base";
import { PressureSystem } from "../models/pressure-system";
import Slider from "@material-ui/lab/Slider";
import VerticalHandle from "../assets/slider-vertical.svg";

import * as css from "./pressure-system-icon.scss";

export const minStrength = 3;
export const maxStrength = 20;
export const mbLabelRange = 13;

interface IProps extends IBaseProps {
  model: PressureSystem;
  onSliderDragStart?: () => void;
  onSliderDragEnd?: () => void;
}
interface IState {}

@inject("stores")
@observer
export class PressureSystemIcon extends BaseComponent<IProps, IState> {

  public render() {
    const { model, onSliderDragStart, onSliderDragEnd } = this.props;

    return (
      <div className={css.pressureSystemIcon + " " + (model.type === "high" ? css.highPressure : css.lowPressure)}>
        { model.type === "high" ? "H" : "L" }
        <div className={css.sliderContainer}>
          <Slider
            value={model.strength}
            min={minStrength}
            max={maxStrength}
            onChange={this.handleStrengthChange}
            onDragStart={onSliderDragStart}
            onDragEnd={onSliderDragEnd}
            vertical={true}
            thumb={<VerticalHandle />}
          />
        </div>
        <div className={css.label}>
          { this.renderLabel() }
        </div>
      </div>
    );
  }

  public renderLabel() {
    const { model } = this.props;
    const normalizedStrength = (model.strength - minStrength) / (maxStrength - minStrength);
    if (model.type === "high") {
      return Math.round(1015 + normalizedStrength * mbLabelRange) + "mb";
    } else {
      return Math.round(1010 - normalizedStrength * mbLabelRange) + "mb";
    }
  }

  public handleStrengthChange = (e: any, value: number) => {
    const { model } = this.props;
    model.setStrength(value);
  }
}
