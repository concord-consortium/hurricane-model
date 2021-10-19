import * as React from "react";
import { LeafletCustomMarker } from "./leaflet-custom-marker";
import CategoryMarkerSVG from "../assets/category-marker.svg";
import { ITrackPoint } from "../types";
import { CategoryNumber } from "./category-number";
import * as categoryCss from "./hurricane-marker.scss";
import * as css from "./hurricane-category-marker.scss";

interface IProps  {
  point: ITrackPoint;
}
interface IState {}

export class HurricaneCategoryMarker extends React.Component<IProps, IState> {
  public render() {
    const categoryChangePoint = this.props.point;
    const categoryCssClass = categoryCss["category" + categoryChangePoint.category];
    return (
      <LeafletCustomMarker position={categoryChangePoint.position} draggable={false}>
        <div className={`${css.categoryMarker}`}>
          <div className={`${css.svgContainer} ${categoryCssClass}`}>
            <CategoryMarkerSVG />
          </div>
          <CategoryNumber value={categoryChangePoint.category} />
        </div>
      </LeafletCustomMarker>
    );
  }
}
