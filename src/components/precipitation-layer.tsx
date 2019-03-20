import {MapLayer, MapLayerProps, withLeaflet} from "react-leaflet";
import LeafletWebGLHeatmap from "../leaflet-webgl-heatmap/leaflet-webgl-heatmap";
import { IPrecipitationPoint } from "../types";
import { inject } from "mobx-react";
import { observe } from "mobx";
import { IStores } from "../models/stores";
import * as PrecipitationScaleSrc from "../assets/precipitation-scale.png";

interface IProps extends MapLayerProps {
  stores?: IStores;
  data?: IPrecipitationPoint[];
}

@inject("stores")
class PrecipitationLayerBase extends MapLayer<IProps> {
  public heatmap: any;

  get stores() {
    return (this.props as IProps).stores as IStores;
  }

  public createLeafletElement(props: IProps) {
    // @ts-ignore
    this.heatmap = new LeafletWebGLHeatmap({
      opacity: 0.7,
      alphaRange: 0.025,
      gradientTexture: PrecipitationScaleSrc
    });

    // This components supports both regular props or being attached directly to MobX store.
    // TODO: check performance and pick faster option.
    if (!props.data) {
      // Use MobX observer.
      this.heatmap.setData(this.stores.simulation.precipitationPoints);
      observe(this.stores.simulation, "precipitationPoints", () => {
        this.updateData(this.stores.simulation.precipitationPoints);
      });
    } else {
      // Stick to regular props.
      this.heatmap.setData(props.data);
    }

    return this.heatmap;
  }

  public updateLeafletElement(fromProps: IProps, toProps: IProps) {
    if (toProps.data) {
      this.updateData(toProps.data);
    }
  }

  public updateData(precipitationPoints: IPrecipitationPoint[]) {
    this.heatmap.setData(precipitationPoints);
  }
}

export const PrecipitationLayer = withLeaflet(PrecipitationLayerBase);
