import { kdTree } from "kd-tree-javascript";
import { IVector } from "../types";
import { latLngPlusVector } from "../math-utils";
import { IPressureSystemOptions, PressureSystem } from "./pressure-system";
import config from "../config";

export interface IHurricaneOptions extends IPressureSystemOptions {
  acceleration?: IVector;
  speed?: IVector;
}

export class Hurricane extends PressureSystem {
  public speed = {u: 0, v: 0};

  constructor(props: IHurricaneOptions) {
    super(Object.assign({}, props, {type: "low"}));
    if (props.speed !== undefined) {
      this.speed = props.speed;
    }
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
}
