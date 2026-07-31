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

  // Snapshot the pristine default setup so leaving Multi-track (with no saved single run) can fully
  // restore Single-track to defaults rather than inheriting Multi-track edits like Category.
  multiTrack.setDefaultState(getInteractiveState(stores));

  // Auto-save: when a run finishes in multi-track, capture it into the selected card (no Save
  // button) and reset the sim so the captured track is drawn by the map layer and the storm returns
  // to its start. Suppressed while restoring/resetting a card (which also replays a finished state).
  reaction(
    () => simulation.simulationFinished,
    (finished) => {
      if (!finished || multiTrack.autoCaptureSuppressed) return;
      if (multiTrack.enabled) {
        // Capture into the selected card; if selection was somehow lost, fall back to the editable
        // ("Not run yet") card so a finished run is never dropped.
        const selected = multiTrack.selectedRun ?? multiTrack.runs.find(r => r.state === null);
        if (!selected) return;
        if (multiTrack.selectedRunId !== selected.id) multiTrack.selectRun(selected.id);
        multiTrack.captureRun(selected.id, getInteractiveState(stores));
        simulation.restart(false);
      } else {
        // Single-run mode: capture the completed run and lock it (its track stays on screen).
        multiTrack.setSingleRun(getInteractiveState(stores));
        multiTrack.setSingleTrackEditing(false);
      }
    }
  );

  return stores;
}
