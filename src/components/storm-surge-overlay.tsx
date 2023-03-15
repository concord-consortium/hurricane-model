import * as React from "react";
import { inject, observer } from "mobx-react";
import { BaseComponent, IBaseProps } from "./base";
import TilelayerMask from "./react-leaflet-tilelayer-mask";
import { ICoordinates } from "../types";
import * as TopRightMaskUrl from "../assets/storm-surge-mask-top-right.png";
import { extendedLandfallBounds } from "../models/simulation";

interface IProps extends IBaseProps {}
interface IState {}

const stormSurgeAreaSize = 800; // km

export const stormSurgeMapTiles = "https://tiles.arcgis.com/tiles/C8EMgrsFcRFL6LrL/arcgis/rest/services/Storm_Surge_HazardMaps_Category{hurricaneCat}_v3/MapServer/tile/{z}/{y}/{x}";

export const PuertoRicoBounds = extendedLandfallBounds.PuertoRico;

export const getTilesUrl = (category: number) => {
  return stormSurgeMapTiles.replace("{hurricaneCat}", category.toString());
};

export const getMaskUrl = (position: ICoordinates) => {
  if (PuertoRicoBounds.contains(position)) {
    // Use default, round mask for small islands
    return undefined;
  }
  // Otherwise, show storm surge area north-east of the hurricane track.
  return TopRightMaskUrl;
};

@inject("stores")
@observer
export class StormSurgeOverlay extends BaseComponent<IProps, IState> {

  public render() {
    const sim = this.stores.simulation;
    return sim.landfalls.map((lf, idx) => (
      <TilelayerMask
        key={idx}
        maskCenter={lf.position}
        maskSize={stormSurgeAreaSize} // km
        url={getTilesUrl(lf.category)}
        maskUrl={getMaskUrl(lf.position)}
      />
    ));
  }
}
