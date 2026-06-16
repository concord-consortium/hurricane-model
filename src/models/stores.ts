import { UIModel } from "./ui";
import { SimulationModel } from "./simulation";
import { SSTOverlayModel } from "./sst-overlay";

export interface IStores {
  ui: UIModel;
  simulation: SimulationModel;
  sstOverlay: SSTOverlayModel;
}

export function createStores(): IStores {
  const ui = new UIModel();
  const simulation = new SimulationModel();
  const sstOverlay = new SSTOverlayModel(simulation, ui);
  return { ui, simulation, sstOverlay };
}
