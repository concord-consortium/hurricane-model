import * as React from "react";
import { inject, observer } from "mobx-react";
import { BaseComponent, IBaseProps } from "./base";
import { PressureSystem } from "../models/pressure-system";
import { PressureSystemIcon } from "./pressure-system-icon";
import { LeafletCustomMarker } from "./leaflet-custom-marker";
import config from "../config";
import { log } from "@concord-consortium/lara-interactive-api";
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
    const ui = this.stores.ui;
    const uiDisabled = config.pressureSystemsLocked || ui.thermometerActive ||
      (config.lockSimulationWhileRunning && sim.simulationStarted);
    return (
      <LeafletCustomMarker
        position={model.center}
        onDrag={this.handlePressureSysDrag}
        onDragEnd={this.handlePressureSysDragEnd}
        // Disable dragging when slider is being dragged, so they don't interfere.
        draggable={!sliderDrag && !uiDisabled}
      >
        <PressureSystemIcon
          model={model}
          onSliderDrag={this.handleDrag}
          onSliderDragEnd={this.handleDragEnd}
        />
      </LeafletCustomMarker>
    );
  }

  public handlePressureSysDrag = (e: Leaflet.LeafletMouseEvent) => {
    const { model } = this.props;
    this.stores.simulation.setPressureSysCenter(model, e.latlng);
  }

  public handlePressureSysDragEnd = () => {
    const { model } = this.props;
    log("PressureSystemMoved", { type: model.type, lat: model.center.lat, lng: model.center.lng });
  }

  private handleDrag = () => {
    if (!this.state.sliderDrag) {
      this.setState({ sliderDrag: true });
    }
  }

  private handleDragEnd = () => {
    this.setState({ sliderDrag: false });
  }
}
