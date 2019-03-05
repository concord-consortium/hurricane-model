import { LatLngExpression, Point, Map, CRS } from "leaflet";
import { action, observable, computed, autorun } from "mobx";
import { PressureSystem, IPressureSystemOptions } from "./pressure-system";
import { Hurricane } from "./hurricane";
import * as decWind from "../../wind-data-json/dec-simple.json";
import * as marchWind from "../../wind-data-json/mar-simple.json";
import * as juneWind from "../../wind-data-json/jun-simple.json";
import * as septWind from "../../wind-data-json/sep-simple.json";
import * as decSeaTemp from "../../sea-surface-temp-img/dec.png";
import * as marchSeaTemp from "../../sea-surface-temp-img/mar.png";
import * as juneSeaTemp from "../../sea-surface-temp-img/jun.png";
import * as septSeaTemp from "../../sea-surface-temp-img/sep.png";
import { kdTree } from "kd-tree-javascript";
import { ICoordinates, IWindPoint, ITrackPoint, IVector, Season, ILandfall } from "../types";
import { vecAverage } from "../math-utils";
import { headingTo, moveTo, distanceTo } from "geolocation-utils";
import { invertedTemperatureScale } from "../temperature-scale";
import { PNG } from "pngjs";
import config from "../config";

interface IWindDataset {
  winter: IWindPoint[];
  spring: IWindPoint[];
  summer: IWindPoint[];
  fall: IWindPoint[];
}

interface ISSTImages {
  winter: string;
  spring: string;
  summer: string;
  fall: string;
}

export interface ISimulationOptions {
  season?: Season;
  pressureSystems?: IPressureSystemOptions[];
  hurricane?: IPressureSystemOptions;
}

export const windData: IWindDataset = {
  winter: decWind.windVectors,
  spring: marchWind.windVectors,
  summer: juneWind.windVectors,
  fall: septWind.windVectors
};

export const sstImages: ISSTImages = {
  winter: decSeaTemp,
  spring: marchSeaTemp,
  summer: juneSeaTemp,
  fall: septSeaTemp
};

const defaultPressureSystems: IPressureSystemOptions[] = [
  {
    type: "high",
    center: {lat: 34, lng: -29},
    strength: 15
  },
  {
    type: "high",
    center: {lat: 34, lng: -53},
    strength: 10
  },
  {
    type: "low",
    center: {lat: 39, lng: -92},
    strength: 9
  },
  {
    type: "low",
    center: {lat: 54, lng: -89},
    strength: 7
  }
];

export class SimulationModel {
  // Region boundaries.
  @observable public east = 180;
  @observable public north = 90;
  @observable public west = -180;
  @observable public south = -90;
  @observable public zoom = 4;

  @observable public hurricaneTrack: ITrackPoint[] = [];
  public time = 0;

  // Current season, sets wind and sea temperature (in the future).
  @observable public season: Season;

  @observable public seaSurfaceTempData: PNG | null = null;

  // It gets set to true when simulation stops automatically after the hurricane naturally dissipates.
  @observable public simulationFinished = false;

  // Pressure systems affect winds.
  @observable public pressureSystems: PressureSystem[] = [];

  @observable public hurricane: Hurricane = new Hurricane({
    center: config.initialHurricanePosition,
    strength: config.hurricaneStrength,
    speed: config.initialHurricaneSpeed
  });

  @observable public simulationStarted = false;

  @observable public landfalls: ILandfall[] = [];

  // Callbacks used by tests.
  public _seaSurfaceTempDataParsed: () => void;

  private initialOptions: ISimulationOptions;

  constructor(options?: ISimulationOptions) {
    if (!options) {
      options = {};
    }
    this.initialOptions = options;
    this.season = options.season || config.season;
    this.pressureSystems = (options.pressureSystems || defaultPressureSystems).map(o => new PressureSystem(o));
    autorun(() => {
      // MobX autorun will re-run this block if any property used inside is updated. It's a bit of MobX magic
      // and one of its core features (more info can be found in MobX docs). That ensures that sea surface temperature
      // data is always updated when necessary.
      this.updateSeaSurfaceTempData();
    });
  }

