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
    // Draggable whenever the setup is editable — no need to open Pressure Systems first; dragging a
    // marker opens that section (see the drag handlers). Only dim it when another section is active.
    const disabled = uiDisabled || this.stores.multiTrack.setupLocked;
    const dimmed = setupMode !== undefined && setupMode !== "pressureSystems";
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
    // Reveal the Pressure Systems section as soon as a marker is being moved.
    if (this.stores.ui.setupMode !== "pressureSystems") this.stores.ui.setSetupMode("pressureSystems");
    this.stores.simulation.setPressureSysCenter(model, e.latlng);
  }

  public handlePressureSysDragEnd = () => {
    const { model } = this.props;
    // Make sure the Pressure Systems section is visible in the setup panel.
    this.stores.ui.setLeftPanelOpen(true);
    this.stores.ui.setSetupMode("pressureSystems");
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
