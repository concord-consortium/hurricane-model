import * as React from "react";
import { inject, observer } from "mobx-react";
import { BaseComponent, IBaseProps } from "./base";
import { Polyline } from "react-leaflet";
import { ITrackPoint } from "../types";
import * as css from "./hurricane-track.scss";

interface IProps extends IBaseProps {}
interface IState {}

@inject("stores")
@observer
export class HurricaneTrack extends BaseComponent<IProps, IState> {
  public render() {
    const { hurricaneTrack, hurricane } = this.stores.simulation;
    return hurricaneTrack.map((point: ITrackPoint, idx: number) => {
      const nextPos = idx + 1 < hurricaneTrack.length ? hurricaneTrack[idx + 1].position : hurricane.center;
      const segmentClass = css.segment + ' ' + css["segmentCategory" + point.category];
      return <Polyline key={idx} className={segmentClass} positions={[point.position, nextPos]} weight={5} />;
    });
  }
}
