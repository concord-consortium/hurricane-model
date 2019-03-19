import { inject, observer } from "mobx-react";
import * as React from "react";
import { BaseComponent, IBaseProps } from "./base";
import Button from "@material-ui/core/Button";

import * as css from "./map-button.scss";

interface IProps extends IBaseProps {
  label: string;
  mapType: string;
  active?: boolean;
}
interface IState {}

@inject("stores")
@observer
export class MapButton extends BaseComponent<IProps, IState> {
  public render() {
    const { label, mapType, active } = this.props;
    const ui = this.stores.ui;
    let buttonStyle = css.geoMaps;
    switch (mapType) {
      case "geo":
        buttonStyle = css.geoMaps;
        break;
      case "impact":
        buttonStyle = css.impactMaps;
        break;
      default:
        buttonStyle = css.geoMaps;
        break;
    }
    const sim = this.stores.simulation;
    const labelText = label ? label : "Satellite";
    return (
      <Button
        key="map-button"
        onClick={this.handleMapSelect}
        className={`${css.mapButton} ${buttonStyle}`}
        data-test="map-button"
        disableRipple={true}
      >
        <span className={`${css.mapLabel} ${buttonStyle} ${active ? css.active : ""}`}>{labelText}
        </span>
      </Button>
    );
  }

  private handleMapSelect = () => {
    this.stores.ui.setMapTiles(this.props.label);
  }
}
