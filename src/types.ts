export interface IVector {
  u: number;
  v: number;
}

export interface ICoordinates {
  lat: number;
  lng: number;
}

export interface IWindPoint extends IVector, ICoordinates {}

export interface IPrecipitationPoint extends Array<number> {
  [0]: number; // lat
  [1]: number; // lon
  [2]: number; // intensity
  [3]: number; // size
}

export interface ITrackPoint {
  position: ICoordinates;
  category: number;
}

export interface ILandfall {
  position: ICoordinates;
  category: number;
}

export type Season = "winter" | "spring" | "summer" | "fall";
export const seasonLabels: Record<Season, string> = {
  winter: "Winter",
  spring: "Spring",
  summer: "Summer",
  fall: "Fall"
};

export type StartLocation = "atlantic" | "gulf";
export const startLocationLabels: Record<StartLocation, string> = {
  atlantic: "Atlantic",
  gulf: "Gulf"
};

export const startLocations: Record<StartLocation, ICoordinates> = {
  atlantic: { lat: 10.5, lng: -20 },
  gulf: { lat: 25, lng: -90 }
};

export interface ISSTImages {
  winter: string;
  spring: string;
  summer: string;
  fall: string;
}
