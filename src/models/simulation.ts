import {LatLngExpression, CRS, LatLngBounds, latLngBounds} from "leaflet";
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
import { ICoordinates, IWindPoint, ITrackPoint, IVector, Season, ILandfall, IPrecipitationPoint } from "../types";
import { vecAverage } from "../math-utils";
import { distanceTo } from "geolocation-utils";
import { invertedTemperatureScale } from "../temperature-scale";
import { PNG } from "pngjs";
import config from "../config";
import { random } from "../seedrandom";

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

// When hurricane passes through some areas, we should consider that a landfall even if it doesn't hit the land.
// E.g. hurricane can be passing close to an island or Florida and storm surge data should be shown there.
// Current areas marked on the map: https://i.imgur.com/txuXfqt.png
export const extendedLandfallBounds: {[key: string]: LatLngBounds} = {
  PuertoRico: latLngBounds([
    {lat: 19.5, lng: -68},
    {lat: 17, lng: -65}
  ]),
  FloridaEast1: latLngBounds([
    {lat: 30, lng: -81.5},
    {lat: 28, lng: -79}
  ]),
  FloridaEast2: latLngBounds([
    {lat: 28, lng: -80.5},
    {lat: 26, lng: -78},
  ]),
  FloridaWest1: latLngBounds([
    {lat: 30, lng: -85},
    {lat: 28, lng: -82.5}
  ]),
  FloridaWest2: latLngBounds([
    {lat: 28, lng: -84},
    {lat: 26, lng: -81.5}
  ]),
};

// Landfall is detected when hurricane moves from sea to land. To avoid detecting too many landfalls, assume that
// hurricane needs to travel over sea for some time before next landfall is detected.
export const minStepsOverSeaToDetectLandfall = 10;
const benchmarkInterval = 30;
const precipitationUpdateInterval = 5;

export class SimulationModel {
  @computed get areaWidth() {
    return this.east - this.west;
  }

  // Simulation is not ready to be started until SST data is downloaded.
  @computed get ready() {
    return this.seaSurfaceTempData !== null && this.hurricane.active;
  }

  @computed get loading() {
    return this.seaSurfaceTempData === null;
  }

  @computed get windShearPresent() {
    // Wind shear is present only in winter or spring.
    return this.season === "winter" || this.season === "spring";
  }

  // Wind data not affected by custom pressure systems.
  @computed get baseWind() {
    return windData[this.season];
  }

