import * as React from "react";
import { Polygon } from "react-leaflet";
import { PathOptions } from "leaflet";
import { Region } from "../utils/region";

const defaultPathOptions = {
  color: "#fff",
  weight: 1.5,
  fillColor: "#fff",
  fillOpacity: 0.2
};

interface IProps {
  region: Region;
  pathOptions?: PathOptions;
}

export function PolygonRegion({ region, pathOptions }: IProps) {
  const po = { ...defaultPathOptions, ...(pathOptions ?? {}) };
  return <Polygon positions={region.latLngs} pathOptions={po} />;
}
