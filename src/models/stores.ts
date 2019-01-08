import { UIModel, UIModelType } from "./ui";
import { SimulationModel } from "./simulation";

export interface IStores {
  ui: UIModelType;
  simulation: SimulationModel;
}

export function createStores(): IStores {
  return {
    ui: UIModel.create({}),
    simulation: new SimulationModel()
  };
}