  // Simulation is not ready to be started until SST data is downloaded.
  @computed get ready() {
    return this.seaSurfaceTempData !== null && this.hurricane.active;
  }

  @computed get loading() {
    return this.seaSurfaceTempData === null;
  }

  @observable public latLngToContainerPoint: (arg: LatLngExpression) => Point = () => new Point(0, 0);

  // Wind data not affected by custom pressure systems.
  @computed get baseWind() {
    return windData[this.season];
  }

  // Wind data affected by custom pressure systems.
  @computed get wind() {
    const result: IWindPoint[] = [];
    this.baseWind.forEach(w => {
      const pressureSysWinds: IWindPoint[] = [];
      const pressureSysWeights: number[] = [];
      this.pressureSystems.forEach(ps => {
        const dist = distanceTo(ps.center, w);
        if (dist < ps.range) {
          pressureSysWinds.push(ps.applyToWindPoint(w));
          pressureSysWeights.push(1 - dist / ps.range);
        }
      });
      if (pressureSysWinds.length > 0) {
        const newWind = vecAverage(pressureSysWinds, pressureSysWeights);
        result.push(Object.assign({}, w, newWind));
      } else {
        result.push(w);
      }
    });
    return result;
  }

  // Helper structure.
  @computed get windKdTree() {
    return new kdTree(this.wind, distanceTo, ["lat", "lng"]);
  }

  // Wind data affected by custom pressure systems and limited to current bounds.
  @computed get windIncBounds() {
    return this.wind.filter(p =>
      p.lng >= this.west && p.lng <= this.east && p.lat >= this.south && p.lat <= this.north
    );
  }

  // Wind data affected by custom pressure systems, hurricane, and limited to current bounds.
  // Note that his data is used ONLY for rendering. Hurricane simulation uses data without effect of the
  // hurricane itself.
  @computed get windIncHurricane() {
    const result: IWindPoint[] = [];
    this.windIncBounds.forEach(w => {
      const dist = distanceTo(this.hurricane.center, w);
      if (dist < this.hurricane.range) {
        result.push(this.hurricane.applyToWindPoint(w));
      } else {
        result.push(w);
      }
    });
    return result;
  }

  @computed get seaSurfaceTempImgUrl() {
    return sstImages[this.season];
  }

  @action.bound public updateMap(map: Map) {
    const bounds = map.getBounds();
    this.east = bounds.getEast();
    this.north = bounds.getNorth();
    this.west = bounds.getWest();
    this.south = bounds.getSouth();
    this.zoom = map.getZoom();

    this.latLngToContainerPoint = map.latLngToContainerPoint.bind(map);
  }

  @action.bound public setSeason(season: Season) {
    this.season = season;
  }

  @action.bound public setPressureSysCenter(pressureSystem: PressureSystem, center: ICoordinates) {
    pressureSystem.setCenter(center, this.pressureSystems);
  }

  @action.bound public checkPressureSystem(pressureSystem: PressureSystem) {
    pressureSystem.checkPressureSystem(this.pressureSystems);
  }

  @action.bound public tick() {
    if (this.time % config.trackSegmentLength === 0) {
      this.hurricaneTrack.push({
        position: Object.assign({}, this.hurricane.center),
        category: this.hurricane.category
      });
    }
    const windSpeed = this.windAt(this.hurricane.center);
    this.hurricane.move(windSpeed, config.timestep);

    const sst = this.seaSurfaceTempAt(this.hurricane.center);
    if (this.time % config.sstCheckInterval === 0) {
      this.hurricane.setStrengthChangeFromSST(sst);
    }
    this.hurricane.updateStrength();

    if (sst === null && this.landfalls.length === 0) {
      this.landfalls.push({
        position: Object.assign({}, this.hurricane.center),
        category: this.hurricane.category
      });
    }

    this.time += config.timestep;

    this.pressureSystems.filter(ps => ps.type === "low").forEach(lps => {
      if (distanceTo(lps.center, this.hurricane.center) < config.minPressureSystemMergeDistance) {
        // Weaker system gets merged into stronger one. In most cases it will be low pressure system getting
        // merged into hurricane.
        if (lps.strength <= this.hurricane.strength) {
          this.hurricane.strength += lps.strength;
          this.removePressureSystem(lps);
        } else {
          lps.strength += this.hurricane.strength;
          // Make hurricane inactive.
          this.hurricane.setStrength(0);
        }
      }
    });

    if (!this.hurricane.active) {
      // Stop the model when hurricane gets too weak.
      this.stop();
      this.simulationFinished = true;
    }

    if (this.simulationStarted) {
      requestAnimationFrame(this.tick);
    }
  }

