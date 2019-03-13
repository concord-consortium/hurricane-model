import * as React from "react";
import { inject, observer } from "mobx-react";
import { BaseComponent, IBaseProps } from "./base";
import { PressureSystem } from "../models/pressure-system";
import { PressureSystemIcon } from "./pressure-system-icon";
import { LeafletCustomMarker } from "./leaflet-custom-marker";
import * as Leaflet from "leaflet";

interface IProps extends IBaseProps {
  model: PressureSystem;
}
interface IState {}

@inject("stores")
@observer
export class PressureSystemMarker extends BaseComponent<IProps, IState> {
  public state = {
    sliderDrag: false
  };

  public render() {
    const { model } = this.props;
    const { sliderDrag } = this.state;
    const sim = this.stores.simulation;
    return (
      <LeafletCustomMarker
        position={model.center}
        onDrag={this.handlePressureSysDrag}
        onDragEnd={this.handlePressureSysDragEnd}
        // Disable dragging when slider is being dragged, so they don't interfere.
        draggable={!sliderDrag && !sim.simulationStarted && !sim.simulationRunning}
      >
        <PressureSystemIcon
          model={model}
          onSliderDragStart={this.handleDragStart}
          onSliderDragEnd={this.handleDragEnd}
        />
      </LeafletCustomMarker>
    );
  }

  public handlePressureSysDrag = (e: Leaflet.LeafletMouseEvent) => {
    const { model } = this.props;
    this.stores.simulation.setPressureSysCenter(model, e.latlng);
  }

  private handlePressureSysDragEnd = () => {
    const { model } = this.props;
    this.stores.simulation.checkPressureSystem(model);
  }

  private handleDragStart = () => {
    this.setState({ sliderDrag: true });
  }

  private handleDragEnd = () => {
    this.setState({ sliderDrag: false });
  }
}
