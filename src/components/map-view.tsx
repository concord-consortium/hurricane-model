import { clsx } from "clsx";
import { Control as LeafletControl } from "leaflet";
import * as React from "react";
import { observe } from "mobx";
import { inject, observer } from "mobx-react";
import { BaseComponent, IBaseProps } from "./base";
import { MapContainer, TileLayer, ImageOverlay, ZoomControl, AttributionControl } from "react-leaflet";
import { LatLng, Map as LeafletMap, Point, PointTuple, latLngBounds, DomEvent } from "leaflet";
import Control from "./leaflet-control";
import { PixiWindLayer } from "./pixi-wind-layer";
import { PressureSystemMarker } from "./pressure-system-marker";
import { HurricaneMarker } from "./hurricane-marker";
import { HurricaneCategoryMarker } from "./hurricane-category-marker";
import { HurricaneTrack } from "./hurricane-track";
import { SavedTracksLayer } from "./saved-tracks-layer";
import { CompareOverlay } from "./compare/compare-overlay";
import { StaticTrack } from "./static-track";
import { LandfallRectangle } from "./landfall-rectangle";
import { PrecipitationLayer } from "./precipitation-layer";
import config from "../config";
import Home from "@mui/icons-material/Home";

import FitAllIcon from "../assets/fit-all.svg";
import { mapLayer } from "../map-layer-tiles";
import { StormSurgeOverlay } from "./storm-surge-overlay";
import { log } from "../log";
import { LeafletMouseEvent } from "leaflet";
import { LEFT_PANEL_TRANSITION_SECONDS, LEFT_PANEL_WIDTH_PX } from "./common";
import css from "./map-view.scss";
import { ThermometerMarker } from "./thermometer-marker";
import { PolygonRegion } from "./polygon-region";
import { stormPlacementRegion } from "../utils/storm-placement-region";
import { LeafletCustomMarker } from "./leaflet-custom-marker";
import { RegionTemperatureControl } from "./region-temperature-control";
import { namedRegions } from "../types";
import { temperatureAnomalyRegions, anomalyFillColor } from "../utils/regions";
import "leaflet/dist/leaflet.css";

interface IProps extends IBaseProps {}
interface IState {}

const imageOverlayBounds: [[number, number], [number, number]] = [[-90, -180], [90, 180]];

@inject("stores")
@observer
export class MapView extends BaseComponent<IProps, IState> {
  private mapRef = React.createRef<LeafletMap>();
  private _programmaticMapUpdate = false;
  private _lastThermometerUpdateTime = 0;
  private _thermometerHoverTimeout: number | null = null;
  private zoomRef = React.createRef<LeafletControl.Zoom>();

  // Stop pointer/scroll events on the in-map temperature controls from reaching the Leaflet map,
  // so repeatedly clicking the +/- buttons doesn't trigger double-click zoom (or drag/wheel zoom).
  // Stable method reference so React only invokes it on mount/unmount, not on every re-render.
  private disableMapInteractions = (el: HTMLDivElement | null) => {
    if (el) {
      DomEvent.disableClickPropagation(el);
      DomEvent.disableScrollPropagation(el);
    }
  };

  public componentDidMount() {
    window.addEventListener("resize", this.handleWindowResize);
    window.addEventListener("fullscreenchange", this.handleWindowResize);
    setTimeout(this.handleWindowResize, 500);

    // Observe some properties manually. React-leaflet implementation is incomplete in some cases. Some properties
    // work only on the initial load, but it's impossible to update them later. That's why we need to access
    // Leaflet API directly.
    observe(this.stores.ui, "initialBounds", () => {
      this.updateMaxBounds();
    });
    observe(this.stores.ui, "mapSize", () => {
      this.updateMaxBounds();
    });

    // This maxZoom option is not handled by react-leaftlet as a dynamic react property (it doesn't update after
    // Map component is created), so we need to use raw Leaflet API to dynamically change it.
    observe(this.stores.ui, "maxZoom", () => {
      const map = this.leafletMap;
      if (map) {
        map.setMaxZoom(this.stores.ui.maxZoom);
      }
    });

    observe(this.stores.ui, "leftPanelOpen", () => {
      this.handleLeftPanelToggle();
    });
  }

  public componentWillUnmount(): void {
    window.removeEventListener("resize", this.handleWindowResize);
    window.removeEventListener("fullscreenchange", this.handleWindowResize);
    const map = this.leafletMap;
    if (map) {
      map.off("click", this.handleMouseClick);
      map.off("mousemove", this.handleMouseMove);
      map.off("moveend", this.handleViewportChanged);
    }
    if (this._thermometerHoverTimeout) {
      window.clearTimeout(this._thermometerHoverTimeout);
    }
  }

