import { RunsModel } from "./runs";
import { SimulationModel } from "./simulation";
import { UIModel } from "./ui";

export interface IStores {
  ui: UIModel;
  simulation: SimulationModel;
  runs: RunsModel;
}

export function createStores(): IStores {
  const simulation = new SimulationModel();
  const ui = new UIModel(simulation);
  const runs = new RunsModel(simulation);
  return { ui, simulation, runs };
}
