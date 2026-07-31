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
 * Multi-track state: the on/off flag plus a pack of run cards. Each card is an editable slot that
 * auto-fills when you run it (state goes from null -> a captured snapshot). Resetting a card clears
 * it back to editable. Layers on top of single-run storm mode; the map/panel reuse the same engine.
 */
export class MultiTrackModel {
  @observable public enabled = false;
  @observable public runs: IRunSlot[] = [];
  @observable public selectedRunId: string | undefined = undefined;
  // The run currently unlocked for editing (via the card's Edit button). A selected completed run
  // is otherwise locked (its setup is view-only) until Edit is pressed.
  @observable public editingRunId: string | undefined = undefined;
  // The current Single-Track run (captured on completion; persists across mode toggles). null while
  // no run exists (defaults / configuring the first run).
  @observable public singleRun: IHurricaneInteractiveState | null = null;
  // Whether the Single-Track run is unlocked for editing (setup changeable, storm shown).
  @observable public singleTrackEditing = false;

  // Transient guard so restoring/resetting a card (which replays a finished state) isn't mistaken
  // for a natural run completion by the auto-capture reaction. Not observable.
  public autoCaptureSuppressed = false;

  // Pristine default setup captured once at startup. Used to fully reset Single-track when leaving
  // Multi-track with no saved single run, so edits made in Multi-track (Category, season, SST, …)
  // don't leak across — simulation.reset() alone doesn't restore hurricane.startingCategory. Not observable.
  public defaultState: IHurricaneInteractiveState | null = null;

  // The live Multi-track setup (the in-progress editable card / currently selected run) stashed when
  // leaving Multi-track, so returning restores that work instead of resetting to default. Not observable.
  public multiWorkingState: IHurricaneInteractiveState | null = null;

  // The live Single-track setup (in-progress pre-run config OR a completed run) stashed when leaving
  // Single-track, plus its editing flag, so returning restores it. Symmetric with multiWorkingState.
  public singleWorkingState: IHurricaneInteractiveState | null = null;
  public singleWorkingEditing = false;

  // Which run was selected/being-edited in Multi-track, stashed on leave so returning re-selects the
  // same card. Without this, setEnabled(false) clears the selection and a finished run has no slot to
  // auto-capture into (it stays "Not run yet"). Not observable.
  public multiWorkingSelectedId: string | undefined = undefined;
  public multiWorkingEditingId: string | undefined = undefined;

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

  // The setup is locked (view-only, storm hidden) when viewing a completed run.
  @computed public get setupLocked(): boolean {
    if (this.enabled) {
      // Multi-track: a completed run is selected and not being edited.
      const sel = this.selectedRun;
      return !!sel && sel.state !== null && this.editingRunId !== sel.id;
    }
    // Single-run: a completed run is showing and it's not being edited.
    return this.singleRun !== null && !this.singleTrackEditing;
  }

  public runNumber(id: string): number {
    return this.runs.findIndex(r => r.id === id) + 1;
  }

  @action.bound public setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) {
      this.selectedRunId = undefined;
      this.editingRunId = undefined;
    }
  }

  // Adds a fresh editable card and selects it.
  @action.bound public addRun(): IRunSlot {
    const run: IRunSlot = { id: `run-${this.nextId++}`, state: null };
    this.runs.push(run);
    this.selectedRunId = run.id;
    this.editingRunId = undefined;
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

  // Stash the current selection before leaving Multi-track (setEnabled(false) will clear it).
  @action.bound public stashMultiSelection() {
    this.multiWorkingSelectedId = this.selectedRunId;
    this.multiWorkingEditingId = this.editingRunId;
  }

  // Re-select the stashed run when returning to Multi-track, if it still exists.
  @action.bound public restoreMultiSelection() {
    if (this.multiWorkingSelectedId && this.runs.some(r => r.id === this.multiWorkingSelectedId)) {
      this.selectedRunId = this.multiWorkingSelectedId;
      this.editingRunId = this.multiWorkingEditingId;
    }
  }

  @action.bound public setSingleRun(state: IHurricaneInteractiveState | null) {
    this.singleRun = state;
  }

  public setDefaultState(state: IHurricaneInteractiveState) {
    this.defaultState = state;
  }

  public setMultiWorkingState(state: IHurricaneInteractiveState | null) {
    this.multiWorkingState = state;
  }

  public setSingleWorkingState(state: IHurricaneInteractiveState | null, editing: boolean) {
    this.singleWorkingState = state;
    this.singleWorkingEditing = editing;
  }

  @action.bound public setSingleTrackEditing(editing: boolean) {
    this.singleTrackEditing = editing;
  }

  @action.bound public deleteSingleRun() {
    this.singleRun = null;
    this.singleTrackEditing = false;
  }

  // Saves an external (Single-Track) run into the first empty slot, or a new slot if there's room.
  // Returns the run's 1-based number, or null if all slots are full.
  @action.bound public saveExternalRun(state: IHurricaneInteractiveState): number | null {
    let idx = this.runs.findIndex(r => r.state === null);
    if (idx < 0) {
      if (this.isFull) return null;
      this.runs.push({ id: `run-${this.nextId++}`, state: null });
      idx = this.runs.length - 1;
    }
    // Access via the array so we mutate the observable element, not a stale pushed reference.
    this.runs[idx].state = state;
    return idx + 1;
  }

  @action.bound public clear() {
    this.runs = [];
    this.selectedRunId = undefined;
  }
}
