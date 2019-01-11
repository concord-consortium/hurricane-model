export interface IVector {
  u: number;
  v: number;
}

export interface ICoordinates {
  lat: number;
  lng: number;
}

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
