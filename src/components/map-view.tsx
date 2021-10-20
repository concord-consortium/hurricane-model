import * as React from "react";
import { observe } from "mobx";
import { inject, observer } from "mobx-react";
import { BaseComponent, IBaseProps } from "./base";
import { Map, TileLayer, ImageOverlay, ZoomControl, AttributionControl } from "react-leaflet";
import Control from "react-leaflet-control";
import { PixiWindLayer } from "./pixi-wind-layer";
import { PressureSystemMarker } from "./pressure-system-marker";
import { HurricaneMarker } from "./hurricane-marker";
import { HurricaneCategoryMarker } from "./hurricane-category-marker";
import { HurricaneTrack } from "./hurricane-track";
import { LandfallRectangle } from "./landfall-rectangle";
import { PrecipitationLayer } from "./precipitation-layer";
import config from "../config";
import CenterFocusStrong from "@material-ui/icons/CenterFocusStrong";
import Home from "@material-ui/icons/Home";
import { mapLayer } from "../map-layer-tiles";
import { StormSurgeOverlay } from "./storm-surge-overlay";
import { log } from "@concord-consortium/lara-interactive-api";
import { LeafletMouseEvent } from "leaflet";
import * as css from "./map-view.scss";
import { ThermometerMarker } from "./thermometer-marker";
import "leaflet/dist/leaflet.css";

interface IProps extends IBaseProps {}
interface IState {}

const imageOverlayBounds: [[number, number], [number, number]] = [[-90, -180], [90, 180]];

@inject("stores")
@observer
export class MapView extends BaseComponent<IProps, IState> {
  private mapRef = React.createRef<Map>();
  private _programmaticMapUpdate = false;
  private _lastThermometerUpdateTime = 0;

  public componentDidMount() {
    window.addEventListener("resize", this.handleWindowResize);
    window.addEventListener("fullscreenchange", this.handleWindowResize);
    setTimeout(this.handleWindowResize, 500);
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
    // This maxZoom option is not handled by react-leaftlet as a dynamic react property (it doesn't update after
    // Map component is created), so we need to use raw Leaflet API to dynamically change it.
    observe(this.stores.ui, "maxZoom", () => {
      const map = this.leafletMap;
      if (map) {
        map.setMaxZoom(this.stores.ui.maxZoom);
      }
    });
  }

  public componentWillUnmount(): void {
    window.removeEventListener("resize", this.handleWindowResize);
    window.removeEventListener("fullscreenchange", this.handleWindowResize);
  }

  public render() {
    const sim = this.stores.simulation;
    const ui = this.stores.ui;
    const navigation = !!ui.zoomedInView || config.navigation;
    return (
      <div className={css.mapView} id="mapView">
        <Map ref={this.mapRef}
             dragging={navigation}
             doubleClickZoom={navigation}
             scrollWheelZoom={navigation}
             boxZoom={navigation}
             keyboard={navigation}
             style={{width: "100%", height: "100%"}}
             onViewportChanged={this.handleViewportChanged}
             onclick={this.handleMouseClick}
             onmousemove={this.handleMouseMove}
             zoom={4}
             maxZoom={ui.maxZoom}
             center={[30, -45]}
             zoomControl={false}
             attributionControl={false}
        >
          <TileLayer
            url={ui.baseMapTileUrl}
            attribution={ui.baseMapTileAttribution}
          />
          {
            // Special case - "population" base map is actually combination of "street" base map and "population"
            // overlay tiles.
            ui.baseMap === "population" &&
            <TileLayer
              attribution={mapLayer("population").attribution}
              url={mapLayer("population").url}
              opacity={0.6}
            />
          }
          <PixiWindLayer />
          {
            ui.overlay === "stormSurge" &&
            <StormSurgeOverlay />
          }
          {
            ui.overlay === "sst" &&
            <ImageOverlay
              // color blind version of sea surface temperature should always use 100% opacity
              opacity={ui.colorBlindSSTScale ? 1 : ui.layerOpacity.seaSurfaceTemp}
              url={ui.getVisibleSeaSurfaceTempImgUrl(sim.season)}
              bounds={imageOverlayBounds}
            />
          }
          {
            // Source:
            // https://noaa.maps.arcgis.com/apps/MapSeries/index.html?appid=d9ed7904dbec441a9c4dd7b277935fad&entry=1
            ui.overlay === "stormSurge" && ui.zoomedInView && ui.zoomedInView.stormSurgeAvailable &&
            <TileLayer
              attribution={mapLayer("stormSurge").attribution}
              url={mapLayer("stormSurge").url.replace("{hurricaneCat}", ui.zoomedInView.landfallCategory.toString())}
              opacity={0.75}
            />
          }
          {
            ui.overlay === "precipitation" && <PrecipitationLayer/>
          }
          <HurricaneTrack />
          {
            config.markLandfalls && sim.simulationFinished && !ui.zoomedInView && sim.landfalls.map((lf, idx) =>
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
          {
            ui.categoryChangeMarkers &&
            sim.getCategoryMarkerPositions(ui.mapBounds).map((ps, idx) =>
              <HurricaneCategoryMarker
                point={ps}
                key={idx}
              />
            )
          }
          { navigation && <ZoomControl position="topleft"/> }
          {
            navigation && ui.mapModifiedByUser &&
            <Control position="topleft" className={`${css.resetViewContainer} leaflet-bar`}>
              <a className={css.resetViewBtn}
                 onClick={this.resetView}
                 title="Reset view" role="button" aria-label="Reset view"
              >
                <CenterFocusStrong/>
              </a>
            </Control>
          }
          {
            ui.zoomedInView &&
            <Control position="topleft" className={`${css.fullMapViewContainer} leaflet-bar`}>
              <a className={css.resetViewBtn}
                 onClick={this.stores.ui.setNorthAtlanticView}
                 title="Go to full map view" role="button" aria-label="Go to full map view"
              >
                <Home/>
                <div className={css.mapButtonLabel}>Full Map View</div>
              </a>
            </Control>
          }
          {
            ui.thermometerActive && <ThermometerMarker position={ui.thermometerPositionSaved} saved={true} />
          }
          {
            ui.thermometerActive && <ThermometerMarker position={ui.thermometerPositionHover} saved={false} />
          }
          <AttributionControl position="topright" />
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
    log("ResetMapViewClicked");
  }

  private handleViewportChanged = () => {
    if (this.leafletMap) {
      const bounds = this.leafletMap.getBounds();
      this.stores.simulation.updateBounds(bounds);
      this.stores.ui.mapUpdated(this.leafletMap, this._programmaticMapUpdate);

      if (!this._programmaticMapUpdate) {
        log("ViewportUpdated", {
          zoom: this.leafletMap.getZoom(),
          east: bounds.getEast(),
          west: bounds.getWest(),
          north: bounds.getNorth(),
          south: bounds.getSouth()
        });
      }
    }
  }

  private handleMouseClick = (e: LeafletMouseEvent) => {
    this.stores.ui.setThermometerPositionSaved(e.latlng);
  }

  private handleMouseMove = (e: LeafletMouseEvent) => {
    const time = window.performance.now();
    const targetFPS = 60; // limit updates to 60 FPS
    if (time - this._lastThermometerUpdateTime >= (1000 / targetFPS)) {
      this.stores.ui.setThermometerPositionHover(e.latlng);
      this._lastThermometerUpdateTime = time;
    }
  }
}
