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
import * as overlayTabImg from "../assets/overlay-tab.png";
import * as sstThumbImg from "../assets/sst-thumb.png";
import * as precipitationThumbImg from "../assets/precipitation-thumb.png";
import * as stormSurgeThumbImg from "../assets/storm-surge-thumb.png";

import * as css from "./map-button.scss";

interface IProps extends IBaseProps {
  label: string;
  value: MapTilesName | Overlay;
  mapType: MapType;
  disabled?: boolean;
}
interface IState {}

const overlayImage: { [key: string]: string } = {
  sst: sstThumbImg,
  population: overlayTabImg,
  precipitation: precipitationThumbImg,
  stormSurge: stormSurgeThumbImg
};

@inject("stores")
@observer
export class MapButton extends BaseComponent<IProps, IState> {
  public render() {
    const { label, mapType, value, disabled } = this.props;
    const ui = this.stores.ui;

    const active = mapType === "base" && ui.baseMap === value ||
                   mapType !== "base" && ui.overlay === value;
    const buttonClass = mapType === "base" ? css.geoMaps : css.impactMaps;
    const labelText = label ? label : "Satellite";

    let backgroundImage = "";
    if (mapType === "base") {
      const baseMap = value as MapTilesName;
      // for geo maps, get a map preview from the map tile provider to use as a button background
      if (mapLayer(baseMap) && mapLayer(baseMap).url) {
        // get a preview for an area approx the same as the hurricane model data
        const url = mapLayer(baseMap).url.replace("{z}", "2").replace("{x}", "1").replace("{y}", "1");
        backgroundImage = `url(${url})`;
      } else {
        backgroundImage = `url(${baseMapTabImg})`;
      }
    } else {
      backgroundImage = `url(${overlayImage[value] || overlayTabImg})`;
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
