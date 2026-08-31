import { RunsModel } from "./runs";
import { ISimulationOptions, SimulationModel } from "./simulation";
import { UIModel } from "./ui";

export interface IStores {
  ui: UIModel;
  simulation: SimulationModel;
  runs: RunsModel;
}

export function createStores(simOptions?: ISimulationOptions): IStores {
  const simulation = new SimulationModel(simOptions);
  const ui = new UIModel(simulation);
  const runs = new RunsModel(simulation, ui);
  return { ui, simulation, runs };
}
