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
  // These regions are visual outlines only (the storm placement area, the SST anomaly regions). Making
  // them non-interactive stops Leaflet from painting a pointer cursor across the whole filled area and
  // from capturing clicks — so only the real controls (the storm symbol, the +/- buttons) respond.
  return <Polygon positions={region.latLngs} pathOptions={po} interactive={false} />;
}
