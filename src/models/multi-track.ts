import { action, computed, observable, makeObservable } from "mobx";
import { IHurricaneInteractiveState } from "../types/interactive-state";

// Maximum number of run cards in the pack.
export const MAX_SAVED_TRACKS = 6;

export interface IRunSlot {
  id: string;
  // The captured run snapshot once this slot has been run; null while it's still editable
  // ("Not run yet"). Capturing happens automatically when a run finishes — there is no Save button.
  state: IHurricaneInteractiveState | null;
}

/**
 * Multi-track state: a pack of run cards. Each card is an editable slot that auto-fills when you run
 * it (state goes from null -> a captured snapshot). Resetting a card clears it back to editable.
 * Multi-track is the only mode.
 */
export class MultiTrackModel {
  @observable public runs: IRunSlot[] = [];
  @observable public selectedRunId: string | undefined = undefined;
  // The run currently unlocked for editing (via the card's Edit button). A selected completed run
  // is otherwise locked (its setup is view-only) until Edit is pressed.
  @observable public editingRunId: string | undefined = undefined;

  // A frozen snapshot of the editable ("Not run yet") card's setup, so that card keeps its own values
  // while the learner is off viewing/editing another card (they all share one live simulation). It is
  // captured the moment you navigate away from the editable card and restored when you return.
  @observable.ref public editableDraft: IHurricaneInteractiveState | null = null;

  // Transient guard so restoring/resetting a card (which replays a finished state) isn't mistaken
  // for a natural run completion by the auto-capture reaction. Not observable.
  public autoCaptureSuppressed = false;

  // Pristine default setup captured once at startup — used for the default-category reset (Reload),
  // since simulation.reset() alone doesn't restore hurricane.startingCategory. Not observable.
  public defaultState: IHurricaneInteractiveState | null = null;

  private nextId = 1;

  constructor() {
    makeObservable(this);
  }

  @computed public get isFull(): boolean {
    return this.runs.length >= MAX_SAVED_TRACKS;
  }

  // True while a card is still editable (not run yet).
  @computed public get hasEditableCard(): boolean {
    return this.runs.some(r => r.state === null);
  }

  // A new card can be added only when there's no editable card waiting and there's room.
  @computed public get canAddRun(): boolean {
    return !this.hasEditableCard && !this.isFull;
  }

  @computed public get selectedRun(): IRunSlot | undefined {
    return this.runs.find(r => r.id === this.selectedRunId);
  }

  // Setup is locked (view-only, storm hidden) when a completed run is selected and not being edited.
  @computed public get setupLocked(): boolean {
    const sel = this.selectedRun;
    return !!sel && sel.state !== null && this.editingRunId !== sel.id;
  }

  public runNumber(id: string): number {
    return this.runs.findIndex(r => r.id === id) + 1;
  }

  // Adds a fresh editable card and selects it.
  @action.bound public addRun(): IRunSlot {
    const run: IRunSlot = { id: `run-${this.nextId++}`, state: null };
    this.runs.push(run);
    this.selectedRunId = run.id;
    this.editingRunId = undefined;
    this.editableDraft = null; // a fresh editable card starts from the live sim
    return run;
  }

  // Records a finished run into a slot (auto-save on completion); a fresh run is locked.
  @action.bound public captureRun(id: string, state: IHurricaneInteractiveState) {
    const run = this.runs.find(r => r.id === id);
    if (run) {
      run.state = state;
    }
    this.editingRunId = undefined;
  }

  // Clears a run back to editable ("Not run yet") and selects it.
  @action.bound public resetRun(id: string) {
    const run = this.runs.find(r => r.id === id);
    if (run) {
      run.state = null;
      this.selectedRunId = id;
    }
    this.editingRunId = undefined;
  }

  // Unlocks a completed run for editing (its setup becomes changeable again).
  @action.bound public editRun(id: string) {
    this.selectedRunId = id;
    this.editingRunId = id;
  }

  @action.bound public setEditableDraft(state: IHurricaneInteractiveState | null) {
    this.editableDraft = state;
  }

  @action.bound public deleteRun(id: string) {
    const idx = this.runs.findIndex(r => r.id === id);
    if (idx < 0) return;
    this.runs.splice(idx, 1);
    if (this.selectedRunId === id) {
      const next = this.runs[idx - 1] || this.runs[this.runs.length - 1];
      this.selectedRunId = next ? next.id : undefined;
    }
  }

  @action.bound public selectRun(id: string | undefined) {
    this.selectedRunId = id;
    // Selecting a completed run shows it locked; Edit unlocks it.
    this.editingRunId = undefined;
  }

  public setDefaultState(state: IHurricaneInteractiveState) {
    this.defaultState = state;
  }

  @action.bound public clear() {
    this.runs = [];
    this.selectedRunId = undefined;
  }

  // Full wipe back to the initial state — used by Reload (start fresh). Stays in multi-track.
  @action.bound public resetAll() {
    this.runs = [];
    this.selectedRunId = undefined;
    this.editingRunId = undefined;
    this.nextId = 1;
  }
}
