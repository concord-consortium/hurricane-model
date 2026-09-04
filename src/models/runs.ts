import { action, comparer, computed, makeObservable, observable, toJS } from "mobx";
import { IRunResult, IRunSetup, IRunState, ISimulationState } from "../types/interactive-state";
import { safeStartLocation } from "../utils/interactive-state";
import {
  applySimulationState, cloneSimulationState, defaultSimulationState, extractSetupState,
  normalizeSimulationState, serializeHurricane, serializeSimulation
} from "./simulation-serialization";
import { SimulationModel } from "./simulation";
import { UIModel } from "./ui";

export const maxRuns = 6;
// maxRuns keeps run letters inside A–F.
const firstRunLetterCharCode = "A".charCodeAt(0);

export class RunsModel {
  @observable public runs: IRunState[] = [];
  @observable public selectedRunId = "";
  private simulation: SimulationModel;
  private ui: UIModel;
  private nextRunNumber = 1;
  private initialSimulationState: ISimulationState;

  constructor(simulation: SimulationModel, ui: UIModel) {
    makeObservable(this);
    this.simulation = simulation;
    this.ui = ui;
    this.initialSimulationState = serializeSimulation(simulation);
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
  public getSimulation(run: IRunState): ISimulationState | SimulationModel {
    return this.isSelected(run.id) ? this.simulation : run.simulation;
  }

  public getSimulationSetup(run: IRunState): IRunSetup {
    const selected = this.isSelected(run.id);
    const { season, startLocation, hurricane } = this.getSimulation(run);
    const pressureSystemsSetup = selected
      ? this.simulation.serializedPressureSystemsSetup
      : run.simulation.pressureSystemsSetup;
    const temperatureAnomalies = selected
      ? this.simulation.serializedTemperatureAnomalies
      : run.simulation.temperatureAnomalies;
    return {
      season,
      startLocation: safeStartLocation(startLocation),
      startingCategory: hurricane.startingCategory,
      pressureSystemsSetup,
      temperatureAnomalies
    };
  }

  public getSimulationResult(run: IRunState): IRunResult | null {
    if (!this.isRunComplete(run)) return null;

    const selected = this.isSelected(run.id);
    const { hurricane, hurricaneTrack, landfalls, time } = this.getSimulation(run);
    const pressureSystems = selected
      ? this.simulation.pressureSystems.map(system => system.serialize())
      : run.simulation.pressureSystems;
    return {
      pressureSystems,
      time,
      hurricane: serializeHurricane(hurricane),
      hurricaneTrack: toJS(hurricaneTrack),
      landfalls: toJS(landfalls)
    };
  }

  public isRunComplete(run: IRunState): boolean {
    return this.getSimulation(run).simulationFinished;
  }

  public runLetter(run: IRunState): string {
    return String.fromCharCode(firstRunLetterCharCode + this.runs.indexOf(run));
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

  // True while there is nothing to clear: a single, unstarted run still holding the default setup.
  @computed public get isPristine(): boolean {
    const { simulation } = this;
    if (this.runs.length > 1) return false;
    if (simulation.simulationStarted || simulation.simulationFinished) return false;
    return comparer.structural(serializeSimulation(simulation), this.initialSimulationState);
  }

  // Returns the length of the longest complete track.
  @computed public get maxDuration(): number {
    return Math.max(...this.runs.filter(run => this.isRunComplete(run)).map(run => this.getSimulation(run).time));
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
