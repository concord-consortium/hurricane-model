import { log } from "../log";
import { IStores } from "../models/stores";
import { IRunState } from "../types/interactive-state";

export type RunSelectionSource = "panel" | "map" | "table";

export function selectRun({ runs, simulation, ui }: IStores, run: IRunState, via: RunSelectionSource) {
  if (runs.isSelected(run.id)) return;
  if (simulation.inProgress && !ui.isReadOnly) simulation.restart();
  runs.selectRun(run.id);
  ui.setNorthAtlanticView();
  log("RunSelected", { runId: run.id, via });
}
