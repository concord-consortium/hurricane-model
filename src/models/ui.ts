import {action, observable} from "mobx";
import {LatLngExpression, Map, Point} from "leaflet";

export class UIModel {
  @observable public mapModified = false;
  @observable public latLngToContainerPoint: (arg: LatLngExpression) => Point = () => new Point(0, 0);

  @action.bound public mapUpdated(map: Map) {
    this.mapModified = true;
    this.latLngToContainerPoint = map.latLngToContainerPoint.bind(map);
  }

  @action.bound public mapReset() {
    this.mapModified = false;
  }
}