  // Wind data affected by custom pressure systems.
  @computed get wind() {
    const result: IWindPoint[] = [];
    this.baseWind.forEach(w => {
      if (w.lat < 0) {
        // Don't let pressure systems affect winds below equator.
        result.push(w);
        return;
      }
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

  // Wind data affected by custom pressure systems and limited to current bounds.
  @computed get windWithinBounds() {
    if (this.areaWidth > 40) {
      // It would be too slow to re-generate wind data for zoomed-out view. Also, the default amount of arrows
      // works well for this view. We can only limit their number so they more clear.
      const nth = Math.max(1, Math.round(this.areaWidth / 90));
      return this.wind.filter((p, idx) =>
        idx % nth === 0 && p.lng >= this.west && p.lng <= this.east && p.lat >= this.south && p.lat <= this.north
      );
    }
    // Otherwise, generate custom arrows for given area.
    const result = [];
    const diff = this.areaWidth / 30;
    for (let lat = this.south; lat < this.north; lat += diff) {
      for (let lng = this.west; lng < this.east; lng += diff) {
        const w = this.windAt({lat, lng});
        const wp = {lat, lng, u: w.u, v: w.v};
        result.push(wp);
      }
    }
    return result;
  }

  // Wind data affected by custom pressure systems, hurricane, and limited to current bounds.
  // Note that his data is used ONLY for rendering. Hurricane simulation uses data without effect of the
  // hurricane itself.
  @computed get windIncHurricane() {
    const result: IWindPoint[] = [];
    this.windWithinBounds.forEach(w => {
      const dist = distanceTo(this.hurricane.center, w);
      if (dist < this.hurricane.range) {
        result.push(this.hurricane.applyToWindPoint(w));
      } else {
        result.push(w);
      }
    });
    return result;
  }

  @computed get precipitationPointsWithinBounds() {
    // Why do we need margin? Otherwise, precipitation heatmap around screen edges will be disappearing.
    // We also need to ensure that we never cut area more than size of a single heatmap point. Otherwise, when user
    // keeps zooming in, some points will get cut off and the final color would change.
    const margin = Math.max(4, this.areaWidth * 0.1);
    return this.precipitationPoints.filter((p: IPrecipitationPoint) =>
      p[0] >= this.south - margin && p[0] <= this.north + margin &&
      p[1] >= this.west - margin && p[1] <= this.east + margin
    );
  }

  @computed get seaSurfaceTempImgUrl() {
    return sstImages[this.season];
  }
  // Region boundaries. Used only for optimization.
  @observable public east = 45;
  @observable public north = 45;
  @observable public west = -45;
  @observable public south = -45;
  @observable public hurricaneTrack: ITrackPoint[] = [];
  // Current season, sets wind and sea temperature (in the future).
  @observable public season: Season;
  @observable public seaSurfaceTempData: PNG | null = null;
  @observable public precipitationPoints: IPrecipitationPoint[] = [];
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
  @observable public simulationRunning = false;
  @observable public strengthChangePositions: number[] = [];
  @observable public landfalls: ILandfall[] = [];
  @observable public stepsPerSecond = 0;
  public time = 0;
  public numberOfStepsOverSea = 0;
  public numberOfStepsOverLand = 0;
  public extendedLandfallAreas: LatLngBounds[] = Object.values(extendedLandfallBounds);
  public windKdTreeCache: any;
  // Callback used by tests.
  public _seaSurfaceTempDataParsed: () => void;
  protected initialState: SimulationModel;
  private previousTimestamp = 0;

  constructor(options?: ISimulationOptions) {
    if (!options) {
      options = {};
    }
    this.season = options.season || config.season;
    this.pressureSystems = (options.pressureSystems || config.pressureSystems).map(
      (o: IPressureSystemOptions) => new PressureSystem(o)
    );
    autorun(() => {
      // MobX autorun will re-run this block if any property used inside is updated. It's a bit of MobX magic
      // and one of its core features (more info can be found in MobX docs). That ensures that sea surface temperature
      // data is always updated when necessary.
      this.updateSeaSurfaceTempData();
    });
    this.initialState = JSON.parse(JSON.stringify(this));
  }

  @action.bound public updateBounds(bounds: LatLngBounds) {
    this.east = bounds.getEast();
    this.north = bounds.getNorth();
    this.west = bounds.getWest();
    this.south = bounds.getSouth();
  }

  @action.bound public setSeason(season: Season) {
    this.season = season;
  }

  @action.bound public setPressureSysCenter(pressureSystem: PressureSystem, center: ICoordinates) {
    pressureSystem.setCenter(center, this.pressureSystems.filter(ps => ps !== pressureSystem));
  }

  @action.bound public tick(timestamp = window.performance.now()) {
    if (this.time % benchmarkInterval === 0) {
      this.stepsPerSecond = 1000 / (timestamp - this.previousTimestamp) * benchmarkInterval;
      this.previousTimestamp = timestamp;
    }
    const trackSegmentThisTick = this.time % config.trackSegmentLength === 0;
    if (trackSegmentThisTick) {
      this.hurricaneTrack.push({
        position: Object.assign({}, this.hurricane.center),
        category: this.hurricane.category
      });
    }
    const windSpeed = this.windAt(this.hurricane.center);
    this.hurricane.move(windSpeed, config.timestep);

    const sst = this.seaSurfaceTempAt(this.hurricane.center);
    const enteredLand = sst === null && this.numberOfStepsOverSea >= minStepsOverSeaToDetectLandfall;
    const enteredWater = sst !== null && this.numberOfStepsOverLand >= 0;

    // Increase SST check interval around boundaries between land and water, so hurricane strength is updated
    // immediately after making landfall (or going back to the ocean). Otherwise, the hurricane could
    // stay too strong over land.
    if (this.time % config.sstCheckInterval === 0 || enteredLand || enteredWater) {
      this.hurricane.setStrengthChangeFromSST(sst);
      if (this.windShearPresent) {
        this.hurricane.applyWindShear(config.sstCheckInterval);
      }
    }
    const currentCategory = this.hurricane.category;
    this.hurricane.updateStrength();
    if (this.strengthChangePositions.length === 0 || currentCategory !== this.hurricane.category) {
      // add an extra point to the hurricane track if the track did not get an extra point this tick
      if (!trackSegmentThisTick) {
        this.hurricaneTrack.push({
          position: Object.assign({}, this.hurricane.center),
          category: this.hurricane.category
        });
      }
      // position changes are indexed references into the hurricaneTrack
      this.strengthChangePositions.push(this.hurricaneTrack.length - 1);
    }

    if (enteredLand || this.hurricaneWithinExtendedLandfallArea()) {
      this.landfalls.push({
        position: Object.assign({}, this.hurricane.center),
        category: this.hurricane.category
      });
    }

    if (sst !== null) {
      this.numberOfStepsOverSea += 1;
      this.numberOfStepsOverLand = 0;
    } else {
      this.numberOfStepsOverSea = 0;
      this.numberOfStepsOverLand += 1;
    }

    if (this.time % precipitationUpdateInterval === 0) {
      this.addPrecipitation();
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
      // add change for end-of-track so last segment gets a category marker
      const lastChangeIndex = this.strengthChangePositions.length
                                ? this.strengthChangePositions[this.strengthChangePositions.length - 1]
                                : 0;
      if (this.hurricaneTrack.length - 1 > lastChangeIndex) {
        this.strengthChangePositions.push(this.hurricaneTrack.length - 1);
      }
    }

    if (this.simulationRunning) {
      requestAnimationFrame(this.tick);
    }
  }

  @action public hurricaneWithinExtendedLandfallArea() {
    for (let i = 0; i < this.extendedLandfallAreas.length; i += 1) {
      const area = this.extendedLandfallAreas[i];
      if (area.contains(this.hurricane.center)) {
        // Remove this area, so it doesn't get detected again.
        this.extendedLandfallAreas.splice(i, 1);
        return true;
      }
    }
    return false;
  }

  @action public addPrecipitation() {
    const newPoints: IPrecipitationPoint[] = [];
    for (let steps = 0; steps < precipitationUpdateInterval; steps++) {
      const range = 8;
      // Add a single, large point to represent general, light precipitation.
      newPoints.push([
        this.hurricane.center.lat + (random() * range - 0.5 * range),
        this.hurricane.center.lng + (random() * range - 0.5 * range),
        0.007,
        900000
      ]);
      // Add a few smaller but more intense points to make precipitation data more interesting.
      for (let i = 0; i < 3; i++) {
        newPoints.push([
          this.hurricane.center.lat + (random() * range - 0.5 * range),
          this.hurricane.center.lng + (random() * range - 0.5 * range),
          0.002 * (this.hurricane.category + 8),
          300000
        ]);
      }
    }
    this.precipitationPoints.push(...newPoints);
  }

  @action.bound public start() {
    this.simulationRunning = true;
    if (!this.simulationStarted) {
      this.simulationStarted = true;
      // Remove wind data kd tree cache, as pressure system could have been moved by the user.
      this.windKdTreeCache = null;
    }
    this.tick();
  }

  @action.bound public stop() {
    this.simulationRunning = false;
  }

  // This only restarts simulation without reseting parameters like pressure systems, season, etc.
  @action.bound public restart() {
    this.simulationRunning = false;
    this.simulationFinished = false;
    this.simulationStarted = false;
    this.hurricaneTrack = [];
    this.landfalls = [];
    this.strengthChangePositions = [];
    this.precipitationPoints = [];
    this.time = 0;
    this.numberOfStepsOverSea = 0;
    this.numberOfStepsOverLand = 0;
    this.extendedLandfallAreas = Object.values(extendedLandfallBounds);
    this.hurricane.reset();
  }

  // That's a complete reset to the initial state.
  @action.bound public reset() {
    this.restart();
    this.pressureSystems.forEach(ps => ps.reset());
    this.season = this.initialState.season;
  }

  @action.bound public removePressureSystem(ps: PressureSystem) {
    const idx = this.pressureSystems.indexOf(ps);
    if (idx !== -1) {
      this.pressureSystems.splice(idx, 1);
    }
  }

  public getWindKdTree() {
    return new kdTree(this.wind, distanceTo, ["lat", "lng"]);
  }

  public windAt(point: ICoordinates): IVector {
    if (!this.windKdTreeCache) {
      // This is relatively expensive, so cache KD Tree.
      this.windKdTreeCache = this.getWindKdTree();
    }
    const wind = this.windKdTreeCache;
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

  public get categoryMarkerPositions() {
    const markerPositions: ITrackPoint[] = [];
    let prevTrackIndex = 0;
    this.strengthChangePositions.map(thisTrackIndex => {
      if (thisTrackIndex > 0) {
        const segmentCount = thisTrackIndex - prevTrackIndex;
        // even number of segments; put marker on middle join
        if (segmentCount % 2 === 0) {
          markerPositions.push(this.hurricaneTrack[prevTrackIndex + (segmentCount / 2)]);
        }
        // odd number of segments; put marker in middle of center segment
        else {
          const startIndex = prevTrackIndex + Math.floor(segmentCount / 2);
          const startPos = this.hurricaneTrack[startIndex];
          const endPos = this.hurricaneTrack[startIndex + 1];
          markerPositions.push({
            position: {
              lat: (startPos.position.lat + endPos.position.lat) / 2,
              lng: (startPos.position.lng + endPos.position.lng) / 2
            },
            category: startPos.category
          });
        }
      }
      prevTrackIndex = thisTrackIndex;
    });
    return markerPositions;
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
