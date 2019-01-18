import { LatLngExpression, Point, Map} from "leaflet";
import {action, observable, computed} from "mobx";
import { PressureSystem } from "./pressure-system";
import * as decWind from "../../wind-data-json/dec-simple.json";
import * as marchWind from "../../wind-data-json/mar-simple.json";
import * as juneWind from "../../wind-data-json/jun-simple.json";
import * as septWind from "../../wind-data-json/sep-simple.json";
import { kdTree } from "kd-tree-javascript";
import { ICoordinates, IWindPoint, ITrackPoint } from "../types";
import { vecAverage } from "../math-utils";
import {
  headingTo, moveTo, distanceTo
} from "geolocation-utils";

import config from "../config";

type Season = "winter" | "spring" | "summer" | "fall";

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

export class SimulationModel {
  // Region boundaries.
  @observable public east = 180;
  @observable public north = 90;
  @observable public west = -180;
  @observable public south = -90;
  @observable public zoom = 4;

  @observable hurricaneTrack: ITrackPoint[] = [];
  public time = 0;

  // Current season, sets wind and sea temperature (in the future).
  @observable public season: Season = config.season;

  // Pressure systems affect winds.
  @observable public pressureSystems: PressureSystem[] = [
    new PressureSystem({
      type: "high",
      center: {lat: 34, lng: -29},
      strength: 1500000
    }),
    new PressureSystem({
      type: "high",
      center: {lat: 34, lng: -53},
      strength: 1000000
    }),
    new PressureSystem({
      type: "low",
      center: {lat: 39, lng: -92},
      strength: 900000
    }),
    new PressureSystem({
      type: "low",
      center: {lat: 54, lng: -89},
      strength: 700000
    })
  ];

  @observable public hurricane: PressureSystem = new PressureSystem({
    type: "hurricane",
    center: config.initialHurricanePosition,
    strength: config.hurricaneStrength,
    strengthGradient: config.hurricaneStrengthGradient,
    speed: config.initialHurricaneSpeed
  });

  @observable public simulationStarted = false;

  @observable public latLngToContainerPoint: (arg: LatLngExpression) => Point = () => new Point(0, 0);

  @computed get baseWind() {
    return windData[this.season];
  }

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
      const dist = distanceTo(this.hurricane.center, w);
      if (dist < this.hurricane.range) {
        result.push(this.hurricane.applyToWindPoint(w));
      } else {
        result.push(w);
      }
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

  @action.bound public setPressureSysCenter(pressureSystem: PressureSystem, center: ICoordinates) {
    pressureSystem.setCenter(center, this.pressureSystems);
  }

  @action.bound public checkPressureSystem(pressureSystem: PressureSystem) {
    pressureSystem.checkPressureSystem(this.pressureSystems);
  }

  @action.bound public tick() {
    if (this.time % config.trackSegmentLength === 0) {
      this.hurricaneTrack.push({
        position: this.hurricane.center,
        strength: this.hurricane.strength
      })
    }
    const windSpeed = this.windAt(this.hurricane.center);
    this.hurricane.move(windSpeed, config.timestep);
    this.time += config.timestep;
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
    this.hurricane.center = config.initialHurricanePosition;
    this.hurricane.speed = config.initialHurricaneSpeed;
    this.hurricaneTrack = [];
    this.time = 0;
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