  public componentDidUpdate() {
    // Update the zoom control's classNames
    this.zoomRef.current?.getContainer()?.classList.add(css.topLeftControl);
    if (this.stores.ui.leftPanelOpen) {
      this.zoomRef.current?.getContainer()?.classList.add(css.leftPanelOpen);
    } else {
      this.zoomRef.current?.getContainer()?.classList.remove(css.leftPanelOpen);
    }
  }

  // Leaflet invokes the whenReady callback with { target: map }, so we read the map from there.
  public handleMapReady = (e: any) => {
    const map: LeafletMap = e?.target;
    if (!map) return;
    map.on("click", this.handleMouseClick);
    map.on("mousemove", this.handleMouseMove);
    map.on("moveend", this.handleViewportChanged);
    // Populate ui store with real bounds/latLngToContainerPoint (defaults are (0,0)-returning).
    this.handleViewportChanged();
  }

  public render() {
    const { simulation: sim, ui, multiTrack } = this.stores;
    const { sstOverlay } = ui;
    const navigation = !!ui.zoomedInView || config.navigation;

    const resetButtonClasses = clsx(
      css.topLeftControl, css.resetViewContainer, "leaflet-bar",
      { [css.leftPanelOpen]: this.stores.ui.leftPanelOpen }
    );

    // Change the TileLayer's key when the base map changes to force an update.
    // Otherwise, the new layer renders offset to the northwest.
    const tileLayerKey = ui.baseMap;

    return (
      <div className={`${css.mapView} ${!config.topBarVisible ? css.noTopBar : ""}`} id="mapView">
        <MapContainer ref={this.mapRef}
          whenReady={this.handleMapReady as () => void}
          dragging={navigation}
          doubleClickZoom={navigation}
          scrollWheelZoom={navigation}
          boxZoom={navigation}
          keyboard={navigation}
          style={{width: "100%", height: "100%"}}
          zoom={4}
          maxZoom={ui.maxZoom}
          center={[30, -45]}
          zoomControl={false}
          zoomSnap={0}
          attributionControl={false}
        >
          <TileLayer
            key={tileLayerKey}
            url={ui.baseMapTileUrl}
            attribution={ui.baseMapTileAttribution}
          />
          {
            // Special case - "population" base map is actually combination of "street" base map and "population"
            // overlay tiles.
            ui.baseMap === "population" &&
            <TileLayer
              key="population-overlay"
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
              // accessible version of sea surface temperature should always use 100% opacity
              opacity={sstOverlay.accessibleSSTScale ? 1 : ui.layerOpacity.seaSurfaceTemp}
              url={
                sim.anyAnomalyActive && sstOverlay.updatedUrl
                  ? sstOverlay.updatedUrl
                  : sstOverlay.getVisibleSeaSurfaceTempImgUrl(sim.season)
              }
              bounds={imageOverlayBounds}
            />
          }
          {
            // Source:
            // https://www.nhc.noaa.gov/nationalsurge/
            // https://experience.arcgis.com/experience/203f772571cb48b1b8b50fdcc3272e2c
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
          <SavedTracksLayer />
          {
            // While editing a single-track run, show its previous track greyed out (a ghost).
            !multiTrack.enabled && multiTrack.singleTrackEditing && multiTrack.singleRun &&
            multiTrack.singleRun.simulation.hurricaneTrack.length > 0 &&
            <StaticTrack track={multiTrack.singleRun.simulation.hurricaneTrack} />
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
            // Once a run is captured (a completed run is selected/locked), hide the swirling
            // hurricane symbol — only the track remains — until a new trial is started/edited. While
            // a run is actually running (e.g. re-running a saved run), always show it.
            sim.hurricane.active && (!multiTrack.setupLocked || sim.simulationRunning) && <HurricaneMarker />
          }
          {
            // ui.mapBounds can be null/undefined before the Leaflet map has finished initializing
            // or before bounds have been computed; in that case we skip rendering category change
            // markers to avoid null reference errors and unnecessary work.
            ui.categoryChangeMarkers && ui.mapBounds &&
            sim.getCategoryMarkerPositions(ui.mapBounds).map((ps, idx) =>
              <HurricaneCategoryMarker
                point={ps}
                key={idx}
              />
            )
          }
          { navigation && <ZoomControl position="topleft" ref={this.zoomRef} /> }
          {
            navigation && ui.mapModifiedByUser &&
            <Control position="topleft" className={resetButtonClasses}>
              <a className={css.resetViewBtn}
                onClick={this.resetView}
                title="Reset view" role="button" aria-label="Reset view"
              >
                <FitAllIcon/>
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
          {
            ui.setupMode === "stormLocation" &&
            <PolygonRegion region={stormPlacementRegion} />
          }
          {
            ui.setupMode === "seaSurfaceTemperatures" &&
            namedRegions.map(key => {
              const { region, anchor } = temperatureAnomalyRegions[key];
              const anomalyColor = anomalyFillColor(sim.temperatureAnomalyAt(key));
              const pathOptions = { color: anomalyColor, weight: 1.5, fillColor: anomalyColor };
              return (
                <React.Fragment key={key}>
                  <PolygonRegion region={region} pathOptions={pathOptions} />
                  <LeafletCustomMarker position={anchor}>
                    <div className={css.temperatureControlMarker} ref={this.disableMapInteractions}>
                      <RegionTemperatureControl regionKey={key} />
                    </div>
                  </LeafletCustomMarker>
                </React.Fragment>
              );
            })
          }
          <AttributionControl position="topright" />
        </MapContainer>
        <CompareOverlay />
      </div>
    );
  }

  public get leafletMap() {
    return this.mapRef.current;
  }

  public handleWindowResize = () => {
    if (this.leafletMap) {
      this.leafletMap.invalidateSize(false);
      this.stores.ui.setMapSize(this.leafletMap.getSize());
      this.handleViewportChanged();
    }
  }

  public resetView = () => {
    this.leafletMap?.flyToBounds(this.stores.ui.initialBounds);
    this.stores.ui.resetMapView();
    log("ResetMapViewClicked");
  }

  private updateMaxBounds = () => {
    const map = this.leafletMap;
    if (map) {
      const size = map.getSize();
      const { ui } = this.stores;
      const { visibleRegion } = config;

      // Remove restrictions for a moment so getBoundsZoom works correctly.
      map.setMinZoom(1);
      map.setMaxBounds([[-Infinity, -Infinity], [Infinity, Infinity]]);

      // Get the min zoom that will show the complete visible region given the map size.
      const minZoom = map.getBoundsZoom(visibleRegion, false);

      // Determine actual bounds of max visible map given min zoom and map size.
      // There might be some vertical or horizontal padding depending on the visible region and window aspect ratios.
      const ib = latLngBounds(visibleRegion);
      const centerPx = map.project(ib.getSouthWest(), minZoom)
        .add(map.project(ib.getNorthEast(), minZoom))
        .divideBy(2);
      const half = size.divideBy(2);
      const fullBounds = latLngBounds(
        map.unproject(centerPx.subtract(half), minZoom),
        map.unproject(centerPx.add(half), minZoom)
      )

      // Determine how much extra area is necessary to show the left panel given the map size
      // Extra width is all to the left. It can be 0 (if the window is very wide),
      // the full width of the left panel (if the window has a higher height to width ratio than the initial bounds),
      // or somewhere in between (if there is some horizontal padding, but not enough for the full left panel).
      // Extra height is divided between the top and bottom, keeping the focused area centered vertically.
      const visibleWidthLong = visibleRegion[1][1] - visibleRegion[0][1];
      // TODO: initWidthPixels is not quite right, because the zoom will ultimately be panelZoom, not minZoom
      // Also, this is longitude -> pixel at the equator, but we should really calculate this at the furthest lat
      // from the equator (northern lat in the visible region)
      const initWidthPixels = (visibleWidthLong / 360) * 256 * (2 ** minZoom);
      const widthPadding = (size.x - initWidthPixels) / 2;
      const extraLeftPanelWidth = Math.max(LEFT_PANEL_WIDTH_PX - widthPadding, 0);
      const extraLeftPanelHeight = extraLeftPanelWidth * size.y / size.x;

      // Determine the min zoom needed to show both the full initial bounds and left panel.
      const panelPadding = new Point(extraLeftPanelWidth, extraLeftPanelHeight);
      const panelZoom = map.getBoundsZoom(visibleRegion, false, panelPadding);

      // Determine the bounds of max visible map + left panel given min zoom and map size.
      const ibCenter = ib.getCenter();
      const panelLongShift = extraLeftPanelWidth / 2 * 360 / 256 / (2 ** panelZoom);
      const panelCenter = new LatLng(ibCenter.lat, ibCenter.lng - panelLongShift);
      const panelCenterPixels = map.project(panelCenter, panelZoom);
      const panelBounds = latLngBounds(
        map.unproject(panelCenterPixels.subtract(half), panelZoom),
        map.unproject(panelCenterPixels.add(half), panelZoom)
      );

      // Save the values we found so we can use them when opening/closing the left panel.
      // We add a little padding to the bounds so the animations are smooth.
      ui.minZoom = minZoom;
      ui.maxBounds = fullBounds.pad(0.03);
      ui.panelMinZoom = panelZoom;
      ui.panelMaxBounds = panelBounds.pad(0.03);
      ui.panelVerticalPadding = extraLeftPanelHeight / 2;

      // Update minZoom and maxBounds
      map.setMinZoom(ui.leftPanelOpen ? ui.panelMinZoom : ui.minZoom);
      map.setMaxBounds(ui.leftPanelOpen ? ui.panelMaxBounds : ui.maxBounds);
    }
  }

  private handleLeftPanelToggle = () => {
    const map = this.leafletMap;
    if (!map) return;
    const { ui } = this.stores;
    const open = ui.leftPanelOpen;

    const verticalPadding = (open ? 1 : -1) * ui.panelVerticalPadding;
    const paddingTopLeft: PointTuple = [open ? LEFT_PANEL_WIDTH_PX : 0, verticalPadding];
    const paddingBottomRight: PointTuple = [0, verticalPadding];
    const opts = { duration: LEFT_PANEL_TRANSITION_SECONDS, paddingBottomRight, paddingTopLeft };

    if (open) {
      // Immediately set the min zoom/max bounds to the larger area so we can safely zoom out
      map.setMinZoom(ui.panelMinZoom);
      map.setMaxBounds(ui.panelMaxBounds);
      map.flyToBounds(map.getBounds(), opts);
    } else {
      const size = map.getSize();
      const topLeft = map.containerPointToLatLng([LEFT_PANEL_WIDTH_PX, ui.panelVerticalPadding]);
      const bottomRight = map.containerPointToLatLng([size.x, size.y - ui.panelVerticalPadding]);
      map.flyToBounds(latLngBounds(topLeft, bottomRight), opts);

      // Set the more restrictive panel-closed minZoom/maxBounds after flying to the panel-closed region
      // An interrupted flyTo fires no moveend (Leaflet's _stop is silent), so rapid
      // toggles just leave the flag true until the final flight settles. Stale once
      // listeners that accumulate are idempotent — they all clear the same flag.
      map.once("moveend", () => {
        if (!this.stores.ui.leftPanelOpen) {
          map.setMinZoom(ui.minZoom);
          map.setMaxBounds(ui.maxBounds);
        }
      });
    }
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
    // Skip logging if click originated from a pressure system marker (e.g., slider)
    const target = e.originalEvent?.target as HTMLElement;
    const isMarkerClick = target &&
      target.closest(".leaflet-marker-pane");

    if (!isMarkerClick) {
      if (this.stores.ui.thermometerActive) {
        // Log ThermometerPinned instead of MapClicked when the temperature tool is active
        const temp = this.stores.simulation.seaSurfaceTempAt(e.latlng);
        if (temp !== null) {
          log("ThermometerPinned", {
            position: { lat: e.latlng.lat, lng: e.latlng.lng },
            temperature: temp
          });
        }
      } else {
        log("MapClicked", {
          position: { lat: e.latlng.lat, lng: e.latlng.lng }
        });
      }
    }
    this.stores.ui.setThermometerPositionSaved(e.latlng);
  }

  private handleMouseMove = (e: LeafletMouseEvent) => {
    const time = window.performance.now();
    const targetFPS = 60; // limit updates to 60 FPS
    if (time - this._lastThermometerUpdateTime >= (1000 / targetFPS)) {
      this.stores.ui.setThermometerPositionHover(e.latlng);
      this._lastThermometerUpdateTime = time;
    }

    // Debounced thermometer hover logging (1s)
    if (this.stores.ui.thermometerActive) {
      if (this._thermometerHoverTimeout) {
        window.clearTimeout(this._thermometerHoverTimeout);
      }
      this._thermometerHoverTimeout = window.setTimeout(() => {
        // Re-check thermometerActive — user may have toggled it off during the debounce
        if (this.stores.ui.thermometerActive) {
          const temp = this.stores.simulation.seaSurfaceTempAt(e.latlng);
          if (temp !== null) {
            log("ThermometerHover", {
              position: { lat: e.latlng.lat, lng: e.latlng.lng },
              temperature: temp
            });
          }
        }
        this._thermometerHoverTimeout = null;
      }, 1000);
    }
  }
}
