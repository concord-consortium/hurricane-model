import * as React from "react";
import { inject, observer } from "mobx-react";
import { BaseComponent, IBaseProps } from "./base";
import { Pane, Polyline } from "react-leaflet";
import { ITrackPoint } from "../types";
import css from "./hurricane-track.scss";

interface IProps extends IBaseProps {}
interface IState {}

@inject("stores")
@observer
export class HurricaneTrack extends BaseComponent<IProps, IState> {
  public render() {
    const { hurricaneTrack, hurricane } = this.stores.simulation;

    return (
      // The border pane sits above the unselected runs' track pane (z 410) and below
      // "shadowPane" (z 500), so the selected track keeps its outline where other tracks cross it.
      <Pane name="selectedTrack" style={{ zIndex: 430 }}>
        {
          hurricaneTrack.map((point: ITrackPoint, idx: number) => {
            const nextPos = idx + 1 < hurricaneTrack.length ? hurricaneTrack[idx + 1].position : hurricane.center;
            return (
              <Polyline key={`${idx}-border`} className={css.hurricaneTrackBorder}
                positions={[point.position, nextPos]} weight={7} />
            );
          })
        }
        {
          hurricaneTrack.map((point: ITrackPoint, idx: number) => {
            const nextPos = idx + 1 < hurricaneTrack.length ? hurricaneTrack[idx + 1].position : hurricane.center;
            const segmentClass = css.segment + " " + css["segmentCategory" + point.category];
            return (
              <Polyline key={`${idx}`} className={segmentClass} pane="shadowPane"
                positions={[point.position, nextPos]} weight={5} />
            );
          })
        }
      </Pane>
    );
  }
}
