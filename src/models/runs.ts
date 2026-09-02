import { action, computed, makeObservable, observable } from "mobx";
import { IRunState, ISimulationState } from "../types/interactive-state";
import {
  applySimulationState, cloneSimulationState, defaultSimulationState, extractSetupState,
  normalizeSimulationState, serializeSimulation
} from "./simulation-serialization";
import { SimulationModel } from "./simulation";
import { UIModel } from "./ui";

export const maxRuns = 6;

export class RunsModel {
  @observable public runs: IRunState[] = [];
  @observable public selectedRunId = "";
  private simulation: SimulationModel;
  private ui: UIModel;
  private nextRunNumber = 1;

  constructor(simulation: SimulationModel, ui: UIModel) {
    makeObservable(this);
    this.simulation = simulation;
    this.ui = ui;
    const first: IRunState = { id: this.makeRunId(), simulation: serializeSimulation(simulation) };
    this.runs.push(first);
    this.selectedRunId = first.id;
  }

  public isSelected(runId: string) {
    return runId === this.selectedRunId;
  }

  @computed public get selectedRun(): IRunState | undefined {
    return this.runs.find(run => this.isSelected(run.id));
  }

  @computed public get serializedSimulation(): ISimulationState {
    return serializeSimulation(this.simulation);
  }

  // The selected run's simulation can be stale — the live simulation is its source of truth.
  public getSimulation(run: IRunState): ISimulationState {
    return this.isSelected(run.id) ? this.serializedSimulation : run.simulation;
  }

  public isRunComplete(run: IRunState): boolean {
    return this.getSimulation(run).simulationFinished;
  }

  @computed public get allComplete(): boolean {
    return this.runs.every(run => this.isRunComplete(run));
  }

  @computed public get atMaxRuns(): boolean {
    return this.runs.length >= maxRuns;
  }

  @computed public get canAddRun(): boolean {
    return this.allComplete && !this.atMaxRuns;
  }

  // Returns the length of the longest track.
  @computed public get maxDuration(): number {
    return Math.max(...this.runs.map(run => this.getSimulation(run).time));
  }

  @action.bound public selectRun(id: string) {
    if (id === this.selectedRunId) return;
    const target = this.runs.find(run => run.id === id);
    if (!target) return;
    if (!this.ui.isReadOnly) this.snapshotSelectedRun();
    this.selectedRunId = id;
    // Clone so the live sim's arrays don't share element references with the stored record.
    applySimulationState(this.simulation, cloneSimulationState(target.simulation));
  }

  @action.bound public addRun() {
    if (!this.canAddRun) return;
    this.addAndSelect(defaultSimulationState());
  }

  @action.bound public duplicateSelectedRun() {
    if (!this.canAddRun) return;
    // Snapshot first so a stale selected-run record can't be duplicated.
    this.snapshotSelectedRun();
    const selected = this.selectedRun;
    if (!selected) return;
    this.addAndSelect(extractSetupState(selected.simulation));
  }

  @action.bound public resetSelectedRun() {
    this.simulation.restart();
  }

  // Discards every saved run and starts over from whatever state the simulation is in.
  @action.bound public reset() {
    const first: IRunState = { id: this.makeRunId(), simulation: this.serializedSimulation };
    this.runs = [first];
    this.selectedRunId = first.id;
  }

  @action.bound public deleteRun(id: string) {
    const index = this.runs.findIndex(run => run.id === id);
    if (index === -1) return;
    if (this.runs.length === 1) {
      // There is never zero runs — deleting the sole run resets it to the default setup.
      const replacement: IRunState = { id: this.makeRunId(), simulation: defaultSimulationState() };
      this.runs[0] = replacement;
      this.selectedRunId = replacement.id;
      applySimulationState(this.simulation, replacement.simulation);
      return;
    }
    const wasSelected = id === this.selectedRunId;
    this.runs.splice(index, 1);
    if (wasSelected) {
      const target = index > 0 ? this.runs[index - 1] : this.runs[this.runs.length - 1];
      this.selectedRunId = target.id;
      applySimulationState(this.simulation, cloneSimulationState(target.simulation));
    }
  }

  @action.bound public setRuns(runs: IRunState[], selectedRunId?: string) {
    if (!runs.length) return;
    // Migrated legacy/corrupt records can be missing or partial; normalizing fills them from defaults.
    this.runs = runs.map(run => ({ id: run.id, simulation: normalizeSimulationState(run.simulation) }));
    const selected = this.runs.find(run => run.id === selectedRunId) ?? this.runs[this.runs.length - 1];
    this.selectedRunId = selected.id;
    this.nextRunNumber = this.runs.reduce((max, run) => {
      const num = parseInt(run.id.replace(/^run-/, ""), 10);
      // The MAX_SAFE_INTEGER cap keeps a corrupted id from saturating the counter into duplicates.
      return isFinite(num) && num <= Number.MAX_SAFE_INTEGER && num >= max ? num + 1 : max;
    }, this.nextRunNumber);
    applySimulationState(this.simulation, cloneSimulationState(selected.simulation));
  }

  private addAndSelect(state: ISimulationState) {
    this.snapshotSelectedRun();
    const run: IRunState = { id: this.makeRunId(), simulation: state };
    this.runs.push(run);
    this.selectedRunId = run.id;
    applySimulationState(this.simulation, run.simulation);
  }

  // An unselected run is always setup-only or complete, so a started-but-unfinished
  // run loses its partial outcome when snapshotted on switch-away.
  @action private snapshotSelectedRun() {
    const run = this.selectedRun;
    if (!run) return;
    const state = this.serializedSimulation;
    run.simulation = state.simulationStarted && !state.simulationFinished
      ? extractSetupState(state)
      : state;
  }

  private makeRunId() {
    return `run-${this.nextRunNumber++}`;
  }
}
