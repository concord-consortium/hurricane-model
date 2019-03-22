import {action, observable} from "mobx";
import {LatLngExpression, Map, Point, LatLngBoundsLiteral} from "leaflet";
import config from "../config";
import { mapLayer, GeoMap } from "../map-layer-tiles";

// North Atlantic.
export const NorthAtlanticInitialBounds: LatLngBoundsLiteral = [[10, -90], [50, -10]];

export type TranslucentLayer = "windArrows" | "seaSurfaceTemp";

export type Overlay = "precipitation" | null;

export class UIModel {
  @observable public initialBounds = NorthAtlanticInitialBounds;
  @observable public zoomedInView = false;
  @observable public mapModifiedByUser = false;
  @observable public layerOpacity: { [key: string]: number } = {
    windArrows: config.windArrowsOpacity,
    seaSurfaceTemp: config.seaSurfaceTempOpacity
  };
  @observable public mapTile = mapLayer(config.map);
  @observable public overlay: Overlay = config.overlay;

  @observable public latLngToContainerPoint: (arg: LatLngExpression) => Point = () => new Point(0, 0);

  @action.bound public mapUpdated(map: Map, programmaticUpdate: boolean) {
    this.latLngToContainerPoint = map.latLngToContainerPoint.bind(map);
    this.mapModifiedByUser = !programmaticUpdate;
  }

  @action.bound public resetMapView() {
    // Values are compared by reference, so .slice() is necessary.
    // UI code will detect a new value and move map to initial bounds.
    this.initialBounds = this.initialBounds.slice();
    this.mapModifiedByUser = false;
  }

  @action.bound public setInitialBounds(initialBounds: LatLngBoundsLiteral) {
    this.initialBounds = initialBounds;
  }

  @action.bound public setZoomedInView(bounds: LatLngBoundsLiteral) {
    this.initialBounds = bounds;
    this.zoomedInView = true;
  }

  @action.bound public setNorthAtlanticView() {
    this.initialBounds = NorthAtlanticInitialBounds;
    this.zoomedInView = false;
  }

  @action.bound public setOpacity(prop: TranslucentLayer, value: number) {
    this.layerOpacity[prop] = value;
  }

  @action.bound public setMapTiles(value: GeoMap) {
    this.mapTile = mapLayer(value);
  }

  @action.bound public setOverlay(value: Overlay) {
    this.overlay = value;
  }
}
