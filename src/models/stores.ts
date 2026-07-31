import { UIModel } from "./ui";
import { SimulationModel } from "./simulation";
import { MultiTrackModel } from "./multi-track";

export interface IStores {
  ui: UIModel;
  simulation: SimulationModel;
  multiTrack: MultiTrackModel;
}

export function createStores(): IStores {
  const simulation = new SimulationModel();
  const ui = new UIModel(simulation);
  const multiTrack = new MultiTrackModel();
  return { ui, simulation, multiTrack };
}