  @action.bound public start() {
    this.simulationStarted = true;
    this.tick();
  }

  @action.bound public stop() {
    this.simulationStarted = false;
  }

  @action.bound public reset() {
    this.simulationStarted = false;
    this.simulationFinished = false;
    this.hurricaneTrack = [];
    this.landfalls = [];
    this.time = 0;
    this.hurricane.reset();
    this.pressureSystems =
      (this.initialOptions.pressureSystems || defaultPressureSystems).map(o => new PressureSystem(o));
  }

  @action.bound public removePressureSystem(ps: PressureSystem) {
    const idx = this.pressureSystems.indexOf(ps);
    if (idx !== -1) {
      this.pressureSystems.splice(idx, 1);
    }
  }

  public windAt(point: ICoordinates): IVector {
    const wind = this.windKdTree;
    const nearestPoints = wind.nearest(point, 4);
    const perfectHit = nearestPoints.filter((sr: any) => sr[1] === 0);
    // There's some point with distance equal to 0. Simply return it.
    if (perfectHit.length > 0) {
      const p = perfectHit[0][0];
      return { u: p.u, v: p.v };
    }
    // Otherwise, average neighbouring points.
    const avg = {
      u: 0,
      v: 0
    };
    let distWeightSum = 0;
    nearestPoints.forEach((searchResult: any) => {
      avg.u += searchResult[0].u / searchResult[1];
      avg.v += searchResult[0].v / searchResult[1];
      distWeightSum += 1 / searchResult[1];
    });
    avg.u /= distWeightSum;
    avg.v /= distWeightSum;
    return avg;
  }

  public seaSurfaceTempAt(position: LatLngExpression) {
    // This function uses parsed PNG image data and inverted temperature scale to get numeric value.
    const pngData = this.seaSurfaceTempData;
    if (!pngData) {
      return null;
    }
    // A bit of math here. EPSG3857 is a standard projection that we use.
    const zoom = CRS.EPSG3857.zoom(pngData.width);
    const point = CRS.EPSG3857.latLngToPoint(position, zoom);
    const x = Math.round(point.x);
    const y = Math.round(point.y);
    // This is specific to pngjs library being used here.
    const idx = (pngData.width * y + x) << 2;
    const r = pngData.data[idx];
    const g = pngData.data[idx + 1];
    const b = pngData.data[idx + 2];
    const a = pngData.data[idx + 3];
    if (a === 0) {
      // Note that scripts that generate SST images, use transparent pixels for land.
      // Use 20*C as dummy value of temperature for land. It's cool enough to slowly make hurricane disappear.
      return null;
    }
    // Format and whitespace are very important. That's how D3 scale returns color value.
    // It needs to match invertedTemperatureScale domain.
    const color = `rgb(${r}, ${g}, ${b})`;
    return invertedTemperatureScale(color);
  }

  private updateSeaSurfaceTempData() {
    // Set data to null so the model know that it's not available while the new one is being downloaded.
    this.seaSurfaceTempData = null;
    fetch(this.seaSurfaceTempImgUrl).then(response => {
      if (response.ok) {
        response.arrayBuffer().then(buffer => {
          const png = new PNG();
          png.parse(Buffer.from(buffer), (err, validPng) => {
            if (err) {
              throw err;
            }
            this.seaSurfaceTempData = validPng;
            // Callback used for testing.
            if (this._seaSurfaceTempDataParsed) {
              this._seaSurfaceTempDataParsed();
            }
          });
        });
      }
    });
  }
}
