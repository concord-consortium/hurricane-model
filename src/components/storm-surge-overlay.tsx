import * as React from "react";
import { inject, observer } from "mobx-react";
import { BaseComponent, IBaseProps } from "./base";
import { stores } from "../index";
import TilelayerMask from "./react-leaflet-tilelayer-mask";
import { ICoordinates } from "../types";
import { latLngBounds } from "leaflet";
import * as TopRightMaskUrl from "../assets/storm-surge-mask-top-right.png";

interface IProps extends IBaseProps {}
interface IState {}

const stormSurgeAreaSize = 800; // km

const BaseUrlUSA = "https://tiles.arcgis.com/tiles/C8EMgrsFcRFL6LrL/arcgis/rest/services/NHC_NationalMOM_" +
                   "Category{category}_CONUS/MapServer/tile/{z}/{y}/{x}";
const BaseUrlPuertoRico = "https://tiles.arcgis.com/tiles/C8EMgrsFcRFL6LrL/arcgis/rest/services/data5_PR_USVI_SLOSH_" +
                          "MOMs_cat{category}/MapServer/tile/{z}/{y}/{x}";

const Bounds = {
  PuertoRico: latLngBounds([
    {lat: 18.77828658944489, lng: -67.45515346527101},
    {lat: 17.54128117656407, lng: -63.972487449646}
  ])
};

const getTilesUrl = (position: ICoordinates, category: number) => {
  let url = BaseUrlUSA;
  if (Bounds.PuertoRico.contains(position)) {
    url = BaseUrlPuertoRico;
  }
  return url.replace("{category}", category.toString());
};

const getMaskUrl = (position: ICoordinates) => {
  if (Bounds.PuertoRico.contains(position)) {
    return undefined; // use default, round mask for small islands
  }
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
