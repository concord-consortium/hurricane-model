import { action, observable } from "mobx";
import { kdTree } from "kd-tree-javascript";
import { ICoordinates, IVector, IWindPoint } from "../types";
import { latLngPlusVector, vecAverage } from "../math-utils";
import {
  headingTo, moveTo, distanceTo
} from "geolocation-utils";
import config from "../config";

export type PressureSystemType = "high" | "low" | "hurricane";

interface IPressureSystemOptions {
  type: PressureSystemType;
  center: ICoordinates;
  strength?: number;
  strengthGradient?: number;
  acceleration?: IVector;
  speed?: IVector;
}

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
  @observable public strengthGradient = config.pressureSystemIntensityGradient;
  @observable public strength = config.pressureSystemStrength;

  public speed = {u: 0, v: 0};

  public lastCorrectCenter: ICoordinates;

  public get range() {
    return this.strength * this.strengthGradient;
  }

  constructor(props: IPressureSystemOptions) {
    this.type = props.type;
    this.center = props.center;
    if (props.strength !== undefined) {
      this.strength = props.strength;
    }
    if (props.strengthGradient !== undefined) {
      this.strengthGradient = props.strengthGradient;
    }
    if (props.speed !== undefined) {
      this.speed = props.speed;
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
    const prependVecEnd = moveTo(wind, {distance: length, heading});
    let newWind = {u: prependVecEnd.lng - wind.lng, v: prependVecEnd.lat - wind.lat};
    if (distNormalized > config.smoothPressureSystemRatio) {
      const ratio = (distNormalized - config.smoothPressureSystemRatio) / (1 - config.smoothPressureSystemRatio);
      newWind = vecAverage([wind, newWind], [ratio, 1 - ratio]);
    }
    wind.u = newWind.u;
    wind.v = newWind.v;
    return wind;
  }

  public move = (windSpeed: IVector, timestep: number) => {
    // Simple Euler integration. Global wind speed is used to push / accelerate hurricane center.
    this.speed.u *= config.pressureSysMomentum;
    this.speed.v *= config.pressureSysMomentum;
    this.speed.u += windSpeed.u * config.globalWindToAcceleration * timestep;
    this.speed.v += windSpeed.v * config.globalWindToAcceleration * timestep;
    const posDiff = {u: this.speed.u * timestep, v: this.speed.v * timestep};
    this.center = latLngPlusVector(this.center, posDiff);
  }

  @action.bound public setCenter(center: ICoordinates, pressureSystems: PressureSystem[]) {
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
