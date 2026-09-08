import * as React from "react";
import { inject, observer } from "mobx-react";
import { BaseComponent, IBaseProps } from "./base";
import { LeafletCustomMarker } from "./leaflet-custom-marker";
import { LatLngExpression } from "leaflet";
import css from "./thermometer-marker.scss";

interface IProps extends IBaseProps {
  position: LatLngExpression | null;
  saved: boolean;
}
interface IState {}

@inject("stores")
@observer
export class ThermometerMarker extends BaseComponent<IProps, IState> {
  public render() {
    const { position, saved } = this.props;
    if (!position) {
      return null;
    }
    const temp = this.stores.simulation.seaSurfaceTempAt(position);
    if (!temp) {
      return null;
    }
    return (
      // Display-only: non-interactive so clicks pass through to the storm / pressure systems / anomaly
      // controls beneath it, and stacked above everything (incl. the storm's zIndexOffset) so the
      // readout is never hidden.
      <LeafletCustomMarker
        position={position}
        draggable={false}
        iconClassName={css.nonInteractive}
        zIndexOffset={2000000}
      >
        <div className={`${css.thermometerContainer} ${saved ? css.saved : ""}`}>
          <div className={css.thermometerReadout}>
            { temp.toFixed(1) } °C
          </div>
          { saved && <div className={css.arrowUp} /> }
        </div>
      </LeafletCustomMarker>
    );
  }
}
