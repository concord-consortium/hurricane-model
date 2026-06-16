import { UIModel } from "./ui";
import { SimulationModel } from "./simulation";

export interface IStores {
  ui: UIModel;
  simulation: SimulationModel;
}

export function createStores(): IStores {
  const simulation = new SimulationModel();
  const ui = new UIModel(simulation);
  return { ui, simulation };
}
