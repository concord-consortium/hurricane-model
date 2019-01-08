import { UIModel, UIModelType } from "./ui";
import { SimulationModel } from "./simulation";

export interface IStores {
  ui: UIModelType;
  simulation: SimulationModel;
}

export function createStores(): IStores {
  const stores = {
    ui: UIModel.create({}),
    simulation: new SimulationModel()
  };
  (window as any).simulation = stores.simulation;
  return stores;
}
