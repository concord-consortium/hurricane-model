import * as React from "react";
import {inject, observer } from "mobx-react";
import { BaseComponent, IBaseProps } from "./base";
import { Map, TileLayer, ImageOverlay } from "react-leaflet";
import { PixiWindLayer } from "./pixi-wind-layer";
import { PressureSystemMarker } from "./pressure-system-marker";
import { HurricaneMarker } from "./hurricane-marker";
import { HurricaneTrack } from "./hurricane-track";
import config from "../config";
import { stores } from "../index";

import * as css from "./map-view.scss";
import "leaflet/dist/leaflet.css";

interface IProps extends IBaseProps {}
interface IState {}

// Show North Atlantic.
const bounds: [[number, number], [number, number]] = [[10, -80], [50, -10]];

const imageOverlayBounds: [[number, number], [number, number]] = [[-90, -180], [90, 180]];

@inject("stores")
@observer
export class MapView extends BaseComponent<IProps, IState> {
  private mapRef = React.createRef<Map>();

  public componentDidMount() {
    window.addEventListener("resize", this.handleWindowResize);
    setTimeout(this.handleWindowResize, 1);
  }

  public componentWillUnmount(): void {
    window.removeEventListener("resize", this.handleWindowResize);
  }

  public render() {
    const sim = this.stores.simulation;
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
          <ImageOverlay
            opacity={0.8}
            url={sim.seaSurfaceTempImgUrl}
            bounds={imageOverlayBounds}
          />
          <TileLayer
            attribution={"Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping,"
            + "Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"}
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
          <HurricaneTrack />
          {
            sim.pressureSystems.map((ps, idx) =>
              <PressureSystemMarker
                key={idx}
                model={ps}
              />
            )
          }
          <HurricaneMarker />
        </Map>
      </div>
    );
  }

  public get leafletMap() {
    const map = this.mapRef.current;
    return map && map.leafletElement;
  }

  public handleWindowResize = () => {
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
}
