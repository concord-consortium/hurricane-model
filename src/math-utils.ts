export interface IVector {
  u: number;
  v: number;
}

export interface ICoordinates {
  lat: number;
  lng: number;
}

export interface IWindPoint extends IVector, ICoordinates {}

const earthRadius = 6378000; // m

export const latLngPlusVector = (p: ICoordinates, vec: IVector) => {
  return {
    lat: p.lat  + (vec.v / earthRadius) * (180 / Math.PI),
    lng: p.lng + (vec.u / earthRadius) * (180 / Math.PI) / Math.cos(deg2rad(p.lat))
  };
};

export const deg2rad = (deg: number) => {
  return deg * (Math.PI / 180);
};

export const vecAverage = (vectors: IVector[], weights: number[]) => {
  const result = {
    u: 0,
    v: 0
  };
  let totalWeight = 0;
  vectors.forEach((v, idx) => {
    const w = weights[idx];
    result.u += v.u * w;
    result.v += v.v * w;
    totalWeight += w;
  });
  result.u /= totalWeight;
  result.v /= totalWeight;
  return result;
};
