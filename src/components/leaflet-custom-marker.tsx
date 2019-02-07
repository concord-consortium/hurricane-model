import * as React from "react";
import { Marker } from "react-leaflet";
import * as ReactDOM from "react-dom";
import * as Leaflet from "leaflet";

let ID = 0;
const getIconID = () => `leaflet-marker-custom-icon-${ID++}`;

interface IProps {
  position: Leaflet.LatLngExpression;
  // Icon is passed as children.
  children?: React.ReactNode | React.ReactNode[];
  draggable?: boolean;
  onDrag?(event: Leaflet.LeafletEvent): void;
  onDragEnd?(event: Leaflet.DragEndEvent): void;
}
interface IState {}

// Custom Marker wrapper that lets you implement icon element using dynamic React Component instead of HTML string.
export class LeafletCustomMarker extends React.Component<IProps, IState> {
  private iconId = getIconID();
  private icon: Leaflet.DivIcon = new Leaflet.DivIcon({
    className: "",
    html: `<div id="${this.iconId}"></div>`
  });

  public render() {
    const { children, position, onDrag, onDragEnd, draggable } = this.props;
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
          // this.icon will eventually cause that iconContainer is inserted into DOM and found in this render method.
          icon={this.icon}
          position={position}
          onDrag={onDrag}
          onDragEnd={onDragEnd}
          draggable={draggable}
        />,
        iconContainer && ReactDOM.createPortal(children, iconContainer)
      ]
    );
  }
}
