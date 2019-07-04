import { action, observable, toJS } from "mobx";
import {LatLngExpression, Map, Point, LatLngBoundsLiteral, LatLngBounds} from "leaflet";
import config from "../config";
import { mapLayer, MapTilesName } from "../map-layer-tiles";

// North Atlantic.
export const NorthAtlanticInitialBounds: LatLngBoundsLiteral = [[5, -90], [50, -10]];
// Storm surge data bounds is limited to very specify area (Texas to Maine).
// See: https://noaa.maps.arcgis.com/apps/MapSeries/index.html?appid=d9ed7904dbec441a9c4dd7b277935fad&entry=1
const stormSurgeDataBounds: LatLngBoundsLiteral = [[24, -100], [46, -64]];

export type Overlay = "sst" | "precipitation" | "stormSurge" | "population" | null;
export type ZoomedInViewProps = false | { landfallCategory: number; stormSurgeAvailable: boolean; };

export class UIModel {
  @observable public initialBounds = NorthAtlanticInitialBounds;
  @observable public zoomedInView: ZoomedInViewProps = false;
  @observable public mapModifiedByUser = false;
  @observable public layerOpacity: { [key: string]: number } = {
    seaSurfaceTemp: config.seaSurfaceTempOpacity,
    overlayTiles: config.overlayTileOpacity
  };
  @observable public windArrows = config.windArrows;
  @observable public mapTile = mapLayer(config.map);
  @observable public overlay: Overlay = config.overlay;
  protected initialState: UIModel;

  constructor() {
    this.initialState = toJS(this);
  }
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

  @action.bound public setZoomedInView(bounds: LatLngBoundsLiteral, landfallCategory: number) {
    this.initialBounds = bounds;
    const stormSurgeAvailable = landfallCategory > 0 && (new LatLngBounds(stormSurgeDataBounds)).contains(bounds);
    this.zoomedInView = {
      landfallCategory,
      stormSurgeAvailable
    };
  }

  @action.bound public setNorthAtlanticView() {
    this.initialBounds = NorthAtlanticInitialBounds;
    this.zoomedInView = false;
  }

  @action.bound public setMapTiles(value: MapTilesName) {
    this.mapTile = mapLayer(value);
  }

  @action.bound public setOverlay(value: Overlay) {
    this.overlay = value;
  }

  @action.bound public setWindArrows(enabled: boolean) {
    this.windArrows = enabled;
  }

  @action.bound public reset() {
    this.initialBounds = NorthAtlanticInitialBounds;
    this.zoomedInView = false;
    this.mapModifiedByUser = false;
    this.windArrows = this.initialState.windArrows;
    this.mapTile = this.initialState.mapTile;
    this.overlay = this.initialState.overlay;
  }
}
