import { inject, observer } from "mobx-react";
import * as React from "react";
import { BaseComponent, IBaseProps } from "./base";
import * as css from "./opacity-slider.scss";
import Slider from "@material-ui/lab/Slider";
import HorizontalHandle from "../assets/slider-horizontal.svg";
import { TranslucentLayer } from "../models/ui";

interface IProps extends IBaseProps {
  property: TranslucentLayer;
  showLabels?: boolean;
}
interface IState {}

const labels = {
  windArrows: "Wind Direction and Speed",
  seaSurfaceTemp: "Sea Surface Temperature"
};

@inject("stores")
@observer
export class OpacitySlider extends BaseComponent<IProps, IState> {
  public render() {
    const { property, showLabels } = this.props;
    const label = labels[property];
    const value = this.stores.ui.layerOpacity[property];
    return (
      <div className={css.opacitySlider}>
        <div className={css.label}>{ label }</div>
        <div className={css.sliderContainer}>
          <Slider
            className={css.slider}
            classes={{thumb: css.thumb}}
            value={value}
            min={0}
            max={1}
            thumb={<HorizontalHandle />}
            onChange={this.handleChange}
          />
          { showLabels && <div className={css.hideLabel}>Hide</div> }
          { showLabels && <div className={css.showLabel}>Show</div> }
        </div>
      </div>
    );
  }

  public handleChange = (e: any, value: number) => {
    const { property } = this.props;
    this.stores.ui.setOpacity(property, value);
  }
}
