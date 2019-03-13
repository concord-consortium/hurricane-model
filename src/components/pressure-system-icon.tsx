import * as React from "react";
import { inject, observer } from "mobx-react";
import { BaseComponent, IBaseProps } from "./base";
import { PressureSystem } from "../models/pressure-system";
import Slider from "@material-ui/lab/Slider";
import VerticalHandle from "../assets/slider-vertical.svg";
import High from "../assets/high.svg";
import Low from "../assets/low.svg";
import DragIcon from "../assets/drag.svg";
import config from "../config";

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
    const sim = this.stores.simulation;
    const strengthNorm = (model.strength - minStrength) / (maxStrength - minStrength) - 0.5; // [-0.5, 0.5]
    const letterScale = 1 + strengthNorm * 0.3; // adjust level of visual scaling
    const letterStyle = { transform: `scale3d(${letterScale},${letterScale},${letterScale})` };
    // If set to lock the UI while the simulation is running, lock UI once the sim is started until it is reset
    const uiDisabled = config.lockSimulationWhileRunning && sim.simulationStarted;
    return (
      <div className={css.pressureSystemIcon}>
        <div className={css.dragIcon}><DragIcon /></div>
        {
          model.type === "high" ?
            <High className={css.letter} style={letterStyle} /> :
            <Low className={css.letter} style={letterStyle} />
        }
        <div className={css.sliderContainer}>
          <Slider
            classes={{ thumb: css.thumb, track: css.track }}
            value={model.strength}
            min={minStrength}
            max={maxStrength}
            onChange={this.handleStrengthChange}
            onDragStart={onSliderDragStart}
            onDragEnd={onSliderDragEnd}
            vertical={true}
            thumb={<VerticalHandle />}
            disabled={uiDisabled}
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
