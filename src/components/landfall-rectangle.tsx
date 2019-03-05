import * as React from "react";
import { inject, observer } from "mobx-react";
import { BaseComponent, IBaseProps } from "./base";
import { Rectangle, withLeaflet, LeafletContext } from "react-leaflet";
import { ICoordinates } from "../types";
import { LatLngBoundsExpression } from "leaflet";
import * as css from "./landfall-rectangle.scss";

interface IProps extends IBaseProps {
  position: ICoordinates;
  category: number;
  leaflet: LeafletContext;
}
interface IState {}

const width = 12; // lng deg
const height = 7; // lat deg

@inject("stores")
@observer
class LandfallRectangleBase extends BaseComponent<IProps, IState> {
  public render() {
    const { category } = this.props;
    const categoryCssClass = css["category" + category];
    return (
      <Rectangle
        className={`${css.landfallRectangle} ${categoryCssClass}`}
        bounds={this.getBounds()}
        onClick={this.handleClick}
      />
    );
  }

  public getBounds(): LatLngBoundsExpression {
    const { position } = this.props;
    return [
      [position.lat - height * 0.5, position.lng - width * 0.5],
      [position.lat + height * 0.5, position.lng + width * 0.5]
    ];
  }

  public handleClick = () => {
    const { map } = this.props.leaflet;
    if (map) {
      map.flyToBounds(this.getBounds());
    }
  }
}

export const LandfallRectangle = withLeaflet(LandfallRectangleBase);
