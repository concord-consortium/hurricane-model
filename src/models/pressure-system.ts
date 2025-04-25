import { action, observable, computed } from "mobx";
import { ICoordinates, IWindPoint } from "../types";
import { vecAverage } from "../math-utils";
import { headingTo, moveTo, distanceTo } from "geolocation-utils";
import config from "../config";

export type PressureSystemType = "high" | "low";

export interface IPressureSystemOptions {
  type?: PressureSystemType;
  center: ICoordinates;
  // Strength represents a max wind speed in a given pressure system, in m/s.
  // Typical range is between 5-25m/s. Stronger pressure system might be considered a storm or a hurricane.
  strength?: number;
}

// Limit pressure systems only to the northern hemisphere.
const minLat = 15;

const minDistToOtherSystems = (center: ICoordinates, otherSystems: PressureSystem[]) => {
  const dists = otherSystems.map(ps => distanceTo(
    {lat: ps.center.lat, lon: ps.center.lng},
    {lat: center.lat, lon: center.lng}
  ));
  let minDist = Infinity;
  let heading = null;
  for (let i = 0; i < dists.length; i += 1) {
    if (dists[i] < minDist) {
      minDist = dists[i];
      heading = headingTo(
        {lat: center.lat, lon: center.lng},
        {lat: otherSystems[i].center.lat, lon: otherSystems[i].center.lng}
      );
    }
  }
  return { minDist, heading };
};

export class PressureSystem {
  @observable public type: PressureSystemType;
  @observable public center: ICoordinates;
  @observable public strength = config.pressureSystemStrength;
  protected initialState: PressureSystem;

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
    this.initialState = JSON.parse(JSON.stringify(this));
  }

  public applyToWindPoint = (wind: IWindPoint) => {
    wind = Object.assign({}, wind);
    const direction = this.type === "high" ? 1 : -1;
    const offset = this.type === "high" ? config.highPressureSysAngleOffset : config.lowPressureSysAngleOffset;
    const ctrLat = this.center.lat;
    const ctrLon = this.center.lng;
    const heading = headingTo({lat: ctrLat, lon: ctrLon}, {lat: wind.lat, lon: wind.lng}) + 90 * direction - offset;
    const distNormalized = distanceTo({lat: ctrLat, lon: ctrLon}, {lat: wind.lat, lon: wind.lng}) / this.range;
    const exp = this.type === "high" ? 0.25 : 4;
    const distExp = Math.pow(distNormalized, exp);
    const length = this.type === "high" ? distExp * this.strength : (1 - distExp) * this.strength;
    const newPos = moveTo({lat: wind.lat, lon: wind.lng}, {distance: length, heading});
    const u = distanceTo({lat: 0, lon: newPos.lon}, {lat: 0, lon: wind.lng}) * (newPos.lon > wind.lng ? 1 : -1);
    const v = distanceTo({lat: newPos.lat, lon: 0}, {lat: wind.lat, lon: 0}) * (newPos.lat > wind.lat ? 1 : -1);
    let newWind = { u, v };
    if (distNormalized > config.smoothPressureSystemRatio) {
      const ratio = (distNormalized - config.smoothPressureSystemRatio) / (1 - config.smoothPressureSystemRatio);
      newWind = vecAverage([wind, newWind], [ratio, 1 - ratio]);
    }
    wind.u = newWind.u;
    wind.v = newWind.v;
    return wind;
  }

  public serialize() {
    return {
      type: this.type,
      center: {
        lat: this.center.lat,
        lng: this.center.lng
      },
      strength: this.strength
    };
  }

  @action.bound public setCenter(center: ICoordinates, otherPressureSystems: PressureSystem[]) {
    center.lat = Math.max(minLat, center.lat);
    const step = config.minPressureSystemDistance / 100;
    const minDistRes = minDistToOtherSystems(center, otherPressureSystems);
    const heading = minDistRes.heading || 0; // Provide default heading if null
    let minDist = minDistRes.minDist;
    // Why is an iterative approach used instead of a single calculation based on the minPressureSystemDistance
    // and heading? Note this single calculation could result in new center being to close to another pressure system.
    // Iterative calculations ensure that we'll always end up away from *all* the pressure systems. Initial heading
    // is used, so the interaction feels a bit more natural for user.
    while (minDist < config.minPressureSystemDistance) {
      const newPos = moveTo(
        {lat: center.lat, lon: center.lng},
        { distance: step, heading: heading + 180 }
      );
      center = { lat: newPos.lat, lng: newPos.lon };
      minDist = minDistToOtherSystems(center, otherPressureSystems).minDist;
    }
    this.center = center;
  }

  @action.bound public setStrength(value: number) {
    this.strength = value;
  }

  @action public reset() {
    this.center = Object.assign({}, this.initialState.center);
    this.strength = this.initialState.strength;
    this.type = this.initialState.type;
  }
}
