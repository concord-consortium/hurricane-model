import * as React from "react";
import { BaseComponent, IBaseProps } from "./base";
import { MapTilesName } from "../map-layer-tiles";
import { Overlay } from "../models/ui";
import * as leveedAreaKey from "../assets/leveed-area-key.png";
import { SSTKey } from "./sst-key";

import * as css from "./map-button-key.scss";

interface IProps extends IBaseProps {
  value: MapTilesName | Overlay;
}
interface IState {}
interface IMapButtonKeyDef {
  header: string;
  values: IMapButtonKeyEntry[];
}
interface IMapButtonKeyEntry {
  background: string;
  text: string;
}

const keyData: { [name: string]: IMapButtonKeyDef } = {
  // Source:https://www.arcgis.com/home/item.html?id=302d4e6025ef41fa8d3525b7fc31963a
  population: {
    header: "",
    values: [
      {background: "#f2f2f2", text: "No population"},
      {background: "#fecda8", text: "100 or fewer people"},
      {background: "#f9a65d", text: "100 to 1k people"},
      {background: "#f78926", text: "1k to 10k people"},
      {background: "#be681c", text: "10k to 25k people"},
      {background: "#95510b", text: "25k to 100k people"},
      {background: "#642e00", text: "100k or more people"}
    ]
  },
  // Source: https://noaa.maps.arcgis.com/apps/MapSeries/index.html?appid=d9ed7904dbec441a9c4dd7b277935fad
  stormSurge: {
    header: "Height above ground",
    values: [
      {background: "#0071fe", text: "Less than 3 feet"},
      {background: "#fcfe0d", text: "Greater than 3 feet"},
      {background: "#fea90c", text: "Greater than 6 feet"},
      {background: "#fe0a03", text: "Greater than 9 feet"},
      {background: `center / contain no-repeat url(${leveedAreaKey})`, text: "Leveed area"}
    ]
  },
  // Precipitation data is generated by the model, so the scale is made up. Colors have been picked manually
  // to represent the most common patterns and cover realistic total precipitation range.
  precipitation: {
    header: "Total precipitation",
    values: [
      {background: "#75bdb8", text: "1\""},
      {background: "#3d9136", text: "3\""},
      {background: "#cab314", text: "5\""},
      {background: "#c4500f", text: "8\""},
      {background: "#ba0a0b", text: "10\""},
      {background: "#60102c", text: "12\""},
      {background: "#791ab6", text: "14\""},
      {background: "#c20eb3", text: "16\""},
      {background: "#c16166", text: "18\""},
      {background: "#f0b2b4", text: "20\""},
    ]
  }
};

const keyElement: { [name: string]: JSX.Element } = {
  sst: <SSTKey />
};

export class MapButtonKey extends BaseComponent<IProps, IState> {
  public render() {
    const { value } = this.props;
    const keyDef = value && keyData[value];
    const KeyElement = value && keyElement[value];
    if (!keyDef && !KeyElement) {
      return null;
    }
    return (
      <div className={css.keyContainer}>
        <div className={css.keyHeader}>Key</div>
        { KeyElement && KeyElement }
        { keyDef &&
          <div>
            { keyDef.header && <div className={css.keySubheader}>{ keyDef.header }</div> }
            <div className={css.keyContent}>
              {
                keyDef.values.map((entry: IMapButtonKeyEntry) =>
                  <div key={entry.text} className={css.entry}>
                    <div className={css.colorBox} style={{background: entry.background}}/>
                    <span>{entry.text}</span>
                  </div>
                )
              }
            </div>
          </div>
        }
      </div>
    );
  }
}
