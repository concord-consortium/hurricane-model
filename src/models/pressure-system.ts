import { action, observable } from "mobx";
import { kdTree } from "kd-tree-javascript";
import {
  ICoordinates, IVector, IWindPoint, latLngPlusVector, vecAverage
} from "../math-utils";
import {
  headingTo, moveTo, distanceTo
} from "geolocation-utils";

type PressureSystemType = "high" | "low" | "hurricane";

interface IPressureSystemOptions {
  type: PressureSystemType;
  center: ICoordinates;
  strength?: number;
  range?: number;
  acceleration?: IVector;
  speed?: IVector;
}

const pressureSystemRange = 2500000; // m
const pressureSystemStrength = 1200000;
const lowPressureSysAngleOffset = 20; // deg
const highPressureSysAngleOffset = 8; // deg
// When wind is far enough from the center of the pressure system, pressure system effect is lower
// and we start smoothing it out.
const smoothPressureSystemRatio = 0.75;

// Min distance between two pressure systems.
const minPressureSystemDistance = 700000; // m

// Ratio describing how hard is the global wind pushing hurricane.
const globalWindToAcceleration = 100;
// The bigger momentum, the longer hurricane will follow its own path, ignoring global wind.
const pressureSysMomentum = 0.92;

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
  @observable public range = pressureSystemRange;
  @observable public strength = pressureSystemStrength;

  public speed = {u: 0, v: 0};

  public lastCorrectCenter: ICoordinates;

  constructor(props: IPressureSystemOptions) {
    this.type = props.type;
    this.center = props.center;
    if (props.range !== undefined) {
      this.range = props.range;
    }
    if (props.strength !== undefined) {
      this.strength = props.strength;
    }
    if (props.speed !== undefined) {
      this.speed = props.speed;
    }
  }

  public applyToWindPoint = (wind: IWindPoint) => {
    wind = Object.assign({}, wind);
    const direction = this.type === "high" ? 1 : -1;
    const offset = this.type === "high" ? highPressureSysAngleOffset : lowPressureSysAngleOffset;
    const heading = headingTo(this.center, wind) + 90 * direction - offset;
    const distNormalized = distanceTo(this.center, wind) / this.range;
    const exp = this.type === "high" ? 0.25 : 4;
    const distExp = Math.pow(distNormalized, exp);
    const length = this.type === "high" ? distExp * this.strength : (1 - distExp) * this.strength;
    const prependVecEnd = moveTo(wind, {distance: length, heading});
    let newWind = {u: prependVecEnd.lng - wind.lng, v: prependVecEnd.lat - wind.lat};
    if (distNormalized > smoothPressureSystemRatio) {
      const ratio = (distNormalized - smoothPressureSystemRatio) / (1 - smoothPressureSystemRatio);
      newWind = vecAverage([wind, newWind], [ratio, 1 - ratio]);
    }
    wind.u = newWind.u;
    wind.v = newWind.v;
    return wind;
  }

  public move = (windSpeed: IVector, timestep: number) => {
    // Simple Euler integration. Global wind speed is used to push / accelerate hurricane center.
    this.speed.u *= pressureSysMomentum;
    this.speed.v *= pressureSysMomentum;
    this.speed.u += windSpeed.u * globalWindToAcceleration * timestep;
    this.speed.v += windSpeed.v * globalWindToAcceleration * timestep;
    const posDiff = {u: this.speed.u * timestep, v: this.speed.v * timestep};
    this.center = latLngPlusVector(this.center, posDiff);
  }

  @action.bound public setCenter(center: ICoordinates, pressureSystems: PressureSystem[]) {
    if (minDistToOtherSystems(this, pressureSystems) >= minPressureSystemDistance) {
      this.lastCorrectCenter = center;
    }
    this.center = center;
  }

  @action.bound public checkPressureSystem(pressureSystems: PressureSystem[]) {
    if (this.lastCorrectCenter && minDistToOtherSystems(this, pressureSystems) <= minPressureSystemDistance) {
      this.center = this.lastCorrectCenter;
    }
  }
}
