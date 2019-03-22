import { inject, observer } from "mobx-react";
import * as React from "react";
import { BaseComponent, IBaseProps } from "./base";
import Button from "@material-ui/core/Button";
import { MapType } from "./right-panel";
import { mapLayer, GeoMap } from "../map-layer-tiles";
import * as geoMapButton from "../assets/geo-map.png";
import * as impactMapButton from "../assets/impact-map.png";
import * as css from "./map-button.scss";
import { Overlay } from "../models/ui";

interface IProps extends IBaseProps {
  label: string;
  value: GeoMap | Overlay;
  mapType: MapType;
}
interface IState {}

@inject("stores")
@observer
export class MapButton extends BaseComponent<IProps, IState> {
  public render() {
    const { label, mapType, value } = this.props;
    const ui = this.stores.ui;

    const active = mapType === "geo" && ui.mapTile.mapType === value ||
                   mapType !== "geo" && ui.overlay === value;
    const buttonClass = mapType === "geo" ? css.geoMaps : css.impactMaps;
    const labelText = label ? label : "Satellite";

    const buttonStyle = {
      backgroundImage: ""
    };
    if (mapType === "geo") {
      const geoMap = value as GeoMap;
      // for geo maps, get a map preview from the map tile provider to use as a button background
      if (mapLayer(geoMap) && mapLayer(geoMap).url) {
        // get a preview for an area approx the same as the hurricane model data
        const url = mapLayer(geoMap).url.replace("{z}", "2").replace("{x}", "1").replace("{y}", "1");
        buttonStyle.backgroundImage = `url(${url})`;
      } else {
        buttonStyle.backgroundImage = `url(${geoMapButton})`;
      }
    } else {
      buttonStyle.backgroundImage = `url(${impactMapButton})`;
    }

    return (
      <Button
        onClick={this.handleMapSelect}
        className={`${css.mapButton} ${buttonClass}`}
        data-test="map-button"
        disableRipple={true}
        style={buttonStyle}
      >
        <span className={`${css.mapLabel} ${buttonClass} ${active ? css.active : ""}`}>{labelText}</span>
      </Button>
    );
  }

  public handleMapSelect = () => {
    const { value } = this.props;
    if (this.props.mapType === "geo") {
      this.stores.ui.setMapTiles(value as GeoMap);
    } else {
      // If user clicks the same overlay button again, just turn it off.
      const newOverlay = this.stores.ui.overlay === value ? null : value;
      this.stores.ui.setOverlay(newOverlay as Overlay);
    }
  }
}
