import { action, computed, makeObservable, observable } from "mobx";
import { IRunState, ISimulationState } from "../types/interactive-state";
import {
  applySimulationState, defaultSimulationState, extractSetupState, serializeSimulation
} from "./simulation-serialization";
import { SimulationModel } from "./simulation";

export const maxRuns = 6;

export class RunsModel {
  @observable public runs: IRunState[] = [];
  @observable public selectedRunId = "";
  private simulation: SimulationModel;
  private nextRunNumber = 1;

  constructor(simulation: SimulationModel) {
    makeObservable(this);
    this.simulation = simulation;
    const first: IRunState = { id: this.makeRunId(), simulation: serializeSimulation(simulation) };
    this.runs.push(first);
    this.selectedRunId = first.id;
  }

  @computed public get selectedRun(): IRunState | undefined {
    return this.runs.find(run => run.id === this.selectedRunId);
  }

  // The selected run's record can be stale — the live simulation is its source of truth.
  public isRunComplete(run: IRunState): boolean {
    return run.id === this.selectedRunId
      ? this.simulation.simulationFinished
      : !!run.simulation.simulationFinished;
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

  @action.bound public selectRun(id: string) {
    if (id === this.selectedRunId) return;
    const target = this.runs.find(run => run.id === id);
    if (!target) return;
    this.snapshotSelectedRun();
    this.selectedRunId = id;
    applySimulationState(this.simulation, target.simulation);
  }

  @action.bound public addRun() {
    if (!this.canAddRun) return;
    this.addAndSelect(defaultSimulationState());
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
  private snapshotSelectedRun() {
    const run = this.selectedRun;
    if (!run) return;
    const state = serializeSimulation(this.simulation);
    run.simulation = state.simulationStarted && !state.simulationFinished
      ? extractSetupState(state)
      : state;
  }

  private makeRunId() {
    return `run-${this.nextRunNumber++}`;
  }
}
