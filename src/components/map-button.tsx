import { inject, observer } from "mobx-react";
import * as React from "react";
import { BaseComponent, IBaseProps } from "./base";
import Button from "@material-ui/core/Button";
import { mapTypes } from "./right-panel";

import * as css from "./map-button.scss";

interface IProps extends IBaseProps {
  label: string;
  mapType: string;
}
interface IState {}

@inject("stores")
@observer
export class MapButton extends BaseComponent<IProps, IState> {
  public render() {
    const { label, mapType } = this.props;
    const ui = this.stores.ui;
    const active = mapType === mapTypes.geo && ui.mapTile.mapType === label.toLowerCase();
    let buttonStyle = css.geoMaps;
    switch (mapType) {
      case mapTypes.geo:
        buttonStyle = css.geoMaps;
        break;
      case mapTypes.impact:
        buttonStyle = css.impactMaps;
        break;
      default:
        buttonStyle = css.geoMaps;
        break;
    }
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

  public handleMapSelect = () => {
    if (this.props.mapType === "geo") {
      this.stores.ui.setMapTiles(this.props.label.toLowerCase());
    } else {
      // do nothing for now
    }
  }
}
