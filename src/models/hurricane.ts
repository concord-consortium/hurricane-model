import { action, computed, extendObservable, override } from "mobx";
import config from "../config";
import { latLngPlusVector } from "../math-utils";
import { random } from "../seedrandom";
import { IVector } from "../types";
import {
  hurricaneCategoryInfo, hurricaneMaxWindSpeedByCategory, maxHurricaneSpeed, minHurricaneSpeed, maxWindSpeed
} from "../constants";
import { IPressureSystemOptions, PressureSystem } from "./pressure-system";

// Sea surface temperature 28.25*C is an important value. Sea needs to be warmer than that so the hurricane
// can get stronger than category 3. Based on following the research:
// https://agupubs.onlinelibrary.wiley.com/doi/full/10.1029/2006GL025757
const cat3SSTThreshold = 28.25;
const cat1SSTThreshold = 26;
// Add additional force that pushes hurricane away from equator. It's pretty much impossible for a hurricane
// to cross equator. See:
// https://earthscience.stackexchange.com/questions/239/impossible-or-improbable-hurricane-crossing-the-equator
// It gets activated when the hurricane crosses equatorPushLatThreshold.
const equatorPushLatThreshold = 10;

export interface IHurricaneOptions extends IPressureSystemOptions {
  speed?: IVector;
  startingCategory?: number;
}

export class Hurricane extends PressureSystem {
  public speed: IVector = Object.assign({}, config.initialHurricaneSpeed);
  public strengthChange = 0;
  public cat3SSTThresholdReached = false;
  // Declared here for typing; the actual observable is installed via extendObservable in the
  // constructor. The PressureSystem base already calls makeObservable, and MobX 6's class-field
  // @observable annotation on a subclass instance field does not get picked up by the base call.
  public declare startingCategory: number | undefined;
  protected initialState: Hurricane;

  constructor(props: IHurricaneOptions) {
    super(Object.assign({}, props, {type: "low"}));
    // The hurricane's position is restricted via other means (dropdown options or a bound area)
    this.minLat = -Infinity;
    this.keepDistanceFromOtherSystems = false; // It's ok for hurricanes to overlap with pressure systems
    if (props.speed !== undefined) {
      this.speed = Object.assign({}, props.speed);
    }
    extendObservable(this, { startingCategory: undefined as number | undefined });
    if (props.startingCategory !== undefined) {
      this.setStartingCategory(props.startingCategory);
    }
    this.initialState = JSON.parse(JSON.stringify(this));
  }

  @action.bound public setStartingCategory(category: number) {
    const categoryNum = Number(category);
    if (!Number.isFinite(categoryNum)) return;

    const clamped = Math.max(0, Math.min(hurricaneCategoryInfo.length - 1, Math.floor(categoryNum)));
    this.startingCategory = clamped;
    this.setStrength(hurricaneCategoryInfo[clamped].startingWindSpeed);
  }

  @override public get range() {
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

    if (this.center.lat < equatorPushLatThreshold) {
      const revDistance = equatorPushLatThreshold - this.center.lat;
      // Add additional force that pushes hurricane away from equator. It's pretty much impossible for a hurricane
      // to cross equator. See:
      // https://earthscience.stackexchange.com/questions/239/impossible-or-improbable-hurricane-crossing-the-equator
      this.speed.v += Math.pow(revDistance * config.globalWindToAcceleration, 1.1) * timestep;
    }

    const speedValue = Math.sqrt(this.speed.u * this.speed.u + this.speed.v * this.speed.v);
    if (speedValue > maxHurricaneSpeed) {
      this.speed.u *= maxHurricaneSpeed / speedValue;
      this.speed.v *= maxHurricaneSpeed / speedValue;
    }

    const posDiff = {u: this.speed.u * timestep, v: this.speed.v * timestep};
    this.center = latLngPlusVector(this.center, posDiff);
  }

  public setStrengthChangeFromSST(sst: number | null) {
    if (sst === null) {
      // Use X*C as a dummy value when SST is not available -> when hurricane is over land.
      // X*C should cool enough to slowly make hurricane disappear. If this value is lower, it will
      // increase speed of hurricane weakening, if it's higher, it will decrease it.
      sst = config.landTemperature as number; // *C
    }
    const speedValue = Math.sqrt(this.speed.u * this.speed.u + this.speed.v * this.speed.v);
    if (speedValue < minHurricaneSpeed) {
      // Make sure that if hurricane slows down and get stuck (it rarely happens but it can), it eventually dissipates.
      sst = config.landTemperature as number; // *C
    }
    // There's a bunch of numbers here. Tweaking them will affect how fast hurricanes are growing or dissipating.
    // It's based on empirical tests, so the model looks realistic (as much as it can).
    if (sst < cat1SSTThreshold) {
      this.strengthChange = (sst - cat1SSTThreshold) / 5;
      this.cat3SSTThresholdReached = false;
    } else if (sst > cat1SSTThreshold && sst < cat3SSTThreshold) {
      this.strengthChange = random() * 0.25 - 0.05;
      this.cat3SSTThresholdReached = false;
    } else {
      this.strengthChange = random() * 0.25 - 0.02;
      this.cat3SSTThresholdReached = true;
    }
  }

  public applyWindShear(timeDiff: number) {
    // Wind shear simply makes hurricane weaker and weaker.
    this.strengthChange -= timeDiff * config.windShearStrength;
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

  @override public reset() {
    super.reset();
    this.speed = Object.assign({}, this.initialState.speed);
    this.strengthChange = 0;
    this.cat3SSTThresholdReached = false;
  }
}
