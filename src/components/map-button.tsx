import { inject, observer } from "mobx-react";
import * as React from "react";
import { BaseComponent, IBaseProps } from "./base";
import Button from "@material-ui/core/Button";
import { mapTypes } from "./right-panel";
import { mapLayer } from "../map-layer-tiles";
import * as geoMapButton from "../assets/geo-map.png";
import * as impactMapButton from "../assets/impact-map.png";

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
    const buttonType = label.toLowerCase();

    const active = mapType === mapTypes.geo && ui.mapTile.mapType === buttonType;
    const buttonClass = mapType === mapTypes.geo ? css.geoMaps : css.impactMaps;
    const labelText = label ? label : "Satellite";

    const buttonStyle = {
      backgroundImage: ""
    };
    if (mapType === mapTypes.geo) {
      // for geo maps, get a map preview from the map tile provider to use as a button background
      if (mapLayer(buttonType) && mapLayer(buttonType).url) {
        // get a preview for an area approx the same as the hurricane model data
        const url = mapLayer(buttonType).url.replace("{z}", "2").replace("{x}", "1").replace("{y}", "1");
        buttonStyle.backgroundImage = `url(${url})`;
      } else {
        buttonStyle.backgroundImage = `url(${geoMapButton})`;
      }
    } else {
      buttonStyle.backgroundImage = `url(${impactMapButton})`;
    }

    return (
      <Button
        key="map-button"
        onClick={this.handleMapSelect}
        className={`${css.mapButton} ${buttonClass}`}
        data-test="map-button"
        disableRipple={true}
        style={buttonStyle}
      >
        <span className={`${css.mapLabel} ${buttonClass} ${active ? css.active : ""}`}>{labelText}
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
