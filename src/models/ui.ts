import { action, observable, computed, makeObservable } from "mobx";
import { LatLngExpression, Map, Point, LatLngBoundsLiteral, LatLngBounds } from "leaflet";
import config from "../config";
import { mapLayer, MapTilesName, mapTilesNames } from "../map-layer-tiles";
import { SimulationModel } from "./simulation";
import { SSTOverlayModel } from "./sst-overlay";

export type InteractiveMode = "runtime" | "authoring" | "report" | "reportItem";
export type SetupMode = "stormLocation" | "stormCategory" | "season" | "seaSurfaceTemperatures" | "pressureSystems";

// Storm surge data bounds is limited to very specify area (Texas to Maine).
// See: https://noaa.maps.arcgis.com/apps/MapSeries/index.html?appid=d9ed7904dbec441a9c4dd7b277935fad&entry=1
const stormSurgeDataBounds: LatLngBoundsLiteral = [[24, -100], [46, -64]];

export type Overlay = "sst" | "precipitation" | "stormSurge";
export type ZoomedInViewProps = false | { landfallCategory: number; stormSurgeAvailable: boolean; };

export class UIModel {
  @observable public sstOverlay: SSTOverlayModel;
  @observable public mode: InteractiveMode = "runtime";
  @observable public setupMode: SetupMode | undefined = undefined;
  @observable public leftPanelOpen = false;
  @observable public initialBounds = config.initialBounds;
  @observable public mapSize = { x: 0, y: 0 };
  @observable public zoomedInView: ZoomedInViewProps = false;
  @observable public mapModifiedByUser = false;
  @observable public layerOpacity: { [key: string]: number } = {
    seaSurfaceTemp: config.seaSurfaceTempOpacity,
  };
  @observable public windArrows = config.windArrows;
  @observable public hurricaneImage = config.hurricaneImage;
  @observable public mapBounds: LatLngBounds | null = null;
  @observable public mapZoom = 1;
  @observable public baseMap: MapTilesName = config.map;
  @observable public overlay: Overlay | null = config.overlay;
  @observable public categoryChangeMarkers = config.categoryChangeMarkers;
  @observable public thermometerActive = false;
  @observable public thermometerPositionSaved: LatLngExpression | null = null;
  @observable public thermometerPositionHover: LatLngExpression | null = null;

  // These values are updated when the window size or initial bounds change.
  // They are used to update the map view when the left panel is open and closed.
  public maxBounds = this.initialBounds;
  public minZoom = 1;
  public panelMaxBounds = this.initialBounds;
  public panelMinZoom = 1;
  public panelVerticalPadding = 0;

  protected initialState: UIModel;

  constructor(simulation: SimulationModel) {
    makeObservable(this);
    this.sstOverlay = new SSTOverlayModel(simulation);

    // Omit the sstOverlay from the initialState to avoid including the simulation, which could include cycles.
    const { sstOverlay: _sst, ...rest } = this;
    this.initialState = JSON.parse(JSON.stringify(rest));

    if ((this.initialState.baseMap === "population") && !config.enablePopulationMap) {
      this.initialState.baseMap = "street";
    }
  }
  @observable public latLngToContainerPoint: (arg: LatLngExpression) => Point = () => new Point(0, 0);

  @computed public get baseMapType() {
    return this.baseMap === "population" ? "street" : this.baseMap;
  }

  @computed public get baseMapTileUrl() {
    // Special case for "population". Actually, population isn't a base map but overlay.
    // So, when it's selected, we need to use "street" map as a base.
    return mapLayer(this.baseMapType).url;
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

  @computed public get isReportMode(): boolean {
    return this.mode === "report" || this.mode === "reportItem";
  }

  @computed public get isReadOnly(): boolean {
    return this.isReportMode;
  }

  @action.bound public setMode(mode: InteractiveMode) {
    this.mode = mode;
  }

  @action.bound public setSetupMode(mode: SetupMode | undefined) {
    this.setupMode = mode;
  }

  @action.bound public setLeftPanelOpen(open: boolean) {
    this.leftPanelOpen = open;
  }

  @action.bound public mapUpdated(map: Map, programmaticUpdate: boolean) {
    this.latLngToContainerPoint = map.latLngToContainerPoint.bind(map);
    this.mapBounds = map.getBounds();
    this.mapZoom = map.getZoom();
    this.mapModifiedByUser = !programmaticUpdate;
  }

  @action.bound public setMapSize(size: { x: number, y: number }) {
    this.mapSize = size;
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
    if (value !== "sst") {
      this.disableThermometer();
    }
  }

  @action.bound public setWindArrows(enabled: boolean) {
    this.windArrows = enabled;
  }

  @action.bound public setHurricaneImage(enabled: boolean) {
    this.hurricaneImage = enabled;
  }

  @action.bound public setThermometerActive(enabled: boolean) {
    this.thermometerActive = enabled;
  }

  @action.bound public setThermometerPositionSaved(position: LatLngExpression) {
    this.thermometerPositionSaved = position;
  }

  @action.bound public setThermometerPositionHover(position: LatLngExpression) {
    this.thermometerPositionHover = position;
  }

  @action.bound public disableThermometer = () => {
    this.thermometerActive = false;
    this.thermometerPositionHover = null;
    this.thermometerPositionSaved = null;
  }

  @action.bound public reset() {
    this.initialBounds = config.initialBounds;
    this.zoomedInView = false;
    this.mapModifiedByUser = false;
    this.windArrows = this.initialState.windArrows;
    this.baseMap = this.initialState.baseMap;
    this.overlay = this.initialState.overlay;
    this.disableThermometer();
  }
}
