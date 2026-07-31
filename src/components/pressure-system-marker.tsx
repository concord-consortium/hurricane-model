import * as React from "react";
import { inject, observer } from "mobx-react";
import { BaseComponent, IBaseProps } from "./base";
import { PressureSystem } from "../models/pressure-system";
import { PressureSystemIcon } from "./pressure-system-icon";
import { LeafletCustomMarker } from "./leaflet-custom-marker";
import config from "../config";
import { log } from "../log";
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
    const { simulation, ui } = this.stores;
    const { isReportMode, setupMode } = ui;
    const uiDisabled = isReportMode || config.pressureSystemsLocked || ui.thermometerActive ||
      (config.lockSimulationWhileRunning && simulation.simulationStarted);
    const isStormDisabled = config.mode === "storm" && setupMode !== "pressureSystems";
    const disabled = uiDisabled || isStormDisabled || this.stores.multiTrack.setupLocked;
    const dimmed = setupMode !== undefined && isStormDisabled;
    return (
      <LeafletCustomMarker
        position={model.center}
        onDrag={this.handlePressureSysDrag}
        onDragEnd={this.handlePressureSysDragEnd}
        // Disable dragging when slider is being dragged, so they don't interfere.
        draggable={!sliderDrag && !disabled}
      >
        <PressureSystemIcon
          model={model}
          dimmed={dimmed}
          disabled={disabled}
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
