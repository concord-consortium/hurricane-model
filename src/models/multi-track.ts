import { action, computed, observable, makeObservable } from "mobx";
import { IHurricaneInteractiveState } from "../types/interactive-state";

// Maximum number of tracks a user can keep in their "pack".
export const MAX_SAVED_TRACKS = 6;

export interface ISavedRun {
  id: string;
  // Full run snapshot captured via getInteractiveState() — setup conditions + computed track.
  // Restoring is just setInteractiveState(stores, state).
  state: IHurricaneInteractiveState;
}

/**
 * Holds the state for Multi-track mode: whether it's active and the pack of saved runs.
 *
 * Multi-track is NOT a separate app mode — it layers on top of regular single-run storm mode,
 * sharing the same setup panel and simulation engine. This model only tracks the on/off flag
 * and the collection of saved runs; capturing/restoring a run reuses the existing
 * getInteractiveState()/setInteractiveState() serialization.
 */
export class MultiTrackModel {
  // Whether multi-track mode is active (vs. regular single-run mode).
  @observable public enabled = false;
  // Saved runs in creation order. A run's display number is its index + 1, so deleting one
  // automatically renumbers the rest.
  @observable public savedRuns: ISavedRun[] = [];
  // The currently selected/highlighted saved run, if any.
  @observable public selectedRunId: string | undefined = undefined;

  // Monotonic id source so run identities stay stable as the list is reordered/renumbered.
  private nextId = 1;

  constructor() {
    makeObservable(this);
  }

  @computed public get isFull(): boolean {
    return this.savedRuns.length >= MAX_SAVED_TRACKS;
  }

  // 1-based display number for a run (0 if not found).
  public runNumber(id: string): number {
    return this.savedRuns.findIndex(run => run.id === id) + 1;
  }

  @action.bound public setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) {
      this.selectedRunId = undefined;
    }
  }

  // Saves a run snapshot to the pack and selects it. Returns the new run, or undefined if full.
  @action.bound public saveRun(state: IHurricaneInteractiveState): ISavedRun | undefined {
    if (this.isFull) {
      return undefined;
    }
    const run: ISavedRun = { id: `run-${this.nextId++}`, state };
    this.savedRuns.push(run);
    this.selectedRunId = run.id;
    return run;
  }

  @action.bound public deleteRun(id: string) {
    this.savedRuns = this.savedRuns.filter(run => run.id !== id);
    if (this.selectedRunId === id) {
      this.selectedRunId = undefined;
    }
  }

  @action.bound public selectRun(id: string | undefined) {
    this.selectedRunId = id;
  }

  @action.bound public clear() {
    this.savedRuns = [];
    this.selectedRunId = undefined;
  }
}
