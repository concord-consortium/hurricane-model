import { action, observable, computed } from "mobx";
import { kdTree } from "kd-tree-javascript";
import { ICoordinates, IWindPoint } from "../types";
import { vecAverage } from "../math-utils";
import { headingTo, moveTo, distanceTo } from "geolocation-utils";
import config from "../config";

export type PressureSystemType = "high" | "low";

export interface IPressureSystemOptions {
  type?: PressureSystemType;
  center: ICoordinates;
  strength?: number;
}

// Limit pressure systems only to the northern hemisphere.
const minLat = 10;

const minDistToOtherSystems = (sys: PressureSystem, otherSystems: PressureSystem[]) => {
  const dists = otherSystems.map(ps => distanceTo(ps.center, sys.center));
  let minDist = Infinity;
  for (let i = 0; i < dists.length; i += 1) {
    if (otherSystems[i] !== sys && dists[i] < minDist) {
      minDist = dists[i];
    }
  }
  return minDist;
};

export class PressureSystem {
  @observable public type: PressureSystemType;
  @observable public center: ICoordinates;
  @observable public strength = config.pressureSystemStrength;

  public lastCorrectCenter: ICoordinates;

  @computed public get range() {
    // Range is proportional to strength.
    return this.strength * 200000;
  }

  constructor(props: IPressureSystemOptions) {
    this.type = props.type || "low";
    this.center = Object.assign({}, props.center);
    if (props.strength !== undefined) {
      this.strength = props.strength;
    }
  }

  public applyToWindPoint = (wind: IWindPoint) => {
    wind = Object.assign({}, wind);
    const direction = this.type === "high" ? 1 : -1;
    const offset = this.type === "high" ? config.highPressureSysAngleOffset : config.lowPressureSysAngleOffset;
    const heading = headingTo(this.center, wind) + 90 * direction - offset;
    const distNormalized = distanceTo(this.center, wind) / this.range;
    const exp = this.type === "high" ? 0.25 : 4;
    const distExp = Math.pow(distNormalized, exp);
    const length = this.type === "high" ? distExp * this.strength : (1 - distExp) * this.strength;
    const newPos = moveTo(wind, {distance: length, heading});
    const u = distanceTo({lng: newPos.lng, lat: 0}, {lng: wind.lng, lat: 0}) * (newPos.lng > wind.lng ? 1 : -1);
    const v = distanceTo({lng: 0, lat: newPos.lat}, {lng: 0, lat: wind.lat}) * (newPos.lat > wind.lat ? 1 : -1);
    let newWind = { u, v };
    if (distNormalized > config.smoothPressureSystemRatio) {
      const ratio = (distNormalized - config.smoothPressureSystemRatio) / (1 - config.smoothPressureSystemRatio);
      newWind = vecAverage([wind, newWind], [ratio, 1 - ratio]);
    }
    wind.u = newWind.u;
    wind.v = newWind.v;
    return wind;
  }

  @action.bound public setCenter(center: ICoordinates, pressureSystems: PressureSystem[]) {
    center.lat = Math.max(minLat, center.lat);
    if (minDistToOtherSystems(this, pressureSystems) >= config.minPressureSystemDistance) {
      this.lastCorrectCenter = center;
    }
    this.center = center;
  }

  @action.bound public setStrength(value: number) {
    this.strength = value;
  }

  @action.bound public checkPressureSystem(pressureSystems: PressureSystem[]) {
    if (this.lastCorrectCenter && minDistToOtherSystems(this, pressureSystems) <= config.minPressureSystemDistance) {
      this.center = this.lastCorrectCenter;
    }
  }
}
