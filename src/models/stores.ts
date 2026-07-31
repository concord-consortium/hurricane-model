import { reaction } from "mobx";
import { UIModel } from "./ui";
import { SimulationModel } from "./simulation";
import { MultiTrackModel } from "./multi-track";
import { getInteractiveState } from "./interactive-state";

export interface IStores {
  ui: UIModel;
  simulation: SimulationModel;
  multiTrack: MultiTrackModel;
}

export function createStores(): IStores {
  const simulation = new SimulationModel();
  const ui = new UIModel(simulation);
  const multiTrack = new MultiTrackModel();
  const stores: IStores = { ui, simulation, multiTrack };

  // Auto-save: when a run finishes in multi-track, capture it into the selected card (no Save
  // button) and reset the sim so the captured track is drawn by the map layer and the storm returns
  // to its start. Suppressed while restoring/resetting a card (which also replays a finished state).
  reaction(
    () => simulation.simulationFinished,
    (finished) => {
      if (!finished || !multiTrack.enabled || multiTrack.autoCaptureSuppressed) return;
      const selected = multiTrack.selectedRun;
      if (!selected) return;
      multiTrack.captureRun(selected.id, getInteractiveState(stores));
      simulation.restart(false);
    }
  );

  return stores;
}
