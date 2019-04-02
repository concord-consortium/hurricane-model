// So we can import CSS modules.
declare module "*.sass";
declare module "*.scss";
declare module "react-leaflet-canvas-layer";
declare module "kd-tree-javascript";
declare module "my-canvas-layer";
declare module "*.svg" {
  const content: any;
  export default content;
}
declare module "*.png" {
  const value: string;
  export = value;
}
declare module "geolocation-utils";
declare module "react-leaflet-control";
declare module "shutterbug";
