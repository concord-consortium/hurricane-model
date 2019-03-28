import * as React from "react";
import { BaseComponent, IBaseProps } from "./base";
import { MapTilesName } from "../map-layer-tiles";
import { Overlay } from "../models/ui";

import * as css from "./map-button-key.scss";

interface IProps extends IBaseProps {
  value: MapTilesName | Overlay;
}
interface IState {}

interface IMapButtonKeyEntry {
  color: string;
  text: string;
}

const keyData: { [name: string]: IMapButtonKeyEntry[] } = {
  population: [
    { color: "#f2f2f2", text: "No population" },
    { color: "#fecda8", text: "100 or less people" },
    { color: "#f9a65d", text: "100 to 1k people" },
    { color: "#f78926", text: "1k to 10k people" },
    { color: "#be681c", text: "10k to 25l people" },
    { color: "#95510b", text: "25k to 100k people" },
    { color: "#642e00", text: "100k or more people" }
  ]
};

export class MapButtonKey extends BaseComponent<IProps, IState> {
  public render() {
    const { value } = this.props;
    const data = value && keyData[value];
    if (!data) {
      return null;
    }
    return (
      <div className={css.keyContainer}>
        <div className={css.keyHeader}>Key</div>
        <div className={css.keyContent}>
          {
            data.map((entry: IMapButtonKeyEntry) =>
              <div className={css.entry}>
                <div className={css.colorBox} style={{backgroundColor: entry.color}}/>
                <span>{entry.text}</span>
              </div>
            )
          }
        </div>
      </div>
    );
  }
}
