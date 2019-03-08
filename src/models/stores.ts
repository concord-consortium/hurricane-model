import { UIModel } from "./ui";
import { SimulationModel } from "./simulation";

export interface IStores {
  ui: UIModel;
  simulation: SimulationModel;
}

export function createStores(): IStores {
  const stores = {
    ui: new UIModel(),
    simulation: new SimulationModel()
  };
  (window as any).stores = stores;
  return stores;
}
