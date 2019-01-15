import { LatLngExpression, Point, Map} from "leaflet";
import {action, observable, computed} from "mobx";
import * as decWind from "../../wind-data-json/dec-simple.json";
import * as marchWind from "../../wind-data-json/mar-simple.json";
import * as juneWind from "../../wind-data-json/jun-simple.json";
import * as septWind from "../../wind-data-json/sep-simple.json";
import { kdTree } from "kd-tree-javascript";
import {
  ICoordinates, IVector, rotate, length, transform, angle, setLength, perpendicular, latLngPlusVector
} from "../math-utils";
import {
  headingTo, moveTo, distanceTo
} from "geolocation-utils";

import config from "../config";

type Season = "winter" | "spring" | "summer" | "fall";

interface IWindPoint extends IVector, ICoordinates {}

interface IWindDataset {
  winter: IWindPoint[];
  spring: IWindPoint[];
  summer: IWindPoint[];
  fall: IWindPoint[];
}

const windData: IWindDataset = {
  winter: decWind.windVectors,
  spring: marchWind.windVectors,
  summer: juneWind.windVectors,
  fall: septWind.windVectors
};

const pressureSystemRange = 3000000; // m
const pressureSystemStrength = 10;
const pressureSystemAngleOffset = 0.3; // radians

const hurricaneRange = 1200000; // m
const hurricaneStrength = 30;

const timestep = 1;
// Ratio describing how hard is the global wind pushing hurricane.
const globalWindToHurricaneAcceleration = 70;
// The bigger momentum, the longer hurricane will follow its own path, ignoring global wind.
const hurricaneMomentum = 0.96;

const initialHurricanePosition = {lat: 15, lng: -20};
const initialHurricaneSpeed = {u: 0, v: 0};
const initialHurricaneAcceleration = {u: 0, v: 0};

const minPressureSystemDistance = 700000; // m

export class SimulationModel {
  // Region boundaries.
  @observable public east = 180;
  @observable public north = 90;
  @observable public west = -180;
  @observable public south = -90;
  @observable public zoom = 4;

  // Current season, sets wind and sea temperature (in the future).
  @observable public season: Season = config.season;

  // Pressure systems affect winds.
  @observable public highPressure: ICoordinates = {lat: 30, lng: -28};
  @observable public lowPressure: ICoordinates = {lat: 38, lng: -80};

  @observable public hurricanePos: ICoordinates = initialHurricanePosition;
  @observable public hurricaneSpeed: IVector = initialHurricaneSpeed;
  @observable public hurricaneAcceleration: IVector = initialHurricaneAcceleration;
  @observable public simulationStarted = false;

  @observable public latLngToContainerPoint: (arg: LatLngExpression) => Point = () => new Point(0, 0);

  @computed get baseWind() {
    return windData[this.season];
  }

  @computed get wind() {
    const result: IWindPoint[] = [];
    this.baseWind.forEach(w => {
      const newWind = Object.assign({}, w);
      const distFromHighP = distanceTo(this.highPressure, w);
      const distFromLowP = distanceTo(this.lowPressure, w);
      let lowPWindMod = {u: 0, v: 0};
      let highPWindMod = {u: 0, v: 0};
      if (distFromLowP < pressureSystemRange) {
        const perpendVec = perpendicular({u: w.lng - this.lowPressure.lng, v: w.lat - this.lowPressure.lat}, false);
        const targetLength = (1 - distFromLowP / pressureSystemRange) * pressureSystemStrength;
        const targetWind = setLength(rotate(w, angle(perpendVec) + pressureSystemAngleOffset), targetLength);
        lowPWindMod = transform(w, targetWind, 1 - Math.pow(distFromLowP / pressureSystemRange, 4));
      }
      if (distFromHighP && distFromHighP < pressureSystemRange) {
        const perpendVec = perpendicular({u: w.lng - this.highPressure.lng, v: w.lat - this.highPressure.lat}, true);
        const targetLength = distFromHighP / pressureSystemRange * pressureSystemStrength;
        const targetWind = setLength(rotate(w, angle(perpendVec) + pressureSystemAngleOffset), targetLength);
        highPWindMod = transform(w, targetWind, 1 - Math.pow(distFromHighP / pressureSystemRange, 4));
      }
      let pressureAffectedWind = {u: 0, v: 0};
      if (length(highPWindMod) && length(lowPWindMod)) {
        const hf = distFromHighP / pressureSystemRange;
        const lf = distFromLowP / pressureSystemRange;
        pressureAffectedWind = transform(highPWindMod, lowPWindMod, hf / (hf + lf));
      } else if (length(highPWindMod)) {
        pressureAffectedWind = highPWindMod;
      } else if (length(lowPWindMod)) {
        pressureAffectedWind = lowPWindMod;
      }
      if (length(pressureAffectedWind) > 0) {
        newWind.u = pressureAffectedWind.u;
        newWind.v = pressureAffectedWind.v;
      }
      result.push(newWind);
    });
    return result;
  }

