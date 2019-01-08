import { LatLngExpression, Point, Map} from "leaflet";
import {action, observable, computed} from "mobx";
import * as decWind from "../../wind-data-json/dec-simple.json";
import * as marchWind from "../../wind-data-json/mar-simple.json";
import * as juneWind from "../../wind-data-json/jun-simple.json";
import * as septWind from "../../wind-data-json/sep-simple.json";
import { kdTree } from "kd-tree-javascript";
import {
  ICoordinates, IVector, rotate, length, transform, latLonDistance, angle, setLength, perpendicular
} from "../math-utils";
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

const pressureSystemRange = 2200; // km
const pressureSystemWindSpeedFactor = 10;
const pressureSystemAngleOffset = 0.3; // radians

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
  @observable public highPressure: ICoordinates | null = {lat: 30, lng: -28};
  @observable public lowPressure: ICoordinates | null = {lat: 38, lng: -80};

  @observable public latLngToContainerPoint: (arg: LatLngExpression) => Point = () => new Point(0, 0);

  @computed get baseWind() {
    return windData[this.season];
  }

  @computed get wind() {
    if (!this.highPressure && !this.lowPressure) {
      return this.baseWind;
    }
    const result: IWindPoint[] = [];
    this.baseWind.forEach(w => {
      const newWind = Object.assign({}, w);
      const distFromHighP = latLonDistance(this.highPressure!, w);
      const distFromLowP = latLonDistance(this.lowPressure!, w);
      let lowPWindMod = {u: 0, v: 0};
      let highPWindMod = {u: 0, v: 0};
      if (distFromLowP && distFromLowP < pressureSystemRange) {
        const perpendVec = perpendicular({u: w.lng - this.lowPressure!.lng, v: w.lat - this.lowPressure!.lat}, false);
        const targetLength = (1 - distFromLowP / pressureSystemRange) * pressureSystemWindSpeedFactor;
        const targetWind = setLength(rotate(w, angle(perpendVec) + pressureSystemAngleOffset), targetLength);
        lowPWindMod = transform(w, targetWind, 1 - Math.pow(distFromLowP / pressureSystemRange, 4));
      }
      if (distFromHighP && distFromHighP < pressureSystemRange) {
        const perpendVec = perpendicular({u: w.lng - this.highPressure!.lng, v: w.lat - this.highPressure!.lat}, true);
        const targetLength = distFromHighP / pressureSystemRange * pressureSystemWindSpeedFactor;
        const targetWind = setLength(rotate(w, angle(perpendVec) + pressureSystemAngleOffset), targetLength);
        highPWindMod = transform(w, targetWind, 1 - Math.pow(distFromHighP / pressureSystemRange, 4));
      }
      let pressureAffectedWind = {u: 0, v: 0};
      if (length(highPWindMod) && length(lowPWindMod)) {
        pressureAffectedWind = transform(highPWindMod, lowPWindMod, 0.5);
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
    return new kdTree(this.wind, latLonDistance, ["lat", "lng"]);
  }

  @computed get windIncBounds() {
    return this.wind.filter(p =>
      p.lng >= this.west && p.lng <= this.east && p.lat >= this.south && p.lat <= this.north
    );
  }

  @action public updateMap(map: Map) {
    const bounds = map.getBounds();
    this.east = bounds.getEast();
    this.north = bounds.getNorth();
    this.west = bounds.getWest();
    this.south = bounds.getSouth();
    this.zoom = map.getZoom();

    this.latLngToContainerPoint = map.latLngToContainerPoint.bind(map);
  }

  @action public setHighPressure(center: ICoordinates) {
    this.highPressure = center;
  }

  @action public setLowPressure(center: ICoordinates) {
    this.lowPressure = center;
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
