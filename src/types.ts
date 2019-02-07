export interface IVector {
  u: number;
  v: number;
}

export interface ICoordinates {
  lat: number;
  lng: number;
}

export interface IWindPoint extends IVector, ICoordinates {}

export interface ITrackPoint {
  position: ICoordinates;
  category: number;
}
