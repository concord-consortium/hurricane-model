import * as React from "react";
import { inject, observer } from "mobx-react";
import { BaseComponent, IBaseProps } from "./base";
import { stores } from "../index";
import TilelayerMask from "./react-leaflet-tilelayer-mask";
import { ICoordinates } from "../types";
import * as TopRightMaskUrl from "../assets/storm-surge-mask-top-right.png";
import { extendedLandfallBounds } from "../models/simulation";

interface IProps extends IBaseProps {}
interface IState {}

const stormSurgeAreaSize = 800; // km

export const baseUrlUSA = "https://tiles.arcgis.com/tiles/C8EMgrsFcRFL6LrL/arcgis/rest/services/NHC_NationalMOM_" +
                          "Category{category}_CONUS/MapServer/tile/{z}/{y}/{x}";
export const baseUrlPuertoRico = "https://tiles.arcgis.com/tiles/C8EMgrsFcRFL6LrL/arcgis/rest/services/data5_PR_" +
                                 "USVI_SLOSH_MOMs_cat{category}/MapServer/tile/{z}/{y}/{x}";

export const PuertoRicoBounds = extendedLandfallBounds.PuertoRico;

export const getTilesUrl = (position: ICoordinates, category: number) => {
  let url = baseUrlUSA;
  if (PuertoRicoBounds.contains(position)) {
    url = baseUrlPuertoRico;
  }
  return url.replace("{category}", category.toString());
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
        url={getTilesUrl(lf.position, lf.category)}
        maskUrl={getMaskUrl(lf.position)}
      />
    ));
  }
}
