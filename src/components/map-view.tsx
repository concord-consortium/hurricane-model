import * as React from "react";
import { BaseComponent, IBaseProps } from "./base";
import { Map, TileLayer } from "react-leaflet";

import "leaflet/dist/leaflet.css";

interface IProps extends IBaseProps {}
interface IState {}

// Show North Atlantic.
const maxBounds: [[number, number], [number, number]] = [[10, -70], [50, -20]];
const zoomingAndDragging = false;

export class MapView extends BaseComponent<IProps, IState> {
  private mapRef = React.createRef<Map>();

  public componentDidMount() {
    window.addEventListener("resize", this.setSize);
    setTimeout(this.setSize, 1);
  }

  public componentWillUnmount(): void {
    window.removeEventListener("resize", this.setSize);
  }

  public render() {
    return (
      <Map ref={this.mapRef}
           maxBounds={maxBounds}
           dragging={zoomingAndDragging}
           zoomControl={zoomingAndDragging}
           doubleClickZoom={zoomingAndDragging}
           scrollWheelZoom={zoomingAndDragging}
           boxZoom={zoomingAndDragging}
           keyboard={zoomingAndDragging}
           style={{width: "100%", height: "100%"}}
      >
        <TileLayer
          attribution={"Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid,"
          + " IGN, IGP, UPR-EGP, and the GIS User Community"}
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        />
      </Map>
    );
  }

  private setSize = () => {
    const map = this.mapRef.current;
    if (map) {
      const leafletMap = map.leafletElement;
      leafletMap.invalidateSize(false);
      leafletMap.fitBounds(maxBounds);
    }
  }
}
