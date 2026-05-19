import * as React from "react";
import { Polygon } from "react-leaflet";
import { PathOptions } from "leaflet";
import { Region } from "../utils/region";

interface IProps {
  region: Region;
  pathOptions: PathOptions;
}

export const PolygonRegion = ({ region, pathOptions }: IProps) => (
  <Polygon positions={region.latLngs} pathOptions={pathOptions} />
);
