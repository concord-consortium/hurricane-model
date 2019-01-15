import * as React from "react";
import { inject, observer } from "mobx-react";
import { BaseComponent, IBaseProps } from "./base";
import { Map, TileLayer, Marker } from "react-leaflet";
import { PixiWindLayer } from "./pixi-wind-layer";
import config from "../config";
import * as Leaflet from "leaflet";
import * as hurricaneSvg from "../assets/hurricane.svg";

import * as css from "./map-view.scss";
import "leaflet/dist/leaflet.css";

interface IProps extends IBaseProps {}
interface IState {}

// Show North Atlantic.
const bounds: [[number, number], [number, number]] = [[10, -80], [50, -10]];

const highPressureIcon = new Leaflet.DivIcon({className: css.highPressure, html: "H"});
const lowPressureIcon = new Leaflet.DivIcon({className: css.lowPressure, html: "L"});
const hurricaneIcon = new Leaflet.DivIcon({
  className: css.hurricane,
  html: `<div class="${css.hurricaneContainer}">${hurricaneSvg}</div>`
});

@inject("stores")
@observer
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
      <div className={css.mapView}>
        <Map ref={this.mapRef}
             maxBounds={config.navigation ? undefined : bounds}
             dragging={config.navigation}
             zoomControl={config.navigation}
             doubleClickZoom={config.navigation}
             scrollWheelZoom={config.navigation}
             boxZoom={config.navigation}
             keyboard={config.navigation}
             style={{width: "100%", height: "100%"}}
             onViewportChanged={this.handleViewportChanged}
             zoom={5}
             center={[30, -45]}
        >
          <PixiWindLayer />
          <TileLayer
            attribution={"Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping,"
            + "Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"}
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
          {
            this.stores.simulation.highPressure &&
            <Marker
              position={this.stores.simulation.highPressure}
              icon={highPressureIcon}
              onDrag={this.handleHighPressureDrag}
              draggable={true}
            />
            }
          {
            this.stores.simulation.lowPressure &&
            <Marker
              position={this.stores.simulation.lowPressure}
              icon={lowPressureIcon}
              onDrag={this.handleLowPressureDrag}
              draggable={true}
            />
          }
          {
            <Marker
              position={this.stores.simulation.hurricanePos}
              icon={hurricaneIcon}
            />
          }
        </Map>
      </div>
    );
  }

  get leafletMap() {
    const map = this.mapRef.current;
    return map && map.leafletElement;
  }

  private setSize = () => {
    if (this.leafletMap) {
      this.leafletMap.invalidateSize(false);
      this.leafletMap.fitBounds(bounds);
    }
  }

  private handleViewportChanged = () => {
    if (this.leafletMap) {
      this.stores.simulation.updateMap(this.leafletMap);
    }
  }

  private handleHighPressureDrag = (e: Leaflet.LeafletMouseEvent) => {
    this.stores.simulation.setHighPressure(e.latlng);
  }

  private handleLowPressureDrag = (e: Leaflet.LeafletMouseEvent) => {
    this.stores.simulation.setLowPressure(e.latlng);
  }
}
