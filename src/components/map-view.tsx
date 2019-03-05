import * as React from "react";
import {inject, observer } from "mobx-react";
import { BaseComponent, IBaseProps } from "./base";
import { Map, TileLayer, ImageOverlay } from "react-leaflet";
import Control from "react-leaflet-control";
import { PixiWindLayer } from "./pixi-wind-layer";
import { PressureSystemMarker } from "./pressure-system-marker";
import { HurricaneMarker } from "./hurricane-marker";
import { HurricaneTrack } from "./hurricane-track";
import { LandfallRectangle } from "./landfall-rectangle";
import config from "../config";
import { stores } from "../index";
import CenterFocusStrong from "@material-ui/icons/CenterFocusStrong";

import * as css from "./map-view.scss";
import "leaflet/dist/leaflet.css";

interface IProps extends IBaseProps {}
interface IState {}

// Show North Atlantic.
const bounds: [[number, number], [number, number]] = [[10, -80], [50, -10]];
const maxBounds: [[number, number], [number, number]] = [[-10, -120], [80, -0]];

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
    const ui = this.stores.ui;
    return (
      <div className={css.mapView}>
        <Map ref={this.mapRef}
             maxBounds={maxBounds}
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
          <Control position="topleft" className="leaflet-bar">
            {
              ui.mapModified &&
              <a className={css.resetViewBtn}
                 onClick={this.resetView}
                 title="Reset view" role="button" aria-label="Reset view"
              >
                <CenterFocusStrong/>
              </a>
            }
          </Control>
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
            sim.landfalls.map((lf, idx) =>
              <LandfallRectangle key={idx} position={lf.position} category={lf.category} />
            )
          }
          {
            sim.pressureSystems.map((ps, idx) =>
              <PressureSystemMarker
                key={idx}
                model={ps}
              />
            )
          }
          {
            sim.hurricane.active && <HurricaneMarker />
          }
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
      this.resetView();
    }
  }

  public resetView = () => {
    if (this.leafletMap) {
      this.leafletMap.fitBounds(bounds);
      // Not the most elegant, but simple fix. `fitBounds` call will result in animation and `handleViewportChanged`
      // being called at its end. That would set mapModified flag to be set again.
      // So, make sure that model knows that map has been actually reset by the user.
      setTimeout(this.stores.ui.mapReset, 500);
    }
  }

  private handleViewportChanged = () => {
    if (this.leafletMap) {
      this.stores.simulation.updateBounds(this.leafletMap.getBounds());
      this.stores.ui.mapUpdated(this.leafletMap);
    }
  }
}
