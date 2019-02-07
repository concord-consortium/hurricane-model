import { kdTree } from "kd-tree-javascript";
import { IVector } from "../types";
import { computed } from "mobx";
import { latLngPlusVector } from "../math-utils";
import { IPressureSystemOptions, PressureSystem } from "./pressure-system";
import config from "../config";
import { random } from "../seedrandom";

// Sea surface temperature 28.25*C is an important value. Sea needs to be warmer than that so the hurricane
// can get stronger than category 3. Based on following the research:
// https://agupubs.onlinelibrary.wiley.com/doi/full/10.1029/2006GL025757
const cat3SSTThreshold = 28.25;
const cat1SSTThreshold = 26;

// Based on: https://www.nhc.noaa.gov/aboutsshws.php, but converted to m/s.
const hurricaneMaxWindSpeedByCategory = [
  33, // category 0, max speed that doesn't classify as hurricane yet
  43, // category 1
  49, // category 2
  58, // category 3
  70, // category 4
  Infinity // category 5
];
const maxWindSpeed = 85; // m/s, a

export interface IHurricaneOptions extends IPressureSystemOptions {
  speed?: IVector;
}

export class Hurricane extends PressureSystem {
  public speed: IVector = Object.assign({}, config.initialHurricaneSpeed);
  public strengthChange = 0;
  public cat3SSTThresholdReached = false;
  private initialProps: IHurricaneOptions;

  constructor(props: IHurricaneOptions) {
    super(Object.assign({}, props, {type: "low"}));
    if (props.speed !== undefined) {
      this.speed = Object.assign({}, props.speed);
    }
    this.initialProps = props;
  }

  @computed public get range() {
    // Hurricane range is a bit different than a pressure system range.
    return Math.pow(this.strength, 0.7) * 45000;
  }

  @computed public get category(): number {
    let currentCategory = -1;
    hurricaneMaxWindSpeedByCategory.forEach((maxSpeed, category) => {
      if (currentCategory === -1 && this.strength <= maxSpeed) {
        currentCategory = category;
      }
    });
    return currentCategory;
  }

  // When hurricane gets weak enough, hide it and stop the model.
  @computed public get active(): boolean {
    return this.strength > config.minHurricaneStrength;
  }

  public move(windSpeed: IVector, timestep: number) {
    // Simple Euler integration. Global wind speed is used to push / accelerate hurricane center.
    this.speed.u *= config.pressureSysMomentum;
    this.speed.v *= config.pressureSysMomentum;
    this.speed.u += windSpeed.u * config.globalWindToAcceleration * timestep;
    this.speed.v += windSpeed.v * config.globalWindToAcceleration * timestep;
    const posDiff = {u: this.speed.u * timestep, v: this.speed.v * timestep};
    this.center = latLngPlusVector(this.center, posDiff);
  }

  public setStrengthChangeFromSST(sst: number | null) {
    if (sst === null) {
      // Use X*C as a dummy value when SST is not available -> when hurricane is over land.
      // X*C should cool enough to slowly make hurricane disappear. If this value is lower, it will
      // increase speed of hurricane weakening, if it's higher, it will decrease it.
      sst = -10; // *C
    }
    // There's bunch of number here. Tweaking them will affect how fast hurricanes are growing or dissipating.
    // It's based on empirical tests, so the model looks realistic (as much as it can).
    if (sst < cat1SSTThreshold) {
      const diff = (sst - cat1SSTThreshold) / 300;
      this.strengthChange = diff - 0.05 * random();
      this.cat3SSTThresholdReached = false;
    } else if (sst > cat1SSTThreshold && sst < cat3SSTThreshold) {
      this.strengthChange = random() * 0.2 - 0.02;
      this.cat3SSTThresholdReached = false;
    } else {
      this.strengthChange = random() * 0.15 - 0.01;
      this.cat3SSTThresholdReached = true;
    }
  }

  public updateStrength() {
    // Note that cat3SSTThresholdReached defines whether hurricane can become a major hurricane (cat >= 3).
    if (
      this.cat3SSTThresholdReached ||
      this.strength + this.strengthChange <= hurricaneMaxWindSpeedByCategory[2] ||
      this.strengthChange < 0
    ) {
      this.strength += this.strengthChange;
      this.strength = Math.min(this.strength, maxWindSpeed);
    }
  }

  public reset() {
    const props = this.initialProps;
    this.strength = props.strength !== undefined ? props.strength : config.hurricaneStrength;
    this.center = Object.assign({}, props.center || config.initialHurricanePosition);
    this.speed = Object.assign({}, props.speed || config.initialHurricaneSpeed);
    this.strengthChange = 0;
  }
}
