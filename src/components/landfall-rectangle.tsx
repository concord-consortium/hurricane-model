import * as React from "react";
import { inject, observer } from "mobx-react";
import { BaseComponent, IBaseProps } from "./base";
import { Rectangle } from "react-leaflet";
import { ICoordinates } from "../types";
import {LatLngBoundsLiteral} from "leaflet";
import * as css from "./landfall-rectangle.scss";

interface IProps extends IBaseProps {
  position: ICoordinates;
  category: number;
}
interface IState {}

const width = 8; // lng deg
const height = 4; // lat deg

@inject("stores")
@observer
export class LandfallRectangle extends BaseComponent<IProps, IState> {
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

  public getBounds(): LatLngBoundsLiteral {
    const { position } = this.props;
    return [
      [position.lat - height * 0.5, position.lng - width * 0.5],
      [position.lat + height * 0.5, position.lng + width * 0.5]
    ];
  }

  public handleClick = () => {
    const { category } = this.props;
    this.stores.ui.setZoomedInView(this.getBounds(), category);
  }
}