  @computed get windKdTree() {
    return new kdTree(this.wind, distanceTo, ["lat", "lng"]);
  }

  @computed get windIncBounds() {
    return this.wind.filter(p =>
      p.lng >= this.west && p.lng <= this.east && p.lat >= this.south && p.lat <= this.north
    );
  }

  // Note that his data is used ONLY for rendering. Hurricane simulation uses data without effect of the
  // hurricane itself.
  @computed get windIncHurricane() {
    const result: IWindPoint[] = [];
    this.windIncBounds.forEach(w => {
      const newWind = Object.assign({}, w);
      const distFromHurricane = distanceTo(this.hurricanePos, w);
      if (distFromHurricane < hurricaneRange) {
        const perpendVec = perpendicular({u: w.lng - this.hurricanePos.lng, v: w.lat - this.hurricanePos.lat}, false);
        const targetLength = (1 - distFromHurricane / hurricaneRange) * hurricaneStrength;
        const targetWind = setLength(rotate(w, angle(perpendVec) + pressureSystemAngleOffset), targetLength);
        const hurricaneMod = transform(w, targetWind, 1 - Math.pow(distFromHurricane / hurricaneRange, 4));
        newWind.u = hurricaneMod.u;
        newWind.v = hurricaneMod.v;
      }
      result.push(newWind);
    });
    return result;
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

  @action.bound public setHighPressure(center: ICoordinates) {
    if (this.lowPressure && distanceTo(center, this.lowPressure) > minPressureSystemDistance) {
      this.highPressure = center;
    } else {
      const heading = headingTo(this.lowPressure, center);
      this.highPressure = moveTo(this.lowPressure, { heading, distance: minPressureSystemDistance * 1.1 });
    }
  }

  @action.bound public setLowPressure(center: ICoordinates) {
    if (this.highPressure && distanceTo(center, this.highPressure) > minPressureSystemDistance) {
      this.lowPressure = center;
    } else {
      const heading = headingTo(this.highPressure, center);
      this.lowPressure = moveTo(this.highPressure, { heading, distance: minPressureSystemDistance * 1.1 });
    }
  }

  @action.bound public tick() {
    // Simple Euler integration. Global wind speed is used to push / accelerate hurricane center.
    const windSpeed = this.windAt(this.hurricanePos);
    this.hurricaneSpeed.u *= hurricaneMomentum;
    this.hurricaneSpeed.v *= hurricaneMomentum;
    this.hurricaneSpeed.u += windSpeed.u * globalWindToHurricaneAcceleration * timestep;
    this.hurricaneSpeed.v += windSpeed.v * globalWindToHurricaneAcceleration * timestep;
    const posDiff = {u: this.hurricaneSpeed.u * timestep, v: this.hurricaneSpeed.v * timestep};
    this.hurricanePos = latLngPlusVector(this.hurricanePos, posDiff);
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
    this.hurricanePos = initialHurricanePosition;
    this.hurricaneSpeed = initialHurricaneSpeed;
    this.hurricaneAcceleration = initialHurricaneAcceleration;
  }

  public windAt(point: ICoordinates) {
    const wind = this.windKdTree;
    const nearestPoints = wind.nearest(point, 4);
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
}
