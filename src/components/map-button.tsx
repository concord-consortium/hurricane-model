import { inject, observer } from "mobx-react";
import * as React from "react";
import { BaseComponent, IBaseProps } from "./base";
import Button from "@material-ui/core/Button";
import { MapType } from "./right-panel";
import { mapLayer, MapTilesName } from "../map-layer-tiles";
import { Overlay } from "../models/ui";
import { MapButtonKey } from "./map-button-key";
import ViewIcon from "../assets/view-icon.svg";

import * as baseMapTabImg from "../assets/base-map-tab.png";
import * as overlaysTabImg from "../assets/overlays-tab.png";
import * as css from "./map-button.scss";

interface IProps extends IBaseProps {
  label: string;
  value: MapTilesName | Overlay;
  mapType: MapType;
  disabled?: boolean;
}
interface IState {}

@inject("stores")
@observer
export class MapButton extends BaseComponent<IProps, IState> {
  public render() {
    const { label, mapType, value, disabled } = this.props;
    const ui = this.stores.ui;

    const active = mapType === "base" && ui.mapTile.mapType === value ||
                   mapType !== "base" && ui.overlay === value;
    const buttonClass = mapType === "base" ? css.geoMaps : css.impactMaps;
    const labelText = label ? label : "Satellite";

    let backgroundImage = "";
    if (mapType === "base") {
      const geoMap = value as MapTilesName;
      // for geo maps, get a map preview from the map tile provider to use as a button background
      if (mapLayer(geoMap) && mapLayer(geoMap).url) {
        // get a preview for an area approx the same as the hurricane model data
        const url = mapLayer(geoMap).url.replace("{z}", "2").replace("{x}", "1").replace("{y}", "1");
        backgroundImage = `url(${url})`;
      } else {
        backgroundImage = `url(${baseMapTabImg})`;
      }
    } else {
      backgroundImage = `url(${overlaysTabImg})`;
    }

    return (
      <Button
        onClick={this.handleMapSelect}
        className={`${css.mapButton} ${buttonClass}`}
        data-test="map-button"
        disableRipple={true}
        disabled={disabled}
      >
        <div className={`${css.content} ${buttonClass} ${active ? css.active : ""}`}>
          <div className={css.mapImage} style={{ backgroundImage }}/>
          <div className={css.label}>{labelText}</div>
          {
            active && <ViewIcon />
          }
          {
            active && <div className={css.key}><MapButtonKey value={value}/></div>
          }
        </div>
      </Button>
    );
  }

  public handleMapSelect = () => {
    const { value } = this.props;
    if (this.props.mapType === "base") {
      this.stores.ui.setMapTiles(value as MapTilesName);
    } else {
      // If user clicks the same overlay button again, just turn it off.
      const newOverlay = this.stores.ui.overlay === value ? null : value;
      this.stores.ui.setOverlay(newOverlay as Overlay);
    }
  }
}
