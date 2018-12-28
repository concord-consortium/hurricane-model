import { UIModel, UIModelType } from "./ui";
import { MapModel } from "./map";

export interface IStores {
  ui: UIModelType;
  map: MapModel;
}

export function createStores(): IStores {
  return {
    ui: UIModel.create({}),
    map: new MapModel()
  };
}
