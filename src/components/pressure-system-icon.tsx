import Slider, { SliderThumb } from "@mui/material/Slider";
import { clsx } from "clsx";
import { observer } from "mobx-react";
import React from "react";

import config from "../config";
import { log } from "../log";
import { PressureSystem } from "../models/pressure-system";
import { pressureLabel, invertLowStrength, strengthRange } from "../utils/pressure-systems";
import { DraggableMapIcon } from "./draggable-map-icon";

import High from "../assets/high.svg";
import Low from "../assets/low.svg";
import VerticalHandle from "../assets/slider-vertical.svg";

import css from "./pressure-system-icon.scss";

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

interface IProps {
  model: PressureSystem;
  dimmed?: boolean;
  disabled?: boolean;
  onSliderDrag?: () => void;
  onSliderDragEnd?: () => void;
}

export const PressureSystemIcon = observer(function PressureSystemIcon({
  model, dimmed, disabled, onSliderDrag, onSliderDragEnd
}: IProps) {
  const range = strengthRange[model.type];
  const strengthNorm = (model.strength - range.weak) / (range.strong - range.weak) - 0.5; // [-0.5, 0.5]
  const letterScale = 1 + strengthNorm * 0.3; // adjust level of visual scaling
  const letterStyle = { transform: `scale3d(${letterScale},${letterScale},${letterScale})` };
  const uiDisabled = disabled ?? false;

  const handleStrengthChange = (e: any, value: number | number[]) => {
    if (onSliderDrag) {
      onSliderDrag();
    }
    const numericValue = Array.isArray(value) ? value[0] : value;
    if (model.type === "low") {
      model.setStrength(invertLowStrength(numericValue));
    } else {
      model.setStrength(numericValue);
    }
  }

  const stopPropagation = (e: React.SyntheticEvent) => {
    e.stopPropagation();
  }

  const handleSliderDragEnd = () => {
    if (onSliderDragEnd) {
      onSliderDragEnd();
    }
    log("PressureSystemStrengthUpdated", {
      type: model.type,
      label: model.label,
      lat: model.center.lat,
      lng: model.center.lng,
      value: pressureLabel(model.type, model.strength)
    });
  }

  return (
    <DraggableMapIcon
      dataTest="pressure-system-icon"
      dimmed={dimmed}
      disabled={uiDisabled}
      label={pressureLabel(model.type, model.strength)}
    >
      {
        model.type === "high" ?
          <High className={css.letter} style={letterStyle} /> :
          <Low className={css.letter} style={letterStyle} />
      }
      {
        config.mode === "storm" && model.label &&
        <div
          className={clsx(css.labelBadge, model.type === "high" ? css.high : css.low)}
          data-test="pressure-system-label"
        >
          {model.label}
        </div>
      }
      {
        !config.pressureSystemsLocked &&
        <div
          className={css.sliderContainer}
          onMouseDown={stopPropagation}
          onTouchStart={stopPropagation}
        >
          <Slider
            classes={{ thumb: css.thumb, track: css.track, rail: css.rail, disabled: css.disabled }}
            value={model.type === "high" ? model.strength : invertLowStrength(model.strength)}
            min={range.weak}
            max={range.strong}
            onChange={handleStrengthChange}
            onChangeCommitted={handleSliderDragEnd}
            orientation="vertical"
            slots={{ thumb: VerticalThumb }}
            disabled={uiDisabled}
            data-test="pressure-system-slider"
          />
        </div>
      }
    </DraggableMapIcon>
  );
});
