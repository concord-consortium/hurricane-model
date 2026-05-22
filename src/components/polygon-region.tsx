import * as React from "react";
import { Polygon } from "react-leaflet";
import { PathOptions } from "leaflet";
import { Region } from "../utils/region";

const defaultPathOptions = {
  color: "#0072B2",
  weight: 2,
  fillColor: "#0072B2",
  fillOpacity: 0.1,
};

interface IProps {
  region: Region;
  pathOptions?: PathOptions;
}

export function PolygonRegion({ region, pathOptions }: IProps) {
  const po = { ...defaultPathOptions, ...(pathOptions ?? {}) };
  return <Polygon positions={region.latLngs} pathOptions={po} />;
}
