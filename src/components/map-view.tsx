import * as React from "react";
import { observe } from "mobx";
import { inject, observer } from "mobx-react";
import { BaseComponent, IBaseProps } from "./base";
import { Map, TileLayer, ImageOverlay, ZoomControl, AttributionControl } from "react-leaflet";
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

const imageOverlayBounds: [[number, number], [number, number]] = [[-90, -180], [90, 180]];

@inject("stores")
@observer
export class MapView extends BaseComponent<IProps, IState> {
  private mapRef = React.createRef<Map>();
  private _programmaticMapUpdate = false;

  public componentDidMount() {
    window.addEventListener("resize", this.handleWindowResize);
    setTimeout(this.handleWindowResize, 1);
    // Observe some properties manually. React-leaflet implementation is incomplete in some cases. Some properties
    // work only on the initial load, but it's impossible to update them later. That's why we need to access
    // Leaflet API directly.
    observe(this.stores.ui, "initialBounds", () => {
      const map = this.leafletMap;
      if (map) {
        // Remove restrictions for a moment so flyToBounds works correctly.
        map.setMinZoom(1);
        map.setMaxBounds([[-Infinity, -Infinity], [Infinity, Infinity]]);
        this._programmaticMapUpdate = true;
        map.flyToBounds(this.stores.ui.initialBounds);
        map.once("moveend", () => {
          // Calculate max bounds to be the area which is visible at the moment. It'll depend on the screen size.
          // Since it's initially visible, we don't want to restrict users more when they zoom in and Leaflet can
          // apply max bounds more precisely (that's why we don't use bounds as max bounds).
          // Also, apply small padding (3%) as it feels better and otherwise Leaflet is triggering another animations.
          const maxBounds = map.getBounds().pad(0.03);
          const minZoom = map.getZoom();
          map.setMinZoom(minZoom);
          map.setMaxBounds(maxBounds);
          this._programmaticMapUpdate = false;
        });
      }
    });
  }

  public componentWillUnmount(): void {
    window.removeEventListener("resize", this.handleWindowResize);
  }

  public render() {
    const sim = this.stores.simulation;
    const ui = this.stores.ui;
    const navigation = ui.zoomedInView || config.navigation;
    return (
      <div className={css.mapView}>
        <Map ref={this.mapRef}
             dragging={navigation}
             doubleClickZoom={navigation}
             scrollWheelZoom={navigation}
             boxZoom={navigation}
             keyboard={navigation}
             style={{width: "100%", height: "100%"}}
             onViewportChanged={this.handleViewportChanged}
             zoom={5}
             center={[30, -45]}
             zoomControl={false}
             attributionControl={false}
        >
          { navigation && <ZoomControl position="topleft"/> }
          {
            navigation && ui.mapModifiedByUser &&
            <Control position="topleft" className="leaflet-bar">
              <a className={css.resetViewBtn}
                 onClick={this.resetView}
                 title="Reset view" role="button" aria-label="Reset view"
              >
                <CenterFocusStrong/>
              </a>
            </Control>
          }
          <AttributionControl position="topright" />
          <PixiWindLayer />
          <ImageOverlay
            opacity={ui.layerOpacity.seaSurfaceTemp}
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
            sim.simulationFinished && !ui.zoomedInView && sim.landfalls.map((lf, idx) =>
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
    }
    this.resetView();
  }

  public resetView = () => {
    this.stores.ui.resetMapView();
  }

  private handleViewportChanged = () => {
    if (this.leafletMap) {
      this.stores.simulation.updateBounds(this.leafletMap.getBounds());
      this.stores.ui.mapUpdated(this.leafletMap, this._programmaticMapUpdate);
    }
  }
}
