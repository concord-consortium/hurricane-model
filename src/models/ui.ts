import { action, observable, computed } from "mobx";
import { LatLngExpression, Map, Point, LatLngBoundsLiteral, LatLngBounds } from "leaflet";
import config from "../config";
import { mapLayer, MapTilesName, mapTilesNames } from "../map-layer-tiles";
import { Season, ISSTImages } from "../types";
import * as decSeaTempDefault from "../../sea-surface-temp-img/dec-default.png";
import * as marchSeaTempDefault from "../../sea-surface-temp-img/mar-default.png";
import * as juneSeaTempDefault from "../../sea-surface-temp-img/jun-default.png";
import * as septSeaTempDefault from "../../sea-surface-temp-img/sep-default.png";
import * as decSeaTempPurple3 from "../../sea-surface-temp-img/dec-purple3.png";
import * as marchSeaTempPurple3 from "../../sea-surface-temp-img/mar-purple3.png";
import * as juneSeaTempPurple3 from "../../sea-surface-temp-img/jun-purple3.png";
import * as septSeaTempPurple3 from "../../sea-surface-temp-img/sep-purple3.png";
import * as decSeaTempPurpleCC from "../../sea-surface-temp-img/dec-purpleCC.png";
import * as marchSeaTempPurpleCC from "../../sea-surface-temp-img/mar-purpleCC.png";
import * as juneSeaTempPurpleCC from "../../sea-surface-temp-img/jun-purpleCC.png";
import * as septSeaTempPurpleCC from "../../sea-surface-temp-img/sep-purpleCC.png";
import * as decSeaTempRainbowCC from "../../sea-surface-temp-img/dec-rainbowCC.png";
import * as marchSeaTempRainbowCC from "../../sea-surface-temp-img/mar-rainbowCC.png";
import * as juneSeaTempRainbowCC from "../../sea-surface-temp-img/jun-rainbowCC.png";
import * as septSeaTempRainbowCC from "../../sea-surface-temp-img/sep-rainbowCC.png";

export const sstImages: Record<string, ISSTImages> = {
  default: {
    winter: decSeaTempDefault,
    spring: marchSeaTempDefault,
    summer: juneSeaTempDefault,
    fall: septSeaTempDefault
  },
  rainbowCC: {
    winter: decSeaTempRainbowCC,
    spring: marchSeaTempRainbowCC,
    summer: juneSeaTempRainbowCC,
    fall: septSeaTempRainbowCC
  },
  purple3: {
    winter: decSeaTempPurple3,
    spring: marchSeaTempPurple3,
    summer: juneSeaTempPurple3,
    fall: septSeaTempPurple3
  },
  purpleCC: {
    winter: decSeaTempPurpleCC,
    spring: marchSeaTempPurpleCC,
    summer: juneSeaTempPurpleCC,
    fall: septSeaTempPurpleCC
  },
};

// Storm surge data bounds is limited to very specify area (Texas to Maine).
// See: https://noaa.maps.arcgis.com/apps/MapSeries/index.html?appid=d9ed7904dbec441a9c4dd7b277935fad&entry=1
const stormSurgeDataBounds: LatLngBoundsLiteral = [[24, -100], [46, -64]];

export type Overlay = "sst" | "precipitation" | "stormSurge";
export type ZoomedInViewProps = false | { landfallCategory: number; stormSurgeAvailable: boolean; };

export class UIModel {
    @observable public initialBounds = config.initialBounds;
  @observable public zoomedInView: ZoomedInViewProps = false;
  @observable public mapModifiedByUser = false;
  @observable public layerOpacity: { [key: string]: number } = {
    seaSurfaceTemp: config.seaSurfaceTempOpacity,
  };
  @observable public windArrows = config.windArrows;
  @observable public hurricaneImage = config.hurricaneImage;
  @observable public mapZoom = 1;
  @observable public baseMap: MapTilesName = config.map;
  @observable public overlay: Overlay | null = config.overlay;
  @observable public colorBlindSSTScale = false;
  @observable public categoryChangeMarkers = config.categoryChangeMarkers;

  protected initialState: UIModel;

  constructor() {
    this.initialState = JSON.parse(JSON.stringify(this));
  }
  @observable public latLngToContainerPoint: (arg: LatLngExpression) => Point = () => new Point(0, 0);

  @computed public get baseMapTileUrl() {
    // Special case for "population". Actually, population isn't a base map but overlay.
    // So, when it's selected, we need to use "street" map as a base.
    return mapLayer(this.baseMap === "population" ? "street" : this.baseMap).url;
  }

  @computed public get baseMapTileAttribution() {
    return mapLayer(this.baseMap).attribution;
  }

  @computed public get maxZoom() {
    const baseMap = mapLayer(this.baseMap);
    // Overlay might not be defined using tiles.
    const overlay = this.overlay &&
                    mapTilesNames.indexOf(this.overlay) !== -1 &&
                    mapLayer(this.overlay as MapTilesName);
    return Math.min(baseMap.maxZoom, overlay && overlay.maxZoom || Infinity);
  }

  @computed public get sstScaleName() {
    return this.colorBlindSSTScale ? config.colorBlindSSTScale : config.defaultSSTScale;
  }

  public getVisibleSeaSurfaceTempImgUrl(season: Season) {
    return sstImages[this.sstScaleName][season];
  }

  @action.bound public mapUpdated(map: Map, programmaticUpdate: boolean) {
    this.latLngToContainerPoint = map.latLngToContainerPoint.bind(map);
    this.mapZoom = map.getZoom();
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
    this.initialBounds = config.initialBounds;
    this.zoomedInView = false;
  }

  @action.bound public setMapTiles(value: MapTilesName) {
    this.baseMap = value;
  }

  @action.bound public setOverlay(value: Overlay | null) {
    this.overlay = value;
  }

  @action.bound public setWindArrows(enabled: boolean) {
    this.windArrows = enabled;
  }

  @action.bound public setHurricaneImage(enabled: boolean) {
    this.hurricaneImage = enabled;
  }

  @action.bound public setColorBlindSSTScale(enabled: boolean) {
    this.colorBlindSSTScale = enabled;
  }

  @action.bound public reset() {
    this.initialBounds = config.initialBounds;
    this.zoomedInView = false;
    this.mapModifiedByUser = false;
    this.windArrows = this.initialState.windArrows;
    this.baseMap = this.initialState.baseMap;
    this.overlay = this.initialState.overlay;
  }
}
