// @ts-ignore
import WebGLHeatmap from "../webgl-heatmap/webgl-heatmap";
import CanvasLayer from "./react-leaflet-canvas-layer";
import { ICoordinates } from "../types";
import { inject, observer } from "mobx-react";
import { autorun } from "mobx";
import * as PrecipitationScaleSrc from "../assets/precipitation-scale.png";
import { BaseComponent, IBaseProps } from "./base";
import * as React from "react";
import * as L from "leaflet";

interface IProps extends IBaseProps {}
interface IState {}

const alphaRange = 0.025;

@inject("stores")
@observer
export class PrecipitationLayer extends BaseComponent<IProps, IState> {
  public webglHeatmap: any = null;
  private disposeObserver: () => void;

  public componentDidMount(): void {
    this.disposeObserver = autorun(() => {
      this.updateData();
    });
  }

  public componentWillUnmount(): void {
    this.disposeObserver();
  }

  public render() {
    return (
      <CanvasLayer drawMethod={this.drawCanvas}/>
    );
  }

  private drawCanvas = (info: any) => {
    if (!this.webglHeatmap) {
      // @ts-ignore
      this.webglHeatmap = new WebGLHeatmap({
        canvas: info.canvas,
        gradientTexture: PrecipitationScaleSrc,
        alphaRange: [0, alphaRange]
      });
      info.canvas.style.opacity = 0.7;
    }
    this.webglHeatmap.adjustSize();
    this.updateData();
  }

  private updateData() {
    const data = this.stores.simulation.precipitationPointsWithinBounds;
    const latLngToContainerPoint = this.stores.ui.latLngToContainerPoint;

    const scaleFn = (latlng: ICoordinates, size: number) => {
      // Necessary to maintain accurately sized circles to change scale to miles (for example), you will need
      // to convert 40075017 (equatorial circumference of the Earth in metres) to miles.
      const lngRadius = (size / 40075017) * 360 / Math.cos((Math.PI / 180) * latlng.lat);
      const latlng2 = new L.LatLng(latlng.lat, latlng.lng - lngRadius);
      const point = latLngToContainerPoint(latlng);
      const point2 = latLngToContainerPoint(latlng2);

      return Math.max(Math.round(point.x - point2.x), 1);
    };

    const heatmap = this.webglHeatmap;
    heatmap.clear();
    if (data.length > 0) {
      for (const dataVal of data) {
        const latLng = { lat: dataVal[0], lng: dataVal[1] };
        const point = latLngToContainerPoint(latLng);
        heatmap.addPoint(
          Math.floor(point.x),
          Math.floor(point.y),
          scaleFn(latLng, dataVal[3]),
          dataVal[2]
        );
      }
      heatmap.update();
    }
    heatmap.display();
  }
}
