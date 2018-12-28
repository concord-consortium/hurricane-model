import { LatLngExpression, Point, Map} from "leaflet";
import {action, observable} from "mobx";

export class MapModel {
  @observable public east = 180;
  @observable public north = 90;
  @observable public west = -190;
  @observable public south = -90;

  @observable public latLngToContainerPoint = (latLng: LatLngExpression) => new Point(0, 0);

  @action public updateMap(map: Map) {
    const bounds = map.getBounds();
    this.east = bounds.getEast();
    this.north = bounds.getNorth();
    this.west = bounds.getWest();
    this.south = bounds.getSouth();

    this.latLngToContainerPoint = map.latLngToContainerPoint.bind(map);
    (window as any).latLngToContainerPoint = this.latLngToContainerPoint;
  }
}
