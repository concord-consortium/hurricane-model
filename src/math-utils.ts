export interface IVector {
  u: number;
  v: number;
}

export interface ICoordinates {
  lat: number;
  lng: number;
}

const earthRadius = 6378; // km

export const latLngDistance = (p1: ICoordinates, p2: ICoordinates) => {
  const dLat = deg2rad(p2.lat - p1.lat);  // deg2rad below
  const dLon = deg2rad(p2.lng - p1.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(p1.lat)) * Math.cos(deg2rad(p2.lat)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  ;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c; // Distance in km
};

export const latLngPlusVector = (p: ICoordinates, vec: IVector) => {
  return {
    lat: p.lat  + (vec.v / earthRadius) * (180 / Math.PI),
    lng: p.lng + (vec.u / earthRadius) * (180 / Math.PI) / Math.cos(p.lat * Math.PI / 180)
  };
};

export const deg2rad = (deg: number) => {
  return deg * (Math.PI / 180);
};

export const angle = ({u, v}: IVector) => {
  return Math.atan2(v, u);
};

export const length = ({u, v}: IVector) => {
  return Math.sqrt(u * u + v * v);
};

export const rotate = ({u, v}: IVector, targetAngle: number) => {
  const currentAngle = angle({u, v});
  const angleDiff = targetAngle - currentAngle;
  return {
    u: Math.cos(angleDiff) * u - Math.sin(angleDiff) * v,
    v: Math.sin(angleDiff) * u + Math.cos(angleDiff) * v
  };
};

export const setLength = ({u, v}: IVector, targetLength: number) => {
  const ratio = targetLength / length({u, v});
  return {
    u: u * ratio,
    v: v * ratio
  };
};

export const perpendicular = ({u, v}: IVector, clockwise = true) => {
  return clockwise ? {u: v, v: -u} : {u: -v, v: u};
};

export const transform = (v1: IVector, v2: IVector, progress = 1) => {
  return {
    u: v1.u * (1 - progress) + v2.u * progress,
    v: v1.v * (1 - progress) + v2.v * progress
  };
};
