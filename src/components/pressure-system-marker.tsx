import * as React from "react";
import { inject, observer } from "mobx-react";
import { BaseComponent, IBaseProps } from "./base";
import { PressureSystem } from "../models/pressure-system";
import { PressureSystemIcon } from "./pressure-system-icon";
import { Marker } from "react-leaflet";
import * as ReactDOM from "react-dom";
import * as Leaflet from "leaflet";

let ID = 0;
const getPressureSysIconId = () => `pressure-sys-icon-${ID++}`;

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
  private iconId = getPressureSysIconId();
  private icon: Leaflet.DivIcon = new Leaflet.DivIcon({
    className: "",
    html: `<div id="${this.iconId}"></div>`
  });

  public render() {
    const { model } = this.props;
    const { sliderDrag } = this.state;
    // Rendering of this component is pretty awkward. Marker component accepts icon only as an instance of L.DivIcon
    // which accepts HTML content as... a string. So, it's impossible to easily create dynamic icon defined using React
    // Component and JSX. Workaround is to create just a div container, and then render a proper React component
    // into it using React Portals. However, this container will be created after the 1st render pass is done.
    // That's why we need forceUpdate to force React to render this component for a second time. Another approach would
    // be to implement a custom, better Marker replacement. However, this seems to work fine for now.
    const iconContainer = document.getElementById(this.iconId);
    if (!iconContainer) {
      setTimeout(() => {
        this.forceUpdate();
      }, 1);
    }

    return (
      [
        <Marker
          key="marker"
          position={model.center}
          // this.icon will eventually cause that iconContainer is inserted into DOM and found in this render method.
          icon={this.icon}
          onDrag={this.handlePressureSysDrag}
          onDragEnd={this.handlePressureSysDragEnd}
          // Disable dragging when slider is being dragged, so they don't interfere.
          draggable={!sliderDrag}
        />,
        iconContainer && ReactDOM.createPortal(
          <PressureSystemIcon
            model={model}
            onSliderDragStart={this.handleDragStart}
            onSliderDragEnd={this.handleDragEnd}
          />,
          iconContainer
        )
      ]
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
